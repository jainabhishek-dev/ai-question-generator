import { NextRequest, NextResponse } from 'next/server';
import { generateQuizGame } from '@/lib/gemini';
import { createGame } from '@/lib/gameDatabase';
import { cleanJsonText } from '@/lib/jsonCleaner';
import { quizGameSchema } from '@/lib/questionSchema';
import { QuizGameConfig, QuizQuestion, Difficulty } from '@/types/game';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Interface for AI-generated quiz response (may have flat or nested structure)
interface ParsedQuizResponse {
  questions: QuizQuestion[];
  settings?: {
    time_limit: number;
    hints_enabled: boolean;
    show_explanations: boolean;
  };
  // Optional flat structure fields (backward compatibility)
  time_limit?: number;
  hints_enabled?: boolean;
  show_explanations?: boolean;
  // Game metadata
  title?: string;
  description?: string;
  topic?: string;
  difficulty?: Difficulty;
  subject?: string;
  grade_level?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      topic,
      subject,
      grade,
      difficulty = 'medium',
      numberOfQuestions = 10,
      numMcq = numberOfQuestions,
      numTrueFalse = 0,
      numFib = 0,
      timeLimit = 300,
      enableImages = false,
      isPublic = true,
      allowAnonymousPlay = true
    } = body;

    if (!topic || !topic.trim()) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    const trimmedTopic = topic.trim();
    if (trimmedTopic.length < 2) {
      return NextResponse.json(
        { error: 'Topic must be at least 2 characters long' },
        { status: 400 }
      );
    }
    if (trimmedTopic.length > 100) {
      return NextResponse.json(
        { error: 'Topic must not exceed 100 characters' },
        { status: 400 }
      );
    }

    // Validate distribution
    if (numMcq + numTrueFalse + numFib !== numberOfQuestions) {
      return NextResponse.json(
        { error: 'Question type distribution must equal total number of questions' },
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
        { error: 'Authentication required to create games' },
        { status: 401 }
      );
    }

    // Generate quiz game config using AI
    console.log('🎮 Generating quiz game:', { topic, subject, grade, difficulty, numberOfQuestions, distribution: { mcq: numMcq, trueFalse: numTrueFalse, fib: numFib } });
    const aiResponse = await generateQuizGame(
      topic,
      subject,
      grade,
      difficulty,
      numberOfQuestions,
      timeLimit,
      enableImages,
      { mcq: numMcq, trueFalse: numTrueFalse, fib: numFib }
    );

    // Parse AI response
    const cleanedJson = cleanJsonText(aiResponse);
    let parsedConfig;
    try {
      const raw = JSON.parse(cleanedJson);
      parsedConfig = quizGameSchema.parse(raw);
    } catch (error) {
      console.error('Failed to parse AI response:', cleanedJson.substring(0, 500));
      console.error('Parse error:', error);
      return NextResponse.json(
        { error: 'Failed to generate valid quiz configuration' },
        { status: 500 }
      );
    }
    
    if (!parsedConfig || typeof parsedConfig !== 'object') {
      console.error('Invalid parsed config:', parsedConfig);
      return NextResponse.json(
        { error: 'Failed to generate valid quiz configuration' },
        { status: 500 }
      );
    }

    // Validate config structure
    const config = parsedConfig as ParsedQuizResponse;
    if (!config.questions || !Array.isArray(config.questions) || config.questions.length === 0) {
      console.error('Invalid quiz config - no questions:', config);
      return NextResponse.json(
        { error: 'Generated quiz has no questions' },
        { status: 500 }
      );
    }

    // Apply per-question time limit to all generated questions
    const questionsWithTime = config.questions.map(q => ({
      ...q,
      time_limit: timeLimit || 30 // Apply the per-question time
    }));

    // Transform flat structure to nested structure if needed (backward compatibility)
    let quizConfig: QuizGameConfig;
    if (!config.settings && (config.time_limit || config.hints_enabled !== undefined)) {
      // Old flat structure - transform to new nested structure
      console.log('🔄 Transforming flat config to nested structure');
      quizConfig = {
        questions: questionsWithTime,
        settings: {
          time_limit: timeLimit || 30, // Store as default per-question time
          hints_enabled: config.hints_enabled !== undefined ? config.hints_enabled : true,
          show_explanations: config.show_explanations !== undefined ? config.show_explanations : true
        }
      };
    } else {
      // Already has correct structure
      quizConfig = {
        ...config,
        questions: questionsWithTime,
        settings: {
          ...config.settings,
          time_limit: timeLimit || 30
        }
      } as QuizGameConfig;
    }

    // Create game in database
    const gameResult = await createGame(
      {
        title: config.title || `${topic.slice(0, 195)} Quiz`,
        description: config.description || `Test your knowledge about ${topic}`,
        topic: config.topic || topic,
        game_type: 'quiz',
        difficulty: config.difficulty || difficulty,
        subject: config.subject || subject || undefined,
        grade_level: config.grade_level || grade || undefined,
        config: quizConfig, // Use transformed config
        is_public: isPublic,
        allow_anonymous_play: allowAnonymousPlay,
        tags: subject ? [subject, topic] : [topic]
      },
      user.id,
      supabase // Pass the authenticated client
    );

    if (!gameResult.success || !gameResult.data) {
      console.error('Failed to create game:', gameResult.error);
      return NextResponse.json(
        { error: gameResult.error || 'Failed to create game' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      gameId: gameResult.data.id,
      shareCode: gameResult.data.share_code,
      game: gameResult.data
    });

  } catch (error) {
    console.error('Error in generate-quiz API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
