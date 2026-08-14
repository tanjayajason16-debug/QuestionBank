-- ============================================================
-- DATABASE FUNCTIONS
-- ============================================================

-- ============================================================
-- FUNCTION: grade_attempt
-- Calculates and stores the final score for an attempt.
-- Called server-side only via service role.
-- ============================================================
CREATE OR REPLACE FUNCTION grade_attempt(p_attempt_id UUID)
RETURNS JSON AS $$
DECLARE
  v_attempt attempts%ROWTYPE;
  v_exam exams%ROWTYPE;
  v_total INTEGER;
  v_correct INTEGER;
  v_wrong INTEGER;
  v_unanswered INTEGER;
  v_score NUMERIC(5,2);
  v_passed BOOLEAN;
BEGIN
  -- Lock the attempt row to prevent concurrent grading
  SELECT * INTO v_attempt FROM attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
  END IF;

  IF v_attempt.status = 'submitted' THEN
    -- Already graded; return existing result
    RETURN json_build_object(
      'score', v_attempt.score,
      'correct_count', v_attempt.correct_count,
      'wrong_count', v_attempt.wrong_count,
      'unanswered_count', v_attempt.unanswered_count,
      'passed', v_attempt.passed
    );
  END IF;

  SELECT * INTO v_exam FROM exams WHERE id = v_attempt.exam_id;

  v_total := v_attempt.total_questions;

  -- Count correct answers by joining with questions table
  SELECT COUNT(*) INTO v_correct
  FROM answers a
  JOIN questions q ON q.id = a.question_id
  WHERE a.attempt_id = p_attempt_id
    AND a.selected_answer IS NOT NULL
    AND a.selected_answer = q.correct_answer;

  -- Count unanswered
  SELECT COUNT(*) INTO v_unanswered
  FROM answers
  WHERE attempt_id = p_attempt_id
    AND selected_answer IS NULL;

  v_wrong := v_total - v_correct - v_unanswered;
  v_score := ROUND((v_correct::NUMERIC / v_total) * 100, 2);
  v_passed := v_score >= v_exam.passing_score;

  -- Update all answers with is_correct flag
  UPDATE answers a
  SET is_correct = (a.selected_answer = q.correct_answer)
  FROM questions q
  WHERE a.question_id = q.id
    AND a.attempt_id = p_attempt_id;

  -- Update the attempt
  UPDATE attempts SET
    status = 'submitted',
    submitted_at = NOW(),
    score = v_score,
    correct_count = v_correct,
    wrong_count = v_wrong,
    unanswered_count = v_unanswered,
    passed = v_passed
  WHERE id = p_attempt_id;

  RETURN json_build_object(
    'score', v_score,
    'correct_count', v_correct,
    'wrong_count', v_wrong,
    'unanswered_count', v_unanswered,
    'passed', v_passed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: get_exam_analytics
-- Returns per-question correct answer percentages for an exam.
-- ============================================================
CREATE OR REPLACE FUNCTION get_exam_analytics(p_exam_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_attempts', (
      SELECT COUNT(*) FROM attempts
      WHERE exam_id = p_exam_id AND status = 'submitted'
    ),
    'avg_score', (
      SELECT ROUND(AVG(score), 2) FROM attempts
      WHERE exam_id = p_exam_id AND status = 'submitted'
    ),
    'highest_score', (
      SELECT MAX(score) FROM attempts
      WHERE exam_id = p_exam_id AND status = 'submitted'
    ),
    'lowest_score', (
      SELECT MIN(score) FROM attempts
      WHERE exam_id = p_exam_id AND status = 'submitted'
    ),
    'pass_rate', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE passed = TRUE))::NUMERIC / NULLIF(COUNT(*), 0) * 100,
        2
      ) FROM attempts
      WHERE exam_id = p_exam_id AND status = 'submitted'
    ),
    'avg_duration_minutes', (
      SELECT ROUND(
        AVG(EXTRACT(EPOCH FROM (submitted_at - started_at)) / 60),
        2
      ) FROM attempts
      WHERE exam_id = p_exam_id
        AND status = 'submitted'
        AND submitted_at IS NOT NULL
    ),
    'question_stats', (
      SELECT json_agg(qs ORDER BY qs.order_index)
      FROM (
        SELECT
          eq.order_index,
          q.id AS question_id,
          LEFT(q.question, 80) AS question_preview,
          COUNT(a.id) AS total_answers,
          COUNT(a.id) FILTER (WHERE a.is_correct = TRUE) AS correct_answers,
          ROUND(
            COUNT(a.id) FILTER (WHERE a.is_correct = TRUE)::NUMERIC
            / NULLIF(COUNT(a.id) FILTER (WHERE a.selected_answer IS NOT NULL), 0) * 100,
            2
          ) AS correct_percentage
        FROM exam_questions eq
        JOIN questions q ON q.id = eq.question_id
        LEFT JOIN answers a ON a.question_id = q.id
          AND a.attempt_id IN (
            SELECT id FROM attempts
            WHERE exam_id = p_exam_id AND status = 'submitted'
          )
        WHERE eq.exam_id = p_exam_id
        GROUP BY eq.order_index, q.id, q.question
      ) qs
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
