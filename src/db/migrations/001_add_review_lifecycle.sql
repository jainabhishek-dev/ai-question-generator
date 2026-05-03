-- ============================================================
-- MIGRATION 001: Review Lifecycle
-- Instaku AI Question Generator
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor
--
-- WHAT THIS ADDS:
--   1. Review lifecycle columns to the existing `questions` table
--   2. `question_reviews` table — one row per review attempt per question
--   3. `generation_jobs` table — one row per form submission
--   4. `generation_job_events` table — real-time events written by n8n,
--      polled by the Vercel status endpoint every 2 seconds
--
-- SAFE TO RE-RUN: All statements use IF NOT EXISTS / DO $$ guards
-- ============================================================


-- ============================================================
-- PART 1: Add review lifecycle columns to `questions`
-- ============================================================

DO $$
BEGIN

  -- review_status: tracks where the question is in the review pipeline
  -- pending   = just generated, review not started yet
  -- passed    = all 10 parameters passed, ready to show to user
  -- failed    = at least one parameter failed (in a rewrite cycle)
  -- discarded = failed all 3 rewrite attempts, will never be shown
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'questions'
      AND column_name  = 'review_status'
  ) THEN
    ALTER TABLE public.questions
      ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (review_status IN ('pending', 'passed', 'failed', 'discarded'));
  END IF;

  -- is_user_visible: the single gate for showing a question in the UI
  -- TRUE  = all 10 parameters passed AND user was logged in at generation time
  -- FALSE = review pending / failed / discarded, OR user was a guest
  --
  -- The existing user_id column still controls ownership.
  -- My Questions page should filter: user_id = auth.uid() AND is_user_visible = TRUE
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'questions'
      AND column_name  = 'is_user_visible'
  ) THEN
    ALTER TABLE public.questions
      ADD COLUMN is_user_visible BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  -- review_attempts: how many rewrite cycles this question has gone through
  -- 0 = passed on first try (or review not started)
  -- 1 = failed once, rewrote once
  -- 2 = failed twice, rewrote twice
  -- 3 = max reached → status becomes 'discarded'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'questions'
      AND column_name  = 'review_attempts'
  ) THEN
    ALTER TABLE public.questions
      ADD COLUMN review_attempts INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- parse_attempts: how many times the AI response failed to parse
  -- (pre-check failures before review even starts)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'questions'
      AND column_name  = 'parse_attempts'
  ) THEN
    ALTER TABLE public.questions
      ADD COLUMN parse_attempts INTEGER NOT NULL DEFAULT 0;
  END IF;

END $$;

-- Indexes for the new columns (used by My Questions page and analytics)
CREATE INDEX IF NOT EXISTS idx_questions_review_status
  ON public.questions (review_status);

CREATE INDEX IF NOT EXISTS idx_questions_is_user_visible
  ON public.questions (is_user_visible);

-- Composite index for the My Questions page query pattern:
-- WHERE user_id = $1 AND is_user_visible = TRUE AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_questions_user_visible
  ON public.questions (user_id, is_user_visible)
  WHERE deleted_at IS NULL;


-- ============================================================
-- PART 2: `question_reviews` table
-- Stores one row per review attempt per question.
-- Used for:
--   - Fine-tuning dataset (future)
--   - Analytics (which parameters fail most often)
--   - Debugging individual question failures
-- ============================================================

