-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: check if current user is admin
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "Admins can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- CATEGORIES
-- ============================================================
-- Admins: full access
CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (is_admin());

-- Public: read-only (needed for student validation flow via service role)
-- We use service role in API routes for student flows, so no public policy needed.

-- ============================================================
-- QUESTIONS
-- ============================================================
-- Admins: full access
CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (is_admin());

-- IMPORTANT: No student-facing SELECT policy on questions here.
-- Questions are only served via service-role API routes to prevent answer leakage.

-- ============================================================
-- EXAMS
-- ============================================================
CREATE POLICY "Admins can manage exams"
  ON exams FOR ALL
  USING (is_admin());

-- ============================================================
-- EXAM QUESTIONS
-- ============================================================
CREATE POLICY "Admins can manage exam_questions"
  ON exam_questions FOR ALL
  USING (is_admin());

-- ============================================================
-- ACCESS CODES
-- ============================================================
CREATE POLICY "Admins can manage access_codes"
  ON access_codes FOR ALL
  USING (is_admin());

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE POLICY "Admins can view all students"
  ON students FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage students"
  ON students FOR ALL
  USING (is_admin());

-- ============================================================
-- ATTEMPTS
-- ============================================================
CREATE POLICY "Admins can view all attempts"
  ON attempts FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage attempts"
  ON attempts FOR ALL
  USING (is_admin());

-- ============================================================
-- ANSWERS
-- ============================================================
CREATE POLICY "Admins can view all answers"
  ON answers FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage answers"
  ON answers FOR ALL
  USING (is_admin());

-- ============================================================
-- NOTE: All student-facing operations (start exam, save answer,
-- submit, view results) MUST go through API routes that use
-- the service role key (createAdminClient). This ensures:
-- 1. Correct answers are never exposed before submission.
-- 2. Students cannot manipulate scores, timers, or attempt status.
-- 3. All grading is done server-side.
-- ============================================================
