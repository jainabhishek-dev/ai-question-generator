import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Type for top scores entry
interface TopScoreEntry {
  player_name: string;
  best_score: number;
  best_time_seconds: number | null;
  best_accuracy: number | null;
  total_plays: number;
  perfect_score_count: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }

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
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch game and verify ownership
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Verify user owns this game
    if (game.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this game' },
        { status: 403 }
      );
    }

    // Fetch analytics data in parallel
    const [overviewResult, recentPlaysResult, topScoresResult, performanceResult, insightsResult] = await Promise.all([
      // Overview stats
      supabase.rpc('get_game_overview_stats', { game_id_param: gameId }),
      
      // Recent plays (last 20)
      supabase
        .from('game_plays')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false })
        .limit(20),
      
      // Top scores by player name (all plays for grouping)
      supabase
        .from('game_plays')
        .select('player_name, user_id, points_earned, time_taken_seconds, questions_correct, questions_total, created_at')
        .eq('game_id', gameId)
        .not('points_earned', 'is', null)
        .order('points_earned', { ascending: false }),
      
      // Performance data - score distribution
      supabase.rpc('get_score_distribution', { game_id_param: gameId }),
      
      // Player insights
      supabase.rpc('get_player_insights', { game_id_param: gameId })
    ]);

    // Check if RPC functions exist, if not calculate manually
    let overviewStats;
    if (overviewResult.error && overviewResult.error.message.includes('function')) {
      // Calculate manually if RPC doesn't exist
      const { data: plays } = await supabase
        .from('game_plays')
        .select('*')
        .eq('game_id', gameId);

      const totalPlays = plays?.length || 0;
      // Count unique players by player_name (with fallback to session_id for unnamed anonymous)
      const uniquePlayers = plays ? 
        new Set(plays.map(p => {
          // Priority: player_name > session_id (for unnamed anonymous) > user_id
          if (p.player_name) return `name_${p.player_name}`;
          if (!p.user_id) return `session_${p.session_id}`;
          return `user_${p.user_id}`;
        })).size : 
        0;
      const completedPlays = plays?.filter(p => p.completed) || [];
      const completionRate = totalPlays > 0 ? (completedPlays.length / totalPlays) * 100 : 0;
      const avgScore = plays && plays.length > 0
        ? plays.reduce((sum, p) => sum + (p.points_earned || 0), 0) / plays.length
        : 0;
      const avgTime = plays && plays.length > 0
        ? plays.reduce((sum, p) => sum + (p.time_taken_seconds || 0), 0) / plays.length
        : 0;

      overviewStats = {
        total_plays: totalPlays,
        unique_players: uniquePlayers,
        completion_rate: Math.round(completionRate),
        avg_score: Math.round(avgScore),
        avg_time: Math.round(avgTime)
      };
    } else {
      overviewStats = overviewResult.data || {};
    }

    // Score distribution - calculate manually if RPC doesn't exist
    let scoreDistribution = [];
    if (performanceResult.error && performanceResult.error.message.includes('function')) {
      const { data: plays } = await supabase
        .from('game_plays')
        .select('points_earned')
        .eq('game_id', gameId)
        .not('points_earned', 'is', null);

      // Group by 100-point buckets
      const buckets: { [key: string]: number } = {};
      plays?.forEach(play => {
        const bucket = Math.floor((play.points_earned || 0) / 100) * 100;
        const key = `${bucket}-${bucket + 99}`;
        buckets[key] = (buckets[key] || 0) + 1;
      });

      scoreDistribution = Object.entries(buckets).map(([range, count]) => ({
        range,
        count
      }));
    } else {
      scoreDistribution = performanceResult.data || [];
    }

    // Player insights - calculate manually if RPC doesn't exist
    let playerInsights;
    if (insightsResult.error && insightsResult.error.message.includes('function')) {
      const { data: plays } = await supabase
        .from('game_plays')
        .select('time_taken_seconds, questions_total, hints_used, lives_remaining')
        .eq('game_id', gameId)
        .not('questions_total', 'is', null)
        .gt('questions_total', 0);

      const avgTimePerQuestion = plays && plays.length > 0
        ? plays.reduce((sum, p) => sum + ((p.time_taken_seconds || 0) / (p.questions_total || 1)), 0) / plays.length
        : 0;
      const avgHintsUsed = plays && plays.length > 0
        ? plays.reduce((sum, p) => sum + (p.hints_used || 0), 0) / plays.length
        : 0;
      const avgLivesRemaining = plays && plays.length > 0
        ? plays.reduce((sum, p) => sum + (p.lives_remaining || 0), 0) / plays.length
        : 0;
      const hintsUsageRate = plays && plays.length > 0
        ? (plays.filter(p => (p.hints_used || 0) > 0).length / plays.length) * 100
        : 0;

      playerInsights = {
        avg_time_per_question: Math.round(avgTimePerQuestion),
        avg_hints_used: Math.round(avgHintsUsed * 10) / 10,
        avg_lives_remaining: Math.round(avgLivesRemaining * 10) / 10,
        hints_usage_rate: Math.round(hintsUsageRate)
      };
    } else {
      playerInsights = insightsResult.data || {};
    }

    // Process top scores - group by player_name and get best score for each
    const topScoresData = topScoresResult.data || [];
    const topScoresMap: { [key: string]: TopScoreEntry } = {};
    
    topScoresData.forEach(play => {
      const playerKey = play.player_name || 'Anonymous';
      
      if (!topScoresMap[playerKey] || play.points_earned > topScoresMap[playerKey].best_score) {
        const totalPlaysForPlayer = topScoresData.filter(p => (p.player_name || 'Anonymous') === playerKey).length;
        const perfectScoresForPlayer = topScoresData.filter(p => 
          (p.player_name || 'Anonymous') === playerKey && 
          p.questions_correct === p.questions_total &&
          p.questions_total > 0
        ).length;
        
        topScoresMap[playerKey] = {
          player_name: playerKey,
          best_score: play.points_earned,
          best_time_seconds: play.time_taken_seconds,
          best_accuracy: play.questions_total && play.questions_total > 0
            ? Math.round((play.questions_correct / play.questions_total) * 100)
            : null,
          total_plays: totalPlaysForPlayer,
          perfect_score_count: perfectScoresForPlayer
        };
      }
    });
    
    const topScores = Object.values(topScoresMap)
      .sort((a, b) => b.best_score - a.best_score)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        game,
        overview: overviewStats,
        recentPlays: recentPlaysResult.data || [],
        topScores: topScores,
        scoreDistribution,
        playerInsights
      }
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
