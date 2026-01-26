import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface LeaderboardEntry {
  rank: number;
  player_name: string;
  best_score: number;
  best_time_seconds: number | null;
  best_accuracy: number | null;
  total_plays: number;
  is_current_player?: boolean;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const { searchParams } = new URL(req.url);
    const playerName = searchParams.get('playerName');

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

    // Fetch all game plays for this game
    const { data: plays, error } = await supabase
      .from('game_plays')
      .select('player_name, points_earned, time_taken_seconds, questions_correct, questions_total')
      .eq('game_id', gameId)
      .not('points_earned', 'is', null)
      .order('points_earned', { ascending: false });

    if (error) {
      console.error('Leaderboard query error:', error);
      throw error;
    }

    console.log(`Fetched ${plays?.length || 0} game plays for leaderboard`);

    // Group by player name and calculate best scores
    const playerStats = new Map<string, LeaderboardEntry>();
    
    plays?.forEach(play => {
      const name = play.player_name || 'Anonymous';
      const existing = playerStats.get(name);
      
      if (!existing || play.points_earned > existing.best_score) {
        const allPlaysForPlayer = plays.filter(p => (p.player_name || 'Anonymous') === name);
        
        playerStats.set(name, {
          rank: 0, // Will be set later
          player_name: name,
          best_score: play.points_earned,
          best_time_seconds: play.time_taken_seconds,
          best_accuracy: play.questions_total > 0 
            ? Math.round((play.questions_correct / play.questions_total) * 100)
            : null,
          total_plays: allPlaysForPlayer.length
        });
      }
    });

    // Convert to array and sort
    const leaderboard = Array.from(playerStats.values())
      .sort((a, b) => b.best_score - a.best_score)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        is_current_player: playerName && entry.player_name === playerName
      }));

    // Find current player's rank
    const currentPlayerEntry = playerName 
      ? leaderboard.find(e => e.player_name === playerName)
      : null;

    // Get top 15
    const topPlayers = leaderboard.slice(0, 15);

    // If current player is outside top 15, include them
    if (currentPlayerEntry && currentPlayerEntry.rank > 15) {
      return NextResponse.json({
        success: true,
        topPlayers,
        currentPlayer: currentPlayerEntry,
        totalPlayers: leaderboard.length
      });
    }

    return NextResponse.json({
      success: true,
      topPlayers,
      currentPlayer: currentPlayerEntry,
      totalPlayers: leaderboard.length
    });

  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
