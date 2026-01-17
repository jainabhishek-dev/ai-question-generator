import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.substring(7)

    // Initialize Supabase client with user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch analytics in parallel
    const [questionsResult, imagesResult, gamesResult] = await Promise.all([
      // Count questions
      supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('deleted_at', null),
      
      // Count images
      supabase
        .from('question_images')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      
      // Get games
      supabase
        .from('games')
        .select('total_plays')
        .eq('user_id', user.id)
        .eq('is_active', true)
    ])

    // Calculate totals
    const questionsCount = questionsResult.count || 0
    const imagesCount = imagesResult.count || 0
    const gamesCount = gamesResult.data?.length || 0
    const totalPlays = gamesResult.data?.reduce((sum, game) => sum + (game.total_plays || 0), 0) || 0

    return NextResponse.json({
      success: true,
      data: {
        questionsCount,
        imagesCount,
        gamesCount,
        totalPlays
      }
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch analytics'
      },
      { status: 500 }
    )
  }
}
