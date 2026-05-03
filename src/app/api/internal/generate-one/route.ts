import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdvancedPrompt, generateQuestions } from '@/lib/gemini'
import { createNCERTPrompt } from '@/lib/ncertPrompt'
import { buildRewritePrompt } from '@/lib/reviewerPrompt'
import { parseQuestions, processQuestions } from '@/lib/questionParser'
import { questionArraySchema } from '@/lib/questionSchema'
import type { Inputs } from '@/components/AdvancedQuestionForm'
import type { ReviewResult } from '@/lib/reviewerPrompt'

/**
 * POST /api/internal/generate-one
 *
 * Called exclusively by n8n. Generates a single question of a specific type.
 * Handles prompt building and Gemini API call for one question slot.
 * Parsing is attempted; if it fails, parseError is set.
 * The caller (n8n) is responsible for retry logic and DB writes.
 *
 * Auth: X-Internal-Secret header (stored as n8n credential)
 */

const VALID_QUESTION_TYPES = [
  'multiple-choice',
  'true-false',
  'fill-in-the-blank',
  'short-answer',
  'long-answer',
] as const

type QuestionType = typeof VALID_QUESTION_TYPES[number]

/** Build an Inputs override for exactly 1 question of the specified type */
function buildSingleQuestionInputs(inputs: Inputs, questionType: QuestionType): Inputs {
  return {
    ...inputs,
    numMCQ:         questionType === 'multiple-choice'   ? 1 : 0,
    numTrueFalse:   questionType === 'true-false'        ? 1 : 0,
    numFillBlank:   questionType === 'fill-in-the-blank' ? 1 : 0,
    numShortAnswer: questionType === 'short-answer'      ? 1 : 0,
    numLongAnswer:  questionType === 'long-answer'       ? 1 : 0,
    totalQuestions: 1,
  }
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth: validate internal secret ───────────────────────────────────────
    const internalSecret = process.env.INTERNAL_API_SECRET
    if (!internalSecret) {
      return NextResponse.json(
        { success: false, error: 'INTERNAL_API_SECRET is not configured.' },
        { status: 500 }
      )
    }

    const providedSecret = request.headers.get('x-internal-secret')
    if (providedSecret !== internalSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized.' },
        { status: 401 }
      )
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    let body: {
      jobId: string
      userId?: string
      questionIndex: number
      questionType: QuestionType
      attemptNumber: number
      rewriteInstructions?: string
      previousReviewResult?: ReviewResult
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body.' },
        { status: 400 }
      )
    }

    const { jobId, userId, questionIndex, questionType, attemptNumber, rewriteInstructions, previousReviewResult } = body

    if (!jobId || !questionType || !attemptNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: jobId, questionType, attemptNumber.' },
        { status: 400 }
      )
    }

    if (!VALID_QUESTION_TYPES.includes(questionType)) {
      return NextResponse.json(
        { success: false, error: `Invalid questionType. Must be one of: ${VALID_QUESTION_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // ── Load job inputs from DB using service role ───────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase configuration missing.' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: job, error: jobError } = await supabaseAdmin
      .from('generation_jobs')
      .select('inputs, mode')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: `Job not found: ${jobId}` },
        { status: 404 }
      )
    }

    const inputs = job.inputs as Inputs
    const mode = job.mode as 'general' | 'ncert'

    // ── Build prompt ─────────────────────────────────────────────────────────
    const singleInputs = buildSingleQuestionInputs(inputs, questionType)

    let basePrompt: string
    if (mode === 'ncert') {
      basePrompt = createNCERTPrompt(singleInputs)
    } else {
      basePrompt = createAdvancedPrompt(singleInputs)
    }

    // On rewrite attempts, append the rewrite instructions to the base prompt
    let finalPrompt = basePrompt
    if (attemptNumber > 1 && rewriteInstructions && previousReviewResult) {
      finalPrompt = buildRewritePrompt(basePrompt, previousReviewResult, attemptNumber)
    }

    // ── Call Gemini ──────────────────────────────────────────────────────────
    // Use pdfFileUri from inputs if present (uploaded PDF context)
    const result = await generateQuestions(
      { ...singleInputs },
      inputs.pdfFileUri
    )

    const rawText = result.text

    if (!rawText || rawText.trim() === '') {
      return NextResponse.json({
        success: true,
        parseError: true,
        parseErrorReason: 'Gemini returned empty response.',
        rawText: '',
        question: null,
        prompt: finalPrompt,
      })
    }

    // ── Parse the response ───────────────────────────────────────────────────
    let question: ReturnType<typeof processQuestions>[0] | null = null
    let parseError = false
    let parseErrorReason = ''

    try {
      const parsed = JSON.parse(rawText)
      const validated = questionArraySchema.parse(
        Array.isArray(parsed) ? parsed : [parsed]
      )
      const processed = processQuestions(validated as Parameters<typeof processQuestions>[0])
      question = processed[0] ?? null
      if (!question) {
        parseError = true
        parseErrorReason = 'Parsed array was empty.'
      }
    } catch {
      // Fallback parser
      try {
        const fallbackParsed = parseQuestions(rawText)
        const processed = processQuestions(fallbackParsed)
        question = processed[0] ?? null
        if (!question) {
          parseError = true
          parseErrorReason = 'Fallback parser returned empty result.'
        }
      } catch (fallbackErr) {
        parseError = true
        parseErrorReason = fallbackErr instanceof Error
          ? fallbackErr.message
          : 'All parse strategies failed.'
      }
    }

    // ── Validate MCQ has 4 options ───────────────────────────────────────────
    if (!parseError && question && questionType === 'multiple-choice') {
      if (!question.options || question.options.length !== 4) {
        parseError = true
        parseErrorReason = `MCQ must have exactly 4 options. Got ${question.options?.length ?? 0}.`
        question = null
      }
    }

    // ── Validate required fields ─────────────────────────────────────────────
    if (!parseError && question) {
      if (!question.question?.trim() || !question.correctAnswer?.trim()) {
        parseError = true
        parseErrorReason = 'Question or correctAnswer field is missing or empty.'
        question = null
      }
    }

    return NextResponse.json({
      success: true,
      jobId,
      userId,
      questionIndex,
      questionType,
      attemptNumber,
      parseError,
      parseErrorReason: parseError ? parseErrorReason : '',
      question: parseError ? null : question,
      rawText,
      prompt: finalPrompt,
    })
  } catch (err) {
    console.error('[internal/generate-one] Unexpected error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error.',
      },
      { status: 500 }
    )
  }
}
