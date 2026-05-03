import { NextRequest, NextResponse } from 'next/server'
import { getJobEventsSince } from '@/lib/database'

/**
 * GET /api/generate/[jobId]/status?since=<ISO_TIMESTAMP>
 *
 * Polling endpoint called by the browser every 2 seconds.
 * Returns all new events for the job since the given timestamp,
 * plus the current job status.
 *
 * The jobId UUID acts as an unguessable access token.
 * No user auth required — the UUID is sufficient access control.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId is required.' },
        { status: 400 }
      )
    }

    // Validate jobId is a UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(jobId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid jobId format.' },
        { status: 400 }
      )
    }

    // `since` is an ISO timestamp — only events after this are returned.
    // If not provided, use epoch start to get all events (first poll).
    const since = request.nextUrl.searchParams.get('since') ?? '1970-01-01T00:00:00.000Z'

    // Validate `since` is a parseable date
    if (isNaN(Date.parse(since))) {
      return NextResponse.json(
        { success: false, error: 'Invalid since timestamp. Must be ISO 8601 format.' },
        { status: 400 }
      )
    }

    const result = await getJobEventsSince(jobId, since)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'Failed to fetch job status.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        jobStatus: result.jobStatus,
        events: result.events ?? [],
      },
      {
        status: 200,
        // Prevent caching — results change every 2 seconds
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch (err) {
    console.error('[generate/[jobId]/status] Unexpected error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error.',
      },
      { status: 500 }
    )
  }
}
