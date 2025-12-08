import { NextRequest, NextResponse } from 'next/server'
import { getUserFromAuthenticatedRequest } from '@/lib/supabaseServer'
import { selectImageAttempt, selectImageByIdAndPlacement } from '@/lib/database'

/**
 * POST /api/images/select
 * Select a specific image attempt for use in questions/PDFs
 * Updated to support new schema with question_id and placement_type
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and get user
    const { supabase } = await getUserFromAuthenticatedRequest(request)

    const body = await request.json()
    const { image_id, question_id, placement_type, prompt_id } = body

    // Validate required fields for new schema
    if (image_id && question_id && placement_type) {
      // New schema approach - use image_id directly

      // Verify user has access to this image
      const { data: imageData, error: imageError } = await supabase
        .from('question_images')
        .select('*')
        .eq('id', image_id)
        .eq('question_id', question_id)
        .eq('placement_type', placement_type)
        .single()

      if (imageError || !imageData) {
        return NextResponse.json(
          { success: false, error: 'Image not found or access denied' },
          { status: 404 }
        )
      }

      // Select the image using new schema approach with authenticated client
      const result = await selectImageByIdAndPlacement(image_id, question_id, placement_type, supabase)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Image selected successfully',
        selected_image_id: image_id,
        question_id,
        placement_type
      })

    } else if (image_id && prompt_id) {
      // Legacy approach - fallback for old schema
      console.log('🖼️ Selecting image (legacy):', image_id, 'for prompt:', prompt_id)

      // Verify user has access to this image
      const { data: imageData, error: imageError } = await supabase
        .from('question_images')
        .select('*')
        .eq('id', image_id)
        .eq('prompt_id', prompt_id)
        .single()

      if (imageError || !imageData) {
        return NextResponse.json(
          { success: false, error: 'Image not found or access denied' },
          { status: 404 }
        )
      }

      // Select the image attempt using legacy approach
      const result = await selectImageAttempt(prompt_id, image_id)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        )
      }

      console.log('✅ Image selected successfully (legacy)')

      return NextResponse.json({
        success: true,
        message: 'Image selected successfully',
        selected_image_id: image_id
      })

    } else {
      return NextResponse.json(
        { success: false, error: 'Either (image_id, question_id, placement_type) or (image_id, prompt_id) are required' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Error selecting image:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/images/select
 * Get currently selected images for a question or prompt
 * Updated to support new schema with question_id and placement_type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const promptId = searchParams.get('prompt_id')
    const questionId = searchParams.get('question_id')
    const placementType = searchParams.get('placement_type')

    if (!promptId && !questionId) {
      return NextResponse.json(
        { success: false, error: 'prompt_id or question_id is required' },
        { status: 400 }
      )
    }

    // Check authentication and get user
    const { supabase } = await getUserFromAuthenticatedRequest(request)

    let selectedImages

    if (questionId) {
      // New schema approach - get selected images for a question
      let query = supabase
        .from('question_images')
        .select(`
          *,
          image_prompts!inner(
            id,
            question_id,
            placement,
            prompt_text
          )
        `)
        .eq('question_id', questionId)
        .eq('is_selected', true)

      // Filter by placement type if specified
      if (placementType) {
        query = query.eq('placement_type', placementType)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error querying new schema:', error)
        // Fallback to legacy approach if new schema fields don't exist yet
      } else {
        selectedImages = data || []
        
        return NextResponse.json({
          success: true,
          data: selectedImages,
          schema: 'new'
        })
      }
    }

    // Legacy approach or fallback
    if (promptId) {
      // Get selected image for specific prompt
      const { data, error } = await supabase
        .from('question_images')
        .select('*')
        .eq('prompt_id', promptId)
        .eq('is_selected', true)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error
      }

      selectedImages = data ? [data] : []
    } else if (questionId) {
      // Legacy: Get all selected images for a question via prompts
      const { data: prompts } = await supabase
        .from('image_prompts')
        .select('id')
        .eq('question_id', questionId)

      if (prompts && prompts.length > 0) {
        const promptIds = prompts.map(p => p.id)
        
        const { data, error } = await supabase
          .from('question_images')
          .select(`
            *,
            image_prompts!inner(
              id,
              question_id,
              placement,
              prompt_text
            )
          `)
          .in('prompt_id', promptIds)
          .eq('is_selected', true)

        if (error) {
          throw error
        }

        selectedImages = data || []
      } else {
        selectedImages = []
      }
    }

    return NextResponse.json({
      success: true,
      data: selectedImages,
      schema: 'legacy'
    })

  } catch (error) {
    console.error('❌ Error getting selected images:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/images/select
 * Deselect images for a question/placement or prompt
 * Updated to support new schema with question_id and placement_type
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and get user
    const { supabase } = await getUserFromAuthenticatedRequest(request)

    const body = await request.json()
    const { prompt_id, question_id, placement_type } = body

    if (question_id && placement_type) {
      // New schema approach - deselect by question and placement
      console.log('🚫 Deselecting images for question:', question_id, 'placement:', placement_type)

      const { error } = await supabase
        .from('question_images')
        .update({ is_selected: false })
        .eq('question_id', question_id)
        .eq('placement_type', placement_type)

      if (error) {
        throw error
      }

      console.log('✅ Images deselected successfully (new schema)')

      return NextResponse.json({
        success: true,
        message: `All images deselected for question ${question_id} placement ${placement_type}`
      })

    } else if (prompt_id) {
      // Legacy approach - deselect by prompt
      console.log('🚫 Deselecting all images for prompt:', prompt_id)

      const { error } = await supabase
        .from('question_images')
        .update({ is_selected: false })
        .eq('prompt_id', prompt_id)

      if (error) {
        throw error
      }

      console.log('✅ Images deselected successfully (legacy)')

      return NextResponse.json({
        success: true,
        message: 'All images deselected for prompt'
      })

    } else {
      return NextResponse.json(
        { success: false, error: 'Either (question_id and placement_type) or prompt_id is required' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Error deselecting images:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}