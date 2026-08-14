import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/tryout/attempt/[id]/submit
// Server-side grading. Idempotent — returns existing result if already submitted.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = createAdminClient()
  const attemptId = params.id

  // Load attempt
  const { data: attempt } = await db
    .from('attempts')
    .select('*, exams(passing_score, show_explanations)')
    .eq('id', attemptId)
    .single()

  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  }

  // Idempotent: already graded
  if (attempt.status === 'submitted') {
    return NextResponse.json({
      attempt_id: attemptId,
      score: attempt.score,
      correct_count: attempt.correct_count,
      wrong_count: attempt.wrong_count,
      unanswered_count: attempt.unanswered_count,
      passed: attempt.passed,
      total_questions: attempt.total_questions,
      passing_score: (attempt.exams as any)?.passing_score,
    })
  }

  // Check if expired — we still grade it
  if (attempt.status === 'expired') {
    // Fall through to grading below
  } else if (attempt.status !== 'in_progress') {
    return NextResponse.json({ error: 'Invalid attempt status' }, { status: 400 })
  }

  // Use the DB function for atomic grading
  const { data: result, error: gradeError } = await db.rpc('grade_attempt', {
    p_attempt_id: attemptId,
  })

  if (gradeError) {
    return NextResponse.json({ error: gradeError.message }, { status: 500 })
  }

  const gradeResult = result as {
    score: number
    correct_count: number
    wrong_count: number
    unanswered_count: number
    passed: boolean
  }

  return NextResponse.json({
    attempt_id: attemptId,
    score: gradeResult.score,
    correct_count: gradeResult.correct_count,
    wrong_count: gradeResult.wrong_count,
    unanswered_count: gradeResult.unanswered_count,
    passed: gradeResult.passed,
    total_questions: attempt.total_questions,
    passing_score: (attempt.exams as any)?.passing_score,
  })
}
