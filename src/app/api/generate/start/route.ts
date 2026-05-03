import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createGenerationJob } from '@/lib/database'
import type { Inputs } from '@/components/AdvancedQuestionForm'

/**
 * POST /api/generate/start
 *
 * Creates a generation job and fires the n8n webhook.
 * Returns { jobId } immediately — the heavy lifting is done by n8n.
 * Works for both authenticated and guest users.
 */
export async function POST(request: NextRequest) {
  try {
    // ── Validate env vars upfront ────────────────────────────────────────────
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
    const n8nWebhookSecret = process.env.N8N_WEBHOOK_SECRET
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!n8nWebhookUrl) {
      return NextResponse.json(
        { success: false, error: 'N8N_WEBHOOK_URL is not configured. Set it in .env.local.' },
        { status: 500 }
      )
    }
    if (!n8nWebhookSecret) {
      return NextResponse.json(
        { success: false, error: 'N8N_WEBHOOK_SECRET is not configured. Set it in .env.local.' },
        { status: 500 }
      )
    }

    // ── Parse request body ───────────────────────────────────────────────────
    let body: { inputs: Inputs; mode: 'general' | 'ncert' }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body.' },
        { status: 400 }
      )
    }

    const { inputs, mode } = body

    if (!inputs || !mode) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: inputs and mode.' },
        { status: 400 }
      )
    }

    if (!['general', 'ncert'].includes(mode)) {
      return NextResponse.json(
        { success: false, error: 'mode must be "general" or "ncert".' },
        { status: 400 }
      )
    }

    const totalQuestions = inputs.totalQuestions
    if (!totalQuestions || totalQuestions < 1 || totalQuestions > 40) {
      return NextResponse.json(
        { success: false, error: 'totalQuestions must be between 1 and 40.' },
        { status: 400 }
      )
    }

    // ── Resolve userId (optional — guests get null) ──────────────────────────
    let userId: string | null = null

    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ') && supabaseUrl && supabaseAnonKey) {
      try {
        const token = authHeader.substring(7)
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        })
        const { data: { user } } = await supabase.auth.getUser()
        userId = user?.id ?? null
      } catch {
        // Auth failed — proceed as guest
        userId = null
      }
    }

    // ── Create generation job in DB ──────────────────────────────────────────
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY missing.' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: job, error: jobError } = await supabaseAdmin
      .from('generation_jobs')
      .insert({
        user_id: userId,
        inputs,
        mode,
        status: 'pending',
        total_questions: totalQuestions,
        questions_passed: 0,
        questions_discarded: 0,
      })
      .select('id')
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: jobError?.message ?? 'Failed to create generation job.' },
        { status: 500 }
      )
    }

    const jobId = job.id

    // ── Fire webhook to n8n ─────────────────────────────────────────────────
    // n8n receives the job details and runs the full generate→review→rewrite loop.
    // We do NOT await this — the webhook call is fire-and-forget.
    // n8n writes progress events to generation_job_events; the browser polls
    // GET /api/generate/[jobId]/status to read them.
    const webhookPayload = {
      jobId,
      userId,
      mode,
      inputs,
    }

    // Fire webhook — do not await to avoid holding the response
    fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': n8nWebhookSecret,
      },
      body: JSON.stringify(webhookPayload),
    }).catch((err) => {
      // Log but do not fail — n8n may still process successfully
      console.error(`[generate/start] n8n webhook fire failed for job ${jobId}:`, err)
    })

    return NextResponse.json({ success: true, jobId }, { status: 200 })
  } catch (err) {
    console.error('[generate/start] Unexpected error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error.',
      },
      { status: 500 }
    )
  }
}
