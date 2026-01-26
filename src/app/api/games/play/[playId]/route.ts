import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playId: string }> }
) {
  try {
    const { playId } = await params;

    if (!playId) {
      return NextResponse.json(
        { error: 'Play ID is required' },
        { status: 400 }
      );
    }

    // Use service role client (bypasses RLS, works for everyone)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Fetch game play record with answers
    const { data, error } = await supabase
      .from('game_plays')
      .select('*')
      .eq('id', playId)
      .single();

    if (error) {
      console.error('Error fetching game play:', error);
      return NextResponse.json(
        { error: 'Failed to fetch game play data' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Game play not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      gamePlay: data
    });

  } catch (error) {
    console.error('Error in game play API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
