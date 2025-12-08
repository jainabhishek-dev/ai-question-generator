import { NextResponse } from 'next/server'

/**
 * POST /api/images/generate
 * DEPRECATED: Image generation has moved to client-side
 * 
 * This endpoint is no longer used. Image generation now happens client-side
 * to avoid Google AI API referrer restrictions. 
 * 
 * New flow:
 * 1. Client-side generation using imagenClientService
 * 2. Upload via /api/images/upload
 * 3. Save record via /api/images/save
 */
export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'This endpoint is deprecated. Image generation has moved to client-side.',
    migration: {
      reason: 'Google AI API referrer restrictions prevented server-side generation',
      newApproach: 'Client-side generation using imagenClientService',
      endpoints: {
        upload: '/api/images/upload',
        save: '/api/images/save'
      }
    }
  }, { status: 410 }) // 410 Gone - resource no longer available
}

/**
 * GET /api/images/generate
 * DEPRECATED: Generation status queries have moved to client-side
 */
export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'This endpoint is deprecated. Image generation tracking has moved to client-side.',
    migration: {
      reason: 'Centralized client-side image generation workflow',
      newApproach: 'Query image status via /api/questions/[id]/images or /api/images/select'
    }
  }, { status: 410 }) // 410 Gone
}