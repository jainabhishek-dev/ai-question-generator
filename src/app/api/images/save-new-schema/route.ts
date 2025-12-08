import { NextRequest, NextResponse } from 'next/server'
import { getUserFromAuthenticatedRequest } from '@/lib/supabaseServer'
import { generateImageNewSchema } from '@/lib/database'

/**
 * POST /api/images/save-new-schema
 * Save an already-generated image using the new schema (question_id + placement_type)
 * This is used when the image was generated client-side but needs to be saved with new schema
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and get user
    const { user } = await getUserFromAuthenticatedRequest(request)

    const body = await request.json()
    const { 
      question_id, 
      placement_type, 
      image_url, 
      prompt_used,
      alt_text 
    } = body

    // Validate required fields
    if (!question_id || !placement_type || !image_url || !prompt_used) {
      return NextResponse.json(
        { success: false, error: 'question_id, placement_type, image_url, and prompt_used are required' },
        { status: 400 }
      )
    }

    console.log('💾 Saving image with new schema')
    console.log('📋 Details:', { question_id, placement_type, url_preview: image_url.substring(0, 50) + '...' })

    // Save image record using new schema
    const saveResult = await generateImageNewSchema(
      question_id,
      placement_type,
      image_url,
      prompt_used,
      undefined, // no prompt_id for pure new schema
      user.id,
      alt_text || prompt_used
    )

    if (!saveResult.success) {
      console.error('❌ Failed to save image with new schema:', saveResult.error)
      return NextResponse.json(
        { success: false, error: saveResult.error || 'Failed to save image record' },
        { status: 500 }
      )
    }

    console.log('✅ Image saved with new schema successfully')

    return NextResponse.json({
      success: true,
      data: saveResult.data
    })

  } catch (error) {
    console.error('❌ Error saving image with new schema:', error)
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}