import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/tryout/attempt/[id]/answer
// Autosave a single answer. Server validates attempt is still active.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = createAdminClient()
  const attemptId = params.id

  const body = await req.json()
  const { question_id, selected_answer, is_flagged } = body as {
    question_id: string
    selected_answer: 'A' | 'B' | 'C' | 'D' | null
    is_flagged?: boolean
  }

  if (!question_id) {
    return NextResponse.json({ error: 'question_id required' }, { status: 400 })
  }

  // Validate attempt is still in progress and not expired
  const { data: attempt } = await db
    .from('attempts')
    .select('status, expires_at')
    .eq('id', attemptId)
    .single()

  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  }

  if (attempt.status === 'submitted') {
    return NextResponse.json({ error: 'ALREADY_SUBMITTED' }, { status: 409 })
  }

  if (attempt.status === 'expired' || new Date(attempt.expires_at) <= new Date()) {
    // Auto-expire
    await db.from('attempts').update({ status: 'expired' }).eq('id', attemptId)
    return NextResponse.json({ error: 'ATTEMPT_EXPIRED' }, { status: 410 })
  }

  // Validate selected_answer value
  if (selected_answer !== null && !['A', 'B', 'C', 'D'].includes(selected_answer)) {
    return NextResponse.json({ error: 'Invalid selected_answer' }, { status: 400 })
  }

  const updatePayload: Record<string, unknown> = {
    answered_at: selected_answer ? new Date().toISOString() : null,
  }
  if (selected_answer !== undefined) updatePayload.selected_answer = selected_answer
  if (is_flagged !== undefined) updatePayload.is_flagged = is_flagged

  const { error } = await db
    .from('answers')
    .update(updatePayload)
    .eq('attempt_id', attemptId)
    .eq('question_id', question_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
