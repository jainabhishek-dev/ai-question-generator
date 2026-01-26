-- Add answers column to game_plays table
-- This column stores individual question answers with user responses, correct answers, and explanations
-- for quiz review functionality

ALTER TABLE public.game_plays 
ADD COLUMN IF NOT EXISTS answers JSONB NULL;

-- Add GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_game_plays_answers 
ON public.game_plays USING gin (answers);

-- Add comment to document the column
COMMENT ON COLUMN public.game_plays.answers IS 
'JSONB array storing individual question answers with user response, correct answer, and explanation for review. Structure: [{"questionIndex": 0, "questionId": 123, "question": "...", "userAnswer": "...", "correctAnswer": "...", "isCorrect": true/false, "explanation": "...", "timeTaken": 8.5, "pointsEarned": 100}]';
