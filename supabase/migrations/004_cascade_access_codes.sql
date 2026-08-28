-- ============================================================
-- Migration: Allow deleting access codes by cascading to attempts
-- ============================================================

ALTER TABLE attempts 
DROP CONSTRAINT IF EXISTS attempts_access_code_id_fkey;

ALTER TABLE attempts 
ADD CONSTRAINT attempts_access_code_id_fkey 
FOREIGN KEY (access_code_id) 
REFERENCES access_codes(id) 
ON DELETE CASCADE;
