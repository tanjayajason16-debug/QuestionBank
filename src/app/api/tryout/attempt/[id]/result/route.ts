import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/tryout/attempt/[id]/result
// Returns graded result + optionally answer review if show_explanations is true
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = createAdminClient()
  const attemptId = params.id

  const { data: attempt } = await db
    .from('attempts')
    .select(`
      id, score, correct_count, wrong_count, unanswered_count,
      passed, submitted_at, started_at, status, total_questions, question_order,
      exams(title, passing_score, show_explanations, duration_minutes),
      students(full_name, school, class, nis)
    `)
    .eq('id', attemptId)
    .single()

  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  }

  if (attempt.status !== 'submitted') {
    return NextResponse.json({ error: 'Not yet submitted' }, { status: 400 })
  }

  const exam = attempt.exams as any

  // Build time used
  const timeUsedSeconds = attempt.submitted_at
    ? Math.round(
        (new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000
      )
    : 0

  const baseResult = {
    attempt_id: attempt.id,
    exam_title: exam?.title,
    score: attempt.score,
    correct_count: attempt.correct_count,
    wrong_count: attempt.wrong_count,
    unanswered_count: attempt.unanswered_count,
    total_questions: attempt.total_questions,
    passing_score: exam?.passing_score,
    passed: attempt.passed,
    submitted_at: attempt.submitted_at,
    time_used_seconds: timeUsedSeconds,
    student: attempt.students,
    show_explanations: exam?.show_explanations ?? false,
  }

  // If explanations are disabled, return result without answers
  if (!exam?.show_explanations) {
    return NextResponse.json({ ...baseResult, answers: null })
  }

  // Load answers with question details including correct_answer + explanation
  const { data: answers } = await db
    .from('answers')
    .select(`
      question_id, selected_answer, is_correct,
      questions(
        id, question, image_url,
        option_a, option_b, option_c, option_d,
        correct_answer, explanation
      )
    `)
    .eq('attempt_id', attemptId)

  // Order answers by question_order
  const orderMap = new Map(
    (attempt.question_order as string[]).map((id, i) => [id, i])
  )

  const orderedAnswers = (answers ?? [])
    .sort((a, b) => (orderMap.get(a.question_id) ?? 0) - (orderMap.get(b.question_id) ?? 0))
    .map((a, index) => {
      const q = a.questions as any
      return {
        index: index + 1,
        question_id: a.question_id,
        question: q?.question,
        image_url: q?.image_url ?? null,
        options: [
          { key: 'A', text: q?.option_a },
          { key: 'B', text: q?.option_b },
          { key: 'C', text: q?.option_c },
          { key: 'D', text: q?.option_d },
        ],
        selected_answer: a.selected_answer,
        correct_answer: q?.correct_answer,
        is_correct: a.is_correct,
        explanation: q?.explanation,
      }
    })

  return NextResponse.json({ ...baseResult, answers: orderedAnswers })
}
