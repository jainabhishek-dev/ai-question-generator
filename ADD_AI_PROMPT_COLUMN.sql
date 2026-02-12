-- Migration: Add ai_prompt column to questions table
-- Date: 2026-02-09
-- Purpose: Store the AI prompt used to generate each question for traceability

-- Add the ai_prompt column (TEXT allows unlimited length, NULL for existing records)
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS ai_prompt TEXT NULL;

-- Note: ai_prompt is NOT indexed due to its large size (prompts often exceed btree limit of 2704 bytes)
-- This column is for record-keeping and traceability, not for filtering/searching
-- If you need to search by prompt content, consider using a GIN index with full-text search
-- or an MD5 hash index instead of a direct btree index

-- Add comment for documentation
COMMENT ON COLUMN public.questions.ai_prompt IS 'The complete AI prompt used to generate this question. When multiple questions are generated in one batch, all questions share the same prompt value. Not indexed due to large text size.';
