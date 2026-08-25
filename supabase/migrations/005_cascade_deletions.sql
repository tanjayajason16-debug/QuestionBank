-- ============================================================
-- Migration: Cascade deletions for questions, students, attempts
-- ============================================================

-- 1. Attempts: cascade on student deletion and access_code deletion
ALTER TABLE attempts 
DROP CONSTRAINT IF EXISTS attempts_student_id_fkey;

ALTER TABLE attempts 
ADD CONSTRAINT attempts_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES students(id) 
ON DELETE CASCADE;

ALTER TABLE attempts 
DROP CONSTRAINT IF EXISTS attempts_access_code_id_fkey;

ALTER TABLE attempts 
ADD CONSTRAINT attempts_access_code_id_fkey 
FOREIGN KEY (access_code_id) 
REFERENCES access_codes(id) 
ON DELETE CASCADE;

-- 2. Exam questions: cascade on question deletion
ALTER TABLE exam_questions 
DROP CONSTRAINT IF EXISTS exam_questions_question_id_fkey;

ALTER TABLE exam_questions 
ADD CONSTRAINT exam_questions_question_id_fkey 
FOREIGN KEY (question_id) 
REFERENCES questions(id) 
ON DELETE CASCADE;

-- 3. Answers: cascade on question deletion
ALTER TABLE answers 
DROP CONSTRAINT IF EXISTS answers_question_id_fkey;

ALTER TABLE answers 
ADD CONSTRAINT answers_question_id_fkey 
FOREIGN KEY (question_id) 
REFERENCES questions(id) 
ON DELETE CASCADE;
