import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/tryout/attempt/[id]
// Returns attempt state + questions (WITHOUT correct_answer) for the exam interface
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = createAdminClient()
  const attemptId = params.id

  // Load attempt
  const { data: attempt, error: attemptErr } = await db
    .from('attempts')
    .select('*, exams(*), students(full_name)')
    .eq('id', attemptId)
    .single()

  if (attemptErr || !attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  }

  // Auto-expire if time ran out
  const now = new Date()
  if (attempt.status === 'in_progress' && new Date(attempt.expires_at) <= now) {
    await db.from('attempts').update({ status: 'expired' }).eq('id', attemptId)
    return NextResponse.json({ error: 'ATTEMPT_EXPIRED' }, { status: 410 })
  }

  if (attempt.status === 'submitted') {
    return NextResponse.json({ error: 'ALREADY_SUBMITTED', attempt_id: attemptId }, { status: 409 })
  }

  if (attempt.status === 'expired') {
    return NextResponse.json({ error: 'ATTEMPT_EXPIRED', attempt_id: attemptId }, { status: 410 })
  }

  const exam = attempt.exams as any

  // Load questions in attempt order — NEVER include correct_answer
  const { data: answers } = await db
    .from('answers')
    .select('id, question_id, selected_answer, is_flagged, answered_at')
    .eq('attempt_id', attemptId)

  const answerMap = new Map(answers?.map((a) => [a.question_id, a]) ?? [])

  // Fetch question data without correct_answer
  const questionIds: string[] = attempt.question_order ?? []
  const { data: questions } = await db
    .from('questions')
    .select('id, question, image_url, option_a, option_b, option_c, option_d, difficulty, grade')
    .in('id', questionIds)

  if (!questions) {
    return NextResponse.json({ error: 'Questions not found' }, { status: 500 })
  }

  const qMap = new Map(questions.map((q) => [q.id, q]))

  // Build ordered list, optionally shuffling options per question
  const orderedQuestions = questionIds.map((qid, index) => {
    const q = qMap.get(qid)
    if (!q) return null
    const ans = answerMap.get(qid)

    let options = [
      { key: 'A' as const, text: q.option_a },
      { key: 'B' as const, text: q.option_b },
      { key: 'C' as const, text: q.option_c },
      { key: 'D' as const, text: q.option_d },
    ]

    // Note: if randomize_answers is true the mapping is stored in options_order
    // For now, we send options as-is; randomization was applied at attempt creation
    // (correct_answer always maps to the DB's A/B/C/D, randomization would need
    // a remapping layer — kept deterministic here for correctness)

    return {
      index,
      id: q.id,
      question: q.question,
      image_url: q.image_url,
      options,
      selected_answer: ans?.selected_answer ?? null,
      is_flagged: ans?.is_flagged ?? false,
    }
  }).filter(Boolean)

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      exam_title: exam.title,
      exam_id: exam.id,
      started_at: attempt.started_at,
      expires_at: attempt.expires_at,
      total_questions: attempt.total_questions,
      student_name: (attempt.students as any)?.full_name,
    },
    questions: orderedQuestions,
  })
}
