-- Migration: Remove ai_prompt index that causes errors with large prompts
-- Date: 2026-02-09
-- Issue: index row size exceeds btree version 4 maximum 2704 bytes
-- Error: "index row size 2928 exceeds btree version 4 maximum 2704 for index 'idx_questions_ai_prompt'"

-- Drop the problematic index
DROP INDEX IF EXISTS public.idx_questions_ai_prompt;

-- Update comment explaining why no index
COMMENT ON COLUMN public.questions.ai_prompt IS 'The full AI prompt used to generate this question. When multiple questions are generated in one batch, all questions share the same prompt value. Not indexed due to large text size (prompts often exceed btree limit of 2704 bytes).';

-- Verification: Check that index is removed
-- Run this after executing the DROP statement:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'questions' AND indexname LIKE '%ai_prompt%';
-- Should return 0 rows
