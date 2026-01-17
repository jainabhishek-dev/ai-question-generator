import { NextRequest, NextResponse } from 'next/server';
import { createGame } from '@/lib/gameDatabase';
import { QuizGameConfig, QuizQuestion, Difficulty } from '@/types/game';
import { GeneratedQuestion } from '@/lib/database';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      questions,
      difficulty = 'medium',
      timeLimit = 300,
      isPublic = true,
      allowAnonymousPlay = true
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'At least one question is required' },
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

    // Helper function to normalize question type
    const normalizeQuestionType = (type: string): 'MCQ' | 'True/False' | 'FIB' => {
      const lowerType = type.toLowerCase();
      if (lowerType.includes('true') || lowerType.includes('false') || lowerType === 't/f') {
        return 'True/False';
      } else if (lowerType.includes('fill') || lowerType === 'fib') {
        return 'FIB';
      } else {
        return 'MCQ';
      }
    };

    // Convert GeneratedQuestion[] to QuizQuestion[]
    const typedQuestions = questions as (GeneratedQuestion & { question_id?: number })[];
    
    // Filter for quiz-compatible question types
    const quizCompatibleTypes = ['mcq', 'multiple-choice', 'true/false', 'true-false', 't/f', 'fill in the blank', 'fill-in-the-blank', 'fib'];
    const quizQuestions: QuizQuestion[] = typedQuestions
      .filter(q => {
        const type = q.type?.toLowerCase();
        return quizCompatibleTypes.includes(type);
      })
      .map(q => {
        const questionType = normalizeQuestionType(q.type);
        return {
          question: q.question,
          question_type: questionType,
          options: questionType === 'FIB' ? undefined : q.options || [],
          correct_answer: q.correctAnswer,
          explanation: q.explanation || '',
          difficulty: difficulty as Difficulty,
          points: 100,
          hint: undefined,
          question_id: q.question_id,
          case_sensitive: questionType === 'FIB' ? false : undefined
        };
      });

    if (quizQuestions.length === 0) {
      return NextResponse.json(
        { error: 'No quiz-compatible questions found. Quiz games support MCQ, True/False, and Fill in the Blank questions.' },
        { status: 400 }
      );
    }

    // Build quiz config
    const config: QuizGameConfig = {
      questions: quizQuestions,
      settings: {
        time_limit: timeLimit,
        lives: 3,
        hints_enabled: false,
        show_explanations: true
      }
    };

    console.log('🎮 Quiz config being saved:', JSON.stringify(config, null, 2));
    console.log('📝 Sample question with question_id:', quizQuestions[0]);

    // Create game in database
    const gameResult = await createGame(
      {
        title: title,
        description: description || `Quiz game with ${quizQuestions.length} questions`,
        topic: 'Mixed Topics',
        game_type: 'quiz',
        difficulty: difficulty as Difficulty,
        subject: undefined,
        grade_level: undefined,
        config: config,
        is_public: isPublic,
        allow_anonymous_play: allowAnonymousPlay,
        tags: ['quiz']
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

    console.log('✅ Game created successfully');
    console.log('🔍 Game config from database:', JSON.stringify(gameResult.data.config, null, 2));
    const quizConfig = gameResult.data.config as QuizGameConfig;
    console.log('📝 Sample question from saved config:', quizConfig.questions?.[0]);

    return NextResponse.json({
      success: true,
      gameId: gameResult.data.id,
      shareCode: gameResult.data.share_code,
      game: gameResult.data
    });

  } catch (error) {
    console.error('Error in convert-questions API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
