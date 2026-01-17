import { NextRequest, NextResponse } from 'next/server';
import { getUserGames } from '@/lib/gameDatabase';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    // Get current user
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

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const gameType = searchParams.get('game_type') as 'quiz' | 'interactive_diagram' | 'draggable_geometry' | 'parameter_slider' | 'flashcard' | 'matching' | null;
    const difficulty = searchParams.get('difficulty') as 'easy' | 'medium' | 'hard' | null;
    const subject = searchParams.get('subject');
    const sortBy = searchParams.get('sort_by') as 'recent' | 'popular' | 'rating' | null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const result = await getUserGames(user.id, {
      game_type: gameType || undefined,
      difficulty: difficulty || undefined,
      subject: subject || undefined,
      sort_by: sortBy || 'recent',
      limit: limit
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch games' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      games: result.data || []
    });

  } catch (error) {
    console.error('Error in my-games API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
