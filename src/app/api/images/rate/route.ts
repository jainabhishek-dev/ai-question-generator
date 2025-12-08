import { NextRequest, NextResponse } from 'next/server'
import { getUserFromAuthenticatedRequest } from '@/lib/supabaseServer'
import { rateImage } from '@/lib/database'

/**
 * POST /api/images/rate
 * Rate a generated image for quality and educational accuracy
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and get user
    const { supabase } = await getUserFromAuthenticatedRequest(request)

    const body = await request.json()
    const { image_id, rating, accuracy_feedback } = body

    // Validate required fields
    if (!image_id) {
      return NextResponse.json(
        { success: false, error: 'image_id is required' },
        { status: 400 }
      )
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Validate accuracy feedback if provided
    const validAccuracy = ['correct', 'partially_correct', 'incorrect']
    if (accuracy_feedback && !validAccuracy.includes(accuracy_feedback)) {
      return NextResponse.json(
        { success: false, error: 'Invalid accuracy_feedback value' },
        { status: 400 }
      )
    }

    console.log('⭐ Rating image:', image_id, 'Rating:', rating, 'Accuracy:', accuracy_feedback)

    // Check if user owns or has access to this image
    const { data: imageData, error: imageError } = await supabase
      .from('question_images')
      .select('*')
      .eq('id', image_id)
      .single()

    if (imageError || !imageData) {
      return NextResponse.json(
        { success: false, error: 'Image not found or access denied' },
        { status: 404 }
      )
    }

    // Rate the image
    const result = await rateImage(image_id, rating, accuracy_feedback)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    console.log('✅ Image rated successfully')

    return NextResponse.json({
      success: true,
      message: 'Image rated successfully'
    })

  } catch (error) {
    console.error('❌ Error rating image:', error)
    
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
 * GET /api/images/rate
 * Get rating statistics for images
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('image_id')
    const questionId = searchParams.get('question_id')

    if (!imageId && !questionId) {
      return NextResponse.json(
        { success: false, error: 'image_id or question_id is required' },
        { status: 400 }
      )
    }

    // Check authentication and get user
    const { supabase } = await getUserFromAuthenticatedRequest(request)

    let query = supabase
      .from('question_images')
      .select(`
        id,
        user_rating,
        accuracy_feedback,
        attempt_number,
        is_selected,
        generated_at
      `)

    if (imageId) {
      query = query.eq('id', imageId)
    } else if (questionId) {
      // Get all images for a question via image_prompts
      const { data: prompts } = await supabase
        .from('image_prompts')
        .select('id')
        .eq('question_id', questionId)

      if (prompts && prompts.length > 0) {
        const promptIds = prompts.map(p => p.id)
        query = query.in('prompt_id', promptIds)
      } else {
        return NextResponse.json({
          success: true,
          data: []
        })
      }
    }

    const { data: ratings, error } = await query

    if (error) {
      throw error
    }

    // Calculate statistics
    const stats = {
      total_images: ratings?.length || 0,
      average_rating: 0,
      accuracy_distribution: {
        correct: 0,
        partially_correct: 0,
        incorrect: 0,
        unrated: 0
      },
      rating_distribution: {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0, unrated: 0
      }
    }

    if (ratings && ratings.length > 0) {
      let totalRating = 0
      let ratedCount = 0

      ratings.forEach(rating => {
        // Rating distribution
        if (rating.user_rating && rating.user_rating >= 1 && rating.user_rating <= 5) {
          (stats.rating_distribution as Record<string | number, number>)[rating.user_rating]++
          totalRating += rating.user_rating
          ratedCount++
        } else {
          stats.rating_distribution.unrated++
        }

        // Accuracy distribution
        if (rating.accuracy_feedback) {
          const feedback = rating.accuracy_feedback as keyof typeof stats.accuracy_distribution
          if (feedback in stats.accuracy_distribution) {
            stats.accuracy_distribution[feedback]++
          }
        } else {
          stats.accuracy_distribution.unrated++
        }
      })

      stats.average_rating = ratedCount > 0 ? totalRating / ratedCount : 0
    }

    return NextResponse.json({
      success: true,
      data: {
        ratings: ratings || [],
        statistics: stats
      }
    })

  } catch (error) {
    console.error('❌ Error getting rating stats:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}