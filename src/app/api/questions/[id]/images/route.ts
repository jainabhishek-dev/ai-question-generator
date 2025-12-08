import { NextRequest, NextResponse } from 'next/server'
import { getUserFromAuthenticatedRequest } from '@/lib/supabaseServer'

/**
 * GET /api/questions/[id]/images
 * Fetch all images for a specific question
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const questionId = id

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: 'Question ID is required' },
        { status: 400 }
      )
    }

    // Check authentication and get user
    const { supabase } = await getUserFromAuthenticatedRequest(request)

    // Fetch ALL images using new schema - query directly by question_id
    const { data: images, error } = await supabase
      .from('question_images')
      .select(`
        *,
        image_prompts (
          id,
          prompt_text,
          original_ai_prompt,
          placement,
          style_preference,
          created_at
        )
      `)
      .eq('question_id', questionId)
      .order('generated_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching question images:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch images' },
        { status: 500 }
      )
    }

    // Process images to flatten the prompt data and handle cases where prompts might be missing
    const processedImages = (images || []).map(image => ({
      ...image,
      // Fields for legacy compatibility - use image_prompts data if available, fallback to defaults
      prompt_text: image.image_prompts?.prompt_text || 'Image without prompt',
      original_ai_prompt: image.image_prompts?.original_ai_prompt || 'Generated image',
      placement: image.image_prompts?.placement || image.placement_type || 'question',
      style_preference: image.image_prompts?.style_preference || 'educational_diagram',
      prompt_created_at: image.image_prompts?.created_at || image.generated_at,
      // Fields for new schema compatibility - use direct columns when available
      question_id: parseInt(questionId),
      placement_type: image.placement_type || image.image_prompts?.placement || 'question'
    }))

    // Sort by placement_type first, then by generated_at (most recent first)
    processedImages.sort((a, b) => {
      // First sort by placement_type (question, option_a, option_b, etc.)
      const placementComparison = a.placement_type.localeCompare(b.placement_type)
      if (placementComparison !== 0) return placementComparison
      
      // Then sort by generated_at (most recent first)
      return new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
    })

    // Group by placement_type for better organization
    const imagesByPlaceholder = processedImages.reduce((acc, image) => {
      const key = image.placement_type || 'question'
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(image)
      return acc
    }, {} as Record<string, typeof processedImages>)

    // Images loaded successfully

    return NextResponse.json({
      success: true,
      data: processedImages,
      groupedByPlaceholder: imagesByPlaceholder,
      totalImages: processedImages.length,
      totalPlaceholders: Object.keys(imagesByPlaceholder).length
    })

  } catch (error) {
    console.error('❌ Error fetching question images:', error)
    
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