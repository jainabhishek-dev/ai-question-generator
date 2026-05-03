import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import {
  REVIEWER_SYSTEM_PROMPT,
  buildReviewPrompt,
  reviewResultJsonSchema,
  type ReviewResult,
  type ReviewContext,
} from '@/lib/reviewerPrompt'
import type { Inputs } from '@/components/AdvancedQuestionForm'

/**
 * POST /api/internal/review-one
 *
 * Called exclusively by n8n. Reviews a single question against all 10 parameters.
 * Returns the structured ReviewResult — n8n uses this to decide whether to
 * mark the question as passed, trigger a rewrite, or discard it.
 *
 * Auth: X-Internal-Secret header (stored as n8n credential)
 */
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

    // ── Validate Gemini API key ──────────────────────────────────────────────
    const geminiApiKey = process.env.GEMINI_API_KEY_SERVER || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key is not configured.' },
        { status: 500 }
      )
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    let body: {
      jobId: string
      userId?: string
      questionIndex: number
      attemptNumber: number
      question: {
        type: string
        question: string
        options?: string[] | null
        correctAnswer: string
        explanation?: string | null
      }
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body.' },
        { status: 400 }
      )
    }

    const { jobId, userId, questionIndex, attemptNumber, question } = body

    if (!jobId || !question) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: jobId, question.' },
        { status: 400 }
      )
    }

    if (!question.question?.trim() || !question.correctAnswer?.trim() || !question.type?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Question object is incomplete: question, correctAnswer, and type are required.' },
        { status: 400 }
      )
    }

    // ── Load job context from DB ─────────────────────────────────────────────
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

    // ── Build review context from job inputs ─────────────────────────────────
    const reviewContext: ReviewContext = {
      subject:       inputs.subject,
      subSubject:    inputs.subSubject || null,
      topic:         inputs.topic,
      subTopic:      inputs.subTopic || null,
      grade:         inputs.grade,
      difficulty:    inputs.difficulty,
      bloomsLevel:   inputs.bloomsLevel,
      questionType:  question.type,
      questionSource: inputs.question_source ?? 'general',
    }

    // ── Build the reviewer prompt ────────────────────────────────────────────
    const userTurnPrompt = buildReviewPrompt(question, reviewContext)

    // ── Call Gemini for structured review ────────────────────────────────────
    const genAI = new GoogleGenAI({ apiKey: geminiApiKey })

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: REVIEWER_SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. Please provide the question to review.' }] },
        { role: 'user', parts: [{ text: userTurnPrompt }] },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: reviewResultJsonSchema,
      },
    })

    const rawReviewText = response.text ?? ''

    if (!rawReviewText.trim()) {
      return NextResponse.json(
        { success: false, error: 'Gemini reviewer returned empty response.' },
        { status: 502 }
      )
    }

    // ── Parse the structured review result ───────────────────────────────────
    let reviewResult: ReviewResult
    try {
      reviewResult = JSON.parse(rawReviewText) as ReviewResult
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse reviewer response as JSON.',
          rawReviewText,
        },
        { status: 502 }
      )
    }

    // ── Enforce P7/P8 auto-pass for non-MCQ ─────────────────────────────────
    // The reviewer prompt instructs auto-pass, but we enforce it here too
    // to guarantee correctness regardless of model output.
    if (question.type !== 'multiple-choice') {
      reviewResult.p7 = { pass: true, feedback: '' }
      reviewResult.p8 = { pass: true, feedback: '' }
    }

    // ── Recompute aggregate fields to be safe ────────────────────────────────
    const paramKeys = ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10'] as const
    const parametersPassed = paramKeys.filter(k => reviewResult[k]?.pass === true).length
    const overallPassed = parametersPassed === 10

    reviewResult.parameters_passed = parametersPassed
    reviewResult.overall_passed = overallPassed
    if (overallPassed) {
      reviewResult.rewrite_instructions = ''
    }

    return NextResponse.json({
      success: true,
      jobId,
      userId,
      questionIndex,
      attemptNumber,
      questionType: question.type,
      question,
      reviewResult,
    })
  } catch (err) {
    console.error('[internal/review-one] Unexpected error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error.',
      },
      { status: 500 }
    )
  }
}
