import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function err(code: string, message: string, status = 400) {
  return NextResponse.json({ code, message }, { status })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { code, student } = body as {
    code: string
    student: {
      full_name: string
      school: string
      class: string
      nis: string
      email: string | null
    }
  }

  if (!code || !student?.full_name || !student?.school || !student?.class || !student?.nis) {
    return err('VALIDATION_ERROR', 'Missing required fields', 400)
  }

  const db = createAdminClient()
  const now = new Date()

  // 1. Look up the access code
  const { data: accessCode } = await db
    .from('access_codes')
    .select('*, exams(*)')
    .eq('code', code.trim().toUpperCase())
    .single()

  if (!accessCode) return err('INVALID_CODE', 'Access code not found', 404)
  if (!accessCode.is_active) return err('DISABLED_CODE', 'Access code is disabled', 403)
  if (accessCode.expires_at && new Date(accessCode.expires_at) < now) {
    return err('EXPIRED_CODE', 'Access code has expired', 403)
  }
  if (accessCode.usage_count >= accessCode.max_usage) {
    return err('USAGE_LIMIT', 'Access code usage limit reached', 403)
  }

  // 2. Validate the exam
  const exam = accessCode.exams as any
  if (!exam) return err('INVALID_CODE', 'Exam not found', 404)
  if (exam.status === 'inactive') return err('INACTIVE_EXAM', 'Exam is not active', 403)
  if (exam.status === 'draft') return err('INACTIVE_EXAM', 'Exam is not active', 403)
  if (exam.status === 'expired') return err('EXPIRED_EXAM', 'Exam has expired', 403)
  if (exam.start_date && new Date(exam.start_date) > now) {
    return err('NOT_STARTED', 'Exam has not started yet', 403)
  }
  if (exam.end_date && new Date(exam.end_date) < now) {
    return err('EXPIRED_EXAM', 'Exam has ended', 403)
  }

  // 3. Find or create the student record
  let studentId: string

  const { data: existingStudent } = await db
    .from('students')
    .select('id')
    .eq('nis', student.nis.trim())
    .single()

  if (existingStudent) {
    studentId = existingStudent.id
    // Update latest info
    await db
      .from('students')
      .update({
        full_name: student.full_name,
        school: student.school,
        class: student.class,
        email: student.email,
      })
      .eq('id', studentId)
  } else {
    const { data: newStudent, error: studentError } = await db
      .from('students')
      .insert({
        full_name: student.full_name,
        school: student.school,
        class: student.class,
        nis: student.nis,
        email: student.email,
      })
      .select('id')
      .single()

    if (studentError || !newStudent) {
      return err('SERVER_ERROR', 'Failed to create student record', 500)
    }
    studentId = newStudent.id
  }

  // 4. Check for existing in-progress attempt (allow resume)
  const { data: existingAttempt } = await db
    .from('attempts')
    .select('id, status, expires_at')
    .eq('student_id', studentId)
    .eq('exam_id', exam.id)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existingAttempt) {
    // If not expired, resume it
    if (new Date(existingAttempt.expires_at) > now) {
      return NextResponse.json({ attempt_id: existingAttempt.id, resumed: true })
    }
    // Else mark it expired
    await db.from('attempts').update({ status: 'expired' }).eq('id', existingAttempt.id)
  }

  // 5. Check if already submitted (no retake unless allowed)
  if (!exam.allow_retake) {
    const { data: submitted } = await db
      .from('attempts')
      .select('id')
      .eq('student_id', studentId)
      .eq('exam_id', exam.id)
      .eq('status', 'submitted')
      .limit(1)
      .single()

    if (submitted) {
      return err('ALREADY_SUBMITTED', 'Already submitted this exam', 403)
    }
  }

  // 6. Fetch exam questions in order
  const { data: examQuestions } = await db
    .from('exam_questions')
    .select('question_id, order_index')
    .eq('exam_id', exam.id)
    .order('order_index')

  if (!examQuestions || examQuestions.length === 0) {
    return err('NO_QUESTIONS', 'This exam has no questions', 500)
  }

  // 7. Build question order (randomise if configured)
  let questionOrder = examQuestions.map((eq: any) => eq.question_id as string)
  if (exam.randomize_questions) {
    questionOrder = [...questionOrder].sort(() => Math.random() - 0.5)
  }

  // 8. Create the attempt
  const expiresAt = new Date(now.getTime() + exam.duration_minutes * 60 * 1000)

  const { data: attempt, error: attemptError } = await db
    .from('attempts')
    .insert({
      student_id: studentId,
      exam_id: exam.id,
      access_code_id: accessCode.id,
      status: 'in_progress',
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      total_questions: questionOrder.length,
      question_order: questionOrder,
    })
    .select('id')
    .single()

  if (attemptError || !attempt) {
    return err('SERVER_ERROR', 'Failed to create attempt', 500)
  }

  // 9. Pre-create answer rows (unanswered by default)
  const answerRows = questionOrder.map((qid) => ({
    attempt_id: attempt.id,
    question_id: qid,
    selected_answer: null,
    is_flagged: false,
  }))

  await db.from('answers').insert(answerRows)

  // 10. Increment access code usage
  await db
    .from('access_codes')
    .update({ usage_count: accessCode.usage_count + 1 })
    .eq('id', accessCode.id)

  return NextResponse.json({ attempt_id: attempt.id, resumed: false })
}
