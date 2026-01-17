import { NextRequest, NextResponse } from 'next/server';
import { submitGamePlay } from '@/lib/gameDatabase';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      game_id,
      player_name,
      time_taken_seconds,
      completed,
      completion_percentage,
      points_earned,
      questions_correct,
      questions_total,
      max_streak,
      hints_used,
      lives_remaining,
      feedback_rating,
      feedback_text,
      quit_reason
    } = body;

    if (!game_id) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }

    // Get current user (optional for anonymous play)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('🔐 User authentication status:', {
      isAuthenticated: !!user,
      userId: user?.id || 'ANONYMOUS',
      playerName: player_name
    });

    // Submit game play (works for both authenticated and anonymous users)
    // NOTE: For anonymous users, we DON'T pass the supabase client
    // This forces it to use the default client which has proper permissions
    const result = await submitGamePlay(
      {
        game_id,
        player_name,
        device_type: 'web',
        time_taken_seconds,
        completed,
        completion_percentage,
        points_earned,
        questions_correct,
        questions_total,
        max_streak,
        hints_used,
        lives_remaining,
        feedback_rating,
        feedback_text,
        quit_reason
      },
      user?.id || null,
      undefined // Use default client instead of custom client
    );

    if (!result.success) {
      console.error('❌ Failed to submit game play:', result.error);
      console.error('📋 Submit data was:', {
        game_id,
        player_name,
        user_id: user?.id || null,
        points_earned
      });
      return NextResponse.json(
        { error: result.error || 'Failed to submit game play' },
        { status: 500 }
      );
    }
    
    console.log('✅ Game play submitted successfully!', {
      playId: result.data?.id,
      playerName: player_name
    });

    return NextResponse.json({
      success: true,
      gamePlay: result.data
    });

  } catch (error) {
    console.error('Error in submit-play API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
