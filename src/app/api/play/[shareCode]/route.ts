import { NextRequest, NextResponse } from 'next/server';
import { getGameByShareCode } from '@/lib/gameDatabase';
import { Game, QuizGameConfig, QuizQuestion } from '@/types/game';

// Type for legacy flat quiz config
interface LegacyQuizConfig {
  questions?: QuizQuestion[];
  settings?: QuizGameConfig['settings'];
  time_limit?: number;
  lives?: number;
  hints_enabled?: boolean;
  show_explanations?: boolean;
}

// Helper function to transform old flat config to new nested structure
function transformQuizConfig(game: Game): Game {
  if (game.game_type !== 'quiz') return game;

  const config = game.config as LegacyQuizConfig;
  
  // Check if already has correct structure
  if (config.settings) return game;

  // Transform flat structure to nested
  if (config.time_limit !== undefined || config.lives !== undefined || config.hints_enabled !== undefined) {
    console.log('🔄 Transforming flat quiz config to nested structure');
    const transformedConfig: QuizGameConfig = {
      questions: config.questions || [],
      settings: {
        time_limit: config.time_limit || 300,
        hints_enabled: config.hints_enabled !== undefined ? config.hints_enabled : true,
        show_explanations: config.show_explanations !== undefined ? config.show_explanations : true
      }
    };

    return {
      ...game,
      config: transformedConfig
    };
  }

  return game;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  try {
    const { shareCode } = await params;

    if (!shareCode) {
      return NextResponse.json(
        { error: 'Share code is required' },
        { status: 400 }
      );
    }

    const result = await getGameByShareCode(shareCode);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch game' },
        { status: 500 }
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Transform old config structure if needed
    const transformedGame = transformQuizConfig(result.data);

    return NextResponse.json({
      success: true,
      game: transformedGame
    });

  } catch (error) {
    console.error('Error in game fetch API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