CREATE TABLE IF NOT EXISTS public.question_reviews (
  id          BIGSERIAL PRIMARY KEY,

  -- FK to questions.id (BIGINT, matches questions table PK type)
  question_id BIGINT NOT NULL
    REFERENCES public.questions (id) ON DELETE CASCADE,

  -- Which rewrite cycle this review belongs to (1, 2, or 3)
  attempt     INTEGER NOT NULL DEFAULT 1
    CHECK (attempt BETWEEN 1 AND 3),

  -- ── Binary pass/fail per parameter ──────────────────────────
  -- NULL means "not applicable for this question type"
  -- (P7 and P8 are NULL for non-MCQ questions)

  p1_construct_validity    BOOLEAN,   -- tests what it claims
  p2_single_concept        BOOLEAN,   -- one concept at a time
  p3_blooms_alignment      BOOLEAN,   -- cognitive level matches
  p4_command_word          BOOLEAN,   -- action verb matches Bloom's
  p5_age_grade_appropriate BOOLEAN,   -- language + content for age
  p6_question_clarity      BOOLEAN,   -- unambiguous stem
  p7_option_parallelism    BOOLEAN,   -- MCQ only: options same length category
  p8_distractor_quality    BOOLEAN,   -- MCQ only: misconception-based distractors
  p9_factual_accuracy      BOOLEAN,   -- all facts/formulas correct
  p10_explanation_quality  BOOLEAN,   -- explanation teaches, not just confirms

  -- ── Feedback per parameter (populated only when pass = FALSE) ──
  p1_feedback    TEXT,
  p2_feedback    TEXT,
  p3_feedback    TEXT,
  p4_feedback    TEXT,
  p5_feedback    TEXT,
  p6_feedback    TEXT,
  p7_feedback    TEXT,
  p8_feedback    TEXT,
  p9_feedback    TEXT,
  p10_feedback   TEXT,

  -- ── Aggregate ────────────────────────────────────────────────
  parameters_passed  INTEGER NOT NULL DEFAULT 0
    CHECK (parameters_passed BETWEEN 0 AND 10),

  overall_passed     BOOLEAN NOT NULL DEFAULT FALSE,

  -- The consolidated rewrite instruction sent back to the generator.
  -- NULL when overall_passed = TRUE (no rewrite needed).
  rewrite_prompt     TEXT,

  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A question cannot have two reviews for the same attempt number
  CONSTRAINT uq_question_review_attempt UNIQUE (question_id, attempt)
);

CREATE INDEX IF NOT EXISTS idx_question_reviews_question_id
  ON public.question_reviews (question_id);

CREATE INDEX IF NOT EXISTS idx_question_reviews_overall_passed
  ON public.question_reviews (overall_passed);

-- Analytics index: find questions that failed a specific parameter most often
CREATE INDEX IF NOT EXISTS idx_question_reviews_p3_blooms
  ON public.question_reviews (p3_blooms_alignment)
  WHERE p3_blooms_alignment = FALSE;


-- ============================================================
-- PART 3: `generation_jobs` table
-- One row per form submission (one click of "Generate Questions").
-- Created by Vercel before sending the webhook to n8n.
-- Updated by n8n as it processes each question.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL for guest users — generation works without login
  user_id UUID NULL
    REFERENCES auth.users (id) ON DELETE SET NULL,

  -- The full form inputs as submitted, stored for debugging and replay
  inputs JSONB NOT NULL,

  -- 'general' or 'ncert' — determines which prompt builder to use
  mode TEXT NOT NULL DEFAULT 'general'
    CHECK (mode IN ('general', 'ncert')),

  -- Job lifecycle status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),

  -- Totals populated by n8n as it completes
  total_questions      INTEGER NOT NULL DEFAULT 0,
  questions_passed     INTEGER NOT NULL DEFAULT 0,
  questions_discarded  INTEGER NOT NULL DEFAULT 0,

  -- Error message if status = 'failed'
  error_message TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ          -- set by n8n when all questions are done
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id
  ON public.generation_jobs (user_id);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_status
  ON public.generation_jobs (status);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at
  ON public.generation_jobs (created_at DESC);


