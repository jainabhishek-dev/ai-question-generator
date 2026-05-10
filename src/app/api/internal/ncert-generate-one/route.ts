import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { downloadDriveFileAsBase64 } from '@/lib/googleDrive'
import { buildNcertPipelineGenerationPrompt } from '@/lib/ncertPipelinePrompt'
import { buildRewritePrompt } from '@/lib/reviewerPrompt'
import { getNcertInput } from '@/lib/ncertDatabase'
import { parseQuestions, processQuestions } from '@/lib/questionParser'
import { questionArraySchema } from '@/lib/questionSchema'
import type { NcertGenerateOneRequest } from '@/types/ncert'
import type { ReviewResult } from '@/lib/reviewerPrompt'

/**
 * POST /api/internal/ncert-generate-one
 *
 * Called exclusively by n8n during Phase 2.
 * Generates one question for the given ncert_generation_inputs row.
 *
 * Differences from /api/internal/generate-one:
 *   - Reads context from ncert_generation_inputs (not generation_jobs)
 *   - Passes page images as inline base64 to Gemini (multimodal)
 *   - Uses the NCERT pipeline prompt builder
 *
 * Auth: X-Internal-Secret header
 */
export async function POST(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const internalSecret = process.env.INTERNAL_API_SECRET
    if (!internalSecret) {
      return NextResponse.json(
        { success: false, error: 'INTERNAL_API_SECRET is not configured.' },
        { status: 500 }
      )
    }

    if (request.headers.get('x-internal-secret') !== internalSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized.' },
        { status: 401 }
      )
    }

    // ── Validate env vars ─────────────────────────────────────────────────────
    const geminiApiKey = process.env.GEMINI_API_KEY_SERVER || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key is not configured.' },
        { status: 500 }
      )
    }

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json(
        { success: false, error: 'GOOGLE_SERVICE_ACCOUNT_JSON is not configured.' },
        { status: 500 }
      )
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: NcertGenerateOneRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body.' },
        { status: 400 }
      )
    }

    const { ncertInputId, attemptNumber, rewriteInstructions, previousReviewResult } = body

    if (!ncertInputId || !attemptNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: ncertInputId, attemptNumber.' },
        { status: 400 }
      )
    }

    // ── Load input row with batch + chapter context ───────────────────────────
    const inputResult = await getNcertInput(ncertInputId)
    if (!inputResult.success || !inputResult.data) {
      return NextResponse.json(
        { success: false, error: `Input row not found: ${ncertInputId}` },
        { status: 404 }
      )
    }

    const { batch, chapter, ...input } = inputResult.data

    // ── Download page images from Drive ───────────────────────────────────────
    // Download all page images for this topic in parallel
    const imageBase64Results = await Promise.allSettled(
      input.page_image_drive_ids.map(fileId => downloadDriveFileAsBase64(fileId))
    )

    const imageBase64List: string[] = []
    for (const result of imageBase64Results) {
      if (result.status === 'fulfilled') {
        imageBase64List.push(result.value)
      }
      // If a single image fails, we continue with the others rather than
      // aborting — partial context is better than no context
    }

    if (imageBase64List.length === 0) {
      return NextResponse.json(
        { success: false, error: 'All page image downloads from Drive failed.' },
        { status: 502 }
      )
    }

    // ── Build generation prompt ───────────────────────────────────────────────
    const basePrompt = buildNcertPipelineGenerationPrompt({
      grade: batch.grade,
      subject: batch.subject,
      subSubject: batch.sub_subject,
      chapterNumber: chapter.chapter_number,
      chapterName: chapter.chapter_name,
      topic: input.topic,
      subTopic: input.sub_topic,
      pageNumbers: input.page_numbers,
      bloomsLevel: input.blooms_level,
      questionType: input.question_type,
      difficulty: input.difficulty,
    })

    // On rewrite attempts, wrap the base prompt with review feedback
    let finalPrompt: string
    if (attemptNumber > 1 && rewriteInstructions && previousReviewResult) {
      finalPrompt = buildRewritePrompt(basePrompt, previousReviewResult as unknown as ReviewResult, attemptNumber)
    } else {
      finalPrompt = basePrompt
    }

    // ── Call Gemini with prompt + page images ─────────────────────────────────
    const genAI = new GoogleGenAI({ apiKey: geminiApiKey })

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { questionArrayJsonSchema } = await import('@/lib/questionSchema')

    const parts = [
      { text: finalPrompt },
      ...imageBase64List.map(base64 => ({
        inlineData: { data: base64, mimeType: 'image/jpeg' as const },
      })),
    ]

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: questionArrayJsonSchema,
      },
    })

    const rawText = response.text ?? ''

    if (!rawText.trim()) {
      return NextResponse.json({
        success: true,
        ncertInputId,
        parseError: true,
        parseErrorReason: 'Gemini returned empty response.',
        question: null,
        rawText: '',
        prompt: finalPrompt,
      })
    }

    // ── Parse the response ────────────────────────────────────────────────────
    // The prompt asks for a single object but the schema expects an array.
    // We handle both.
    let question: ReturnType<typeof processQuestions>[0] | null = null
    let parseError = false
    let parseErrorReason = ''

    try {
      const parsed = JSON.parse(rawText)
      const asArray = Array.isArray(parsed) ? parsed : [parsed]
      const validated = questionArraySchema.parse(asArray)
      const processed = processQuestions(validated as Parameters<typeof processQuestions>[0])
      question = processed[0] ?? null
      if (!question) {
        parseError = true
        parseErrorReason = 'Parsed array was empty.'
      }
    } catch {
      try {
        const fallback = parseQuestions(rawText)
        const processed = processQuestions(fallback)
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

    // ── Post-parse validation ─────────────────────────────────────────────────
    if (!parseError && question && input.question_type === 'multiple-choice') {
      if (!question.options || question.options.length !== 4) {
        parseError = true
        parseErrorReason = `MCQ must have exactly 4 options. Got ${question.options?.length ?? 0}.`
        question = null
      }
    }

    if (!parseError && question) {
      if (!question.question?.trim() || !question.correctAnswer?.trim()) {
        parseError = true
        parseErrorReason = 'question or correctAnswer field is missing or empty.'
        question = null
      }
    }

    return NextResponse.json({
      success: true,
      ncertInputId,
      attemptNumber,
      questionType: input.question_type,
      parseError,
      parseErrorReason: parseError ? parseErrorReason : '',
      question: parseError ? null : question,
      rawText,
      prompt: finalPrompt,
      // Metadata for n8n to use when saving to questions table
      metadata: {
        batchId: batch.id,
        chapterId: chapter.id,
        grade: batch.grade,
        subject: batch.subject,
        subSubject: batch.sub_subject,
        chapterName: chapter.chapter_name,
        chapterNumber: chapter.chapter_number,
        topic: input.topic,
        subTopic: input.sub_topic,
        pageNumbers: input.page_numbers,
        pageImageDriveIds: input.page_image_drive_ids,
        bloomsLevel: input.blooms_level,
        difficulty: input.difficulty,
        userId: batch.user_id,
      },
    })

    // Suppress unused import warning — supabase is imported for potential future use
    void supabase
  } catch (err) {
    console.error('[internal/ncert-generate-one] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error.' },
      { status: 500 }
    )
  }
}
