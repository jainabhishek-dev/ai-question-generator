import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getNcertInput, incrementBatchCounter } from '@/lib/ncertDatabase'

/**
 * POST /api/internal/ncert-save-result
 *
 * Called by n8n after each input row finishes processing (either passed review or discarded).
 *
 * If passed:
 *   - Inserts the question into the questions table with all NCERT metadata
 *   - Marks the input row status='done', question_id=<new id>
 *   - Increments batch.inputs_done (auto-completes batch if all done)
 *
 * If not passed (discarded after max retries):
 *   - Marks the input row status='discarded'
 *   - Increments batch.inputs_discarded (auto-completes batch if all done)
 *
 * Auth: X-Internal-Secret header
 */
export async function POST(request: NextRequest) {
  const internalSecret = process.env.INTERNAL_API_SECRET
  if (!internalSecret) {
    return NextResponse.json(
      { success: false, error: 'INTERNAL_API_SECRET is not configured.' },
      { status: 500 }
    )
  }
  if (request.headers.get('x-internal-secret') !== internalSecret) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
  }

  let body: {
    ncertInputId: string
    passed: boolean
    question?: {
      type: string
      question: string
      options?: string[] | null
      correctAnswer: string
      explanation?: string | null
      prompt?: string
    }
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { ncertInputId, passed, question } = body

  if (!ncertInputId || passed === undefined) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: ncertInputId, passed.' },
      { status: 400 }
    )
  }

  if (passed && !question) {
    return NextResponse.json(
      { success: false, error: 'question is required when passed=true.' },
      { status: 400 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: 'Supabase environment variables are not configured.' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Load input row with batch + chapter context ────────────────────────────

  const inputResult = await getNcertInput(ncertInputId)
  if (!inputResult.success || !inputResult.data) {
    return NextResponse.json({ success: false, error: 'Input row not found.' }, { status: 404 })
  }

  const { batch, chapter, ...input } = inputResult.data

  // ── Handle discarded ───────────────────────────────────────────────────────

  if (!passed) {
    const { error: discardError } = await supabase
      .from('ncert_generation_inputs')
      .update({ status: 'discarded', processed_at: new Date().toISOString() })
      .eq('id', ncertInputId)

    if (discardError) {
      return NextResponse.json({ success: false, error: discardError.message }, { status: 500 })
    }

    await incrementBatchCounter(batch.id, 'inputs_discarded')
    return NextResponse.json({ success: true, questionId: null })
  }

  // ── Handle passed — insert question ───────────────────────────────────────

  const { data: savedQuestion, error: insertError } = await supabase
    .from('questions')
    .insert({
      question:       question!.question,
      question_type:  question!.type,
      options:        question!.options ?? null,
      correct_answer: question!.correctAnswer,
      explanation:    question!.explanation ?? null,
      subject:        batch.subject,
      sub_subject:    batch.sub_subject ?? null,
      topic:          input.topic,
      sub_topic:      input.sub_topic,
      grade:          batch.grade,
      difficulty:     input.difficulty,
      blooms_level:   input.blooms_level,
      chapter_number: String(chapter.chapter_number),
      chapter_name:   chapter.chapter_name,
      learning_outcome: null,
      question_source:  null,
      ai_prompt:      question!.prompt ?? null,
      user_id:        batch.user_id,
      is_public:      false,
      is_shared:      false,
      // Review lifecycle columns
      review_status:    'passed',
      is_user_visible:  true,
      review_attempts:  1,
      parse_attempts:   1,
      // NCERT pipeline columns (added in migration 002)
      source:                   'ncert_pipeline',
      page_numbers:             input.page_numbers,
      source_page_image_drive_ids: input.page_image_drive_ids,
      ncert_input_id:           ncertInputId,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[ncert-save-result] Failed to insert question:', insertError)
    return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
  }

  const questionId = savedQuestion.id as number

  // ── Mark input done ────────────────────────────────────────────────────────

  const { error: doneError } = await supabase
    .from('ncert_generation_inputs')
    .update({
      status:       'done',
      question_id:  questionId,
      processed_at: new Date().toISOString(),
    })
    .eq('id', ncertInputId)

  if (doneError) {
    console.error('[ncert-save-result] Failed to update input status to done:', doneError)
  }

  await incrementBatchCounter(batch.id, 'inputs_done')

  return NextResponse.json({ success: true, questionId })
}