-- ============================================================
-- PART 4: `generation_job_events` table
-- Individual progress events written by n8n during job processing.
-- Polled by the Vercel GET /api/generate/[jobId]/status endpoint
-- every 2 seconds to give the browser live UI updates.
--
-- Event types:
--   generating  — n8n is calling Gemini to generate a question
--   parse_error — response failed to parse, retrying
--   reviewing   — generation passed pre-checks, calling Gemini reviewer
--   passed      — all 10 parameters passed
--   failed      — one or more parameters failed, about to rewrite
--   rewriting   — starting a rewrite cycle with feedback
--   discarded   — max rewrite attempts reached, question discarded
--   complete    — all question slots finished (final event)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.generation_job_events (
  id BIGSERIAL PRIMARY KEY,

  job_id UUID NOT NULL
    REFERENCES public.generation_jobs (id) ON DELETE CASCADE,

  -- Which question slot (0-indexed) this event belongs to.
  -- NULL for job-level events like 'complete'.
  question_index INTEGER,

  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'generating',
      'parse_error',
      'reviewing',
      'passed',
      'failed',
      'rewriting',
      'discarded',
      'complete'
    )),

  -- Event-specific data:
  --   passed:      { question: {...}, review: { p1: {...}, ... }, parametersPassed: 10 }
  --   failed:      { failedParams: ["p3","p7"], review: { p1: {...}, ... } }
  --   rewriting:   { attempt: 2, rewritePrompt: "..." }
  --   discarded:   { reason: "Max rewrite attempts reached" }
  --   parse_error: { attempt: 1, rawResponse: "..." }
  --   complete:    { totalPassed: 9, totalDiscarded: 1 }
  payload JSONB,

  -- question_id is set for events that are tied to a saved question
  -- (passed, failed, discarded) — NULL for generating/reviewing/complete
  question_id BIGINT
    REFERENCES public.questions (id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary lookup pattern: get all events for a job after a given timestamp
CREATE INDEX IF NOT EXISTS idx_job_events_job_created
  ON public.generation_job_events (job_id, created_at ASC);

-- Allow quick lookup of events tied to a specific question
CREATE INDEX IF NOT EXISTS idx_job_events_question_id
  ON public.generation_job_events (question_id)
  WHERE question_id IS NOT NULL;


-- ============================================================
-- PART 5: Row Level Security (RLS)
-- ============================================================

-- question_reviews: readable by the question's owner only
ALTER TABLE public.question_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reviews for their own questions"
  ON public.question_reviews FOR SELECT
  USING (
    question_id IN (
      SELECT id FROM public.questions
      WHERE user_id = auth.uid()
    )
  );

-- generation_jobs: readable/writable by the job's owner
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generation jobs"
  ON public.generation_jobs FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

-- generation_job_events: readable if you own the job
ALTER TABLE public.generation_job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their own jobs"
  ON public.generation_job_events FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM public.generation_jobs
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

-- n8n uses the Supabase service role key (bypasses RLS) to write events.
-- No INSERT policies needed for these tables from the client side.


-- ============================================================
-- PART 6: Comments for documentation
-- ============================================================

COMMENT ON COLUMN public.questions.review_status IS
  'Review pipeline state: pending → passed or (failed → rewriting → passed or discarded)';

COMMENT ON COLUMN public.questions.is_user_visible IS
  'TRUE only when all 10 review parameters pass AND user was authenticated at generation time. Controls visibility in My Questions page.';

COMMENT ON COLUMN public.questions.review_attempts IS
  'Number of rewrite cycles completed. Max is 3 before status becomes discarded.';

COMMENT ON COLUMN public.questions.parse_attempts IS
  'Number of times the AI response failed to parse before a valid response was received.';

COMMENT ON TABLE public.question_reviews IS
  'One row per review attempt per question. Stores binary pass/fail + feedback for all 10 parameters. Used for analytics, debugging, and future fine-tuning.';

COMMENT ON TABLE public.generation_jobs IS
  'One row per form submission. Tracks the overall status of a batch generation request. Written by Vercel, updated by n8n.';

COMMENT ON TABLE public.generation_job_events IS
  'Individual progress events for a generation job. Written by n8n after each step. Polled by Vercel every 2 seconds to provide real-time UI updates.';

-- ============================================================
-- END OF MIGRATION 001
-- ============================================================
