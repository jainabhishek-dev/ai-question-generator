import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { NcertBatch, NcertChapter, NcertGenerationInput } from '@/types/ncert'

/**
 * POST /api/internal/ncert-next-pending
 *
 * Called by n8n at the top of each loop iteration.
 * 1. Checks if the batch is paused or completed → n8n should stop looping.
 * 2. Fetches the next 'pending' input row for the batch.
 * 3. Atomically marks it 'generating' and updates current_chapter_name on the batch.
 *
 * Returns:
 *   { paused: true, input: null }  — batch is paused, stop looping
 *   { paused: false, input: null } — no pending rows remain, stop looping
 *   { paused: false, input: { ...row + batch + chapter } } — process this row
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

  let body: { batchId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { batchId } = body
  if (!batchId) {
    return NextResponse.json({ success: false, error: 'Missing required field: batchId.' }, { status: 400 })
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

  // ── 1. Check batch status ──────────────────────────────────────────────────

  const { data: batch, error: batchError } = await supabase
    .from('ncert_batches')
    .select('id, status, user_id, grade, subject, sub_subject, current_chapter_name')
    .eq('id', batchId)
    .single()

  if (batchError || !batch) {
    return NextResponse.json({ success: false, error: 'Batch not found.' }, { status: 404 })
  }

  if ((batch as NcertBatch).status === 'paused') {
    return NextResponse.json({ success: true, paused: true, input: null })
  }

  if ((batch as NcertBatch).status !== 'generating') {
    return NextResponse.json({ success: true, paused: false, input: null })
  }

  // ── 2. Fetch next pending input ────────────────────────────────────────────

  const { data: rows, error: rowsError } = await supabase
    .from('ncert_generation_inputs')
    .select(`
      *,
      chapter:ncert_chapters (*)
    `)
    .eq('batch_id', batchId)
    .eq('status', 'pending')
    .order('chapter_id')
    .order('topic')
    .order('sub_topic')
    .order('blooms_level')
    .order('question_type')
    .limit(1)

  if (rowsError) {
    return NextResponse.json({ success: false, error: rowsError.message }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    // No pending rows — generation loop is complete
    return NextResponse.json({ success: true, paused: false, input: null })
  }

  const row = rows[0] as NcertGenerationInput & { chapter: NcertChapter }
  const chapterName = row.chapter.chapter_name

  // ── 3. Mark input as 'generating' + update current_chapter_name ───────────

  const [updateInput] = await Promise.all([
    supabase
      .from('ncert_generation_inputs')
      .update({ status: 'generating' })
      .eq('id', row.id)
      .eq('status', 'pending'), // guard against race conditions

    supabase
      .from('ncert_batches')
      .update({ current_chapter_name: chapterName })
      .eq('id', batchId),
  ])

  if (updateInput.error) {
    return NextResponse.json({ success: false, error: updateInput.error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    paused: false,
    input: {
      id: row.id,
      batch_id: row.batch_id,
      chapter_id: row.chapter_id,
      topic: row.topic,
      sub_topic: row.sub_topic,
      page_numbers: row.page_numbers,
      page_image_drive_ids: row.page_image_drive_ids,
      blooms_level: row.blooms_level,
      question_type: row.question_type,
      difficulty: row.difficulty,
      retry_count: row.retry_count,
      chapter: {
        id: row.chapter.id,
        chapter_name: row.chapter.chapter_name,
        chapter_number: row.chapter.chapter_number,
      },
      batch: {
        id: batchId,
        user_id: (batch as NcertBatch).user_id,
        grade: (batch as NcertBatch).grade,
        subject: (batch as NcertBatch).subject,
        sub_subject: (batch as NcertBatch).sub_subject,
      },
    },
  })

}
