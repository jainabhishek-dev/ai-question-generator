import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { StartSessionResponse, SubmitAnswerRequest, SubmitAnswerResponse, NextQuestionResponse, EndSessionResponse, LeaderboardEntry } from '@/types/liveQuiz';
import { broadcastSessionStarted, broadcastQuestionStarted, broadcastSessionEnded, broadcastAnswerSubmitted, broadcastQuestionEnded } from '@/lib/liveQuizService';
import type { QuizGameConfig } from '@/types/game';

// Helper type for accessing question answer fields
type QuestionWithAnswer = { correct_answer?: string; correctAnswer?: string; explanation?: string };

// Helper function to calculate points
function calculatePoints(
  isCorrect: boolean,
  difficulty: string,
  timeTaken: number,
  timeLimit: number,
  currentStreak: number
): number {
  if (!isCorrect) return 0;

  // Base points by difficulty
  const basePoints: Record<string, number> = {
    easy: 50,
    medium: 100,
    hard: 150
  };

  const base = basePoints[difficulty] || 100;

  // Speed bonus (0-50 points based on percentage of time remaining)
  const timePercentage = timeTaken / timeLimit;
  const speedBonus = Math.max(0, Math.round((1 - timePercentage) * 50));

  // Streak multiplier (1.0, 1.1, 1.2, 1.3, ...)
  const streakMultiplier = 1 + (currentStreak * 0.1);

  const total = Math.round((base + speedBonus) * streakMultiplier);
  return total;
}

// POST /api/live/sessions/[sessionId]/start
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Get authenticated user for host actions
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

    // START SESSION
    if (action === 'start') {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json<StartSessionResponse>(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Verify host ownership
      if (!supabaseAdmin) {
        return NextResponse.json<StartSessionResponse>(
          { success: false, error: 'Service configuration error' },
          { status: 503 }
        );
      }

      const { data: session, error: sessionError } = await supabaseAdmin
        .from('live_sessions')
        .select('*, games(config, difficulty)')
        .eq('id', sessionId)
        .eq('host_id', user.id)
        .single();

      if (sessionError || !session) {
        return NextResponse.json<StartSessionResponse>(
          { success: false, error: 'Session not found or access denied' },
          { status: 404 }
        );
      }

      if (session.status !== 'waiting') {
        return NextResponse.json<StartSessionResponse>(
          { success: false, error: 'Session already started or completed' },
          { status: 400 }
        );
      }

      // Update session status
      const startedAt = new Date().toISOString();
      const { data: updatedSession, error: updateError } = await supabaseAdmin
        .from('live_sessions')
        .update({
          status: 'active',
          started_at: startedAt,
          updated_at: startedAt
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (updateError) {
        console.error('Error starting session:', updateError);
        return NextResponse.json<StartSessionResponse>(
          { success: false, error: 'Failed to start session' },
          { status: 500 }
        );
      }

      // Broadcast session started
      try {
        await broadcastSessionStarted(sessionId, startedAt);
      } catch (broadcastError) {
        console.error('Error broadcasting session started:', broadcastError);
      }

      // Don't broadcast first question immediately - let clients navigate first
      // Instead, broadcast after a delay to ensure clients are subscribed
      try {
        // Broadcast in background after delay
        setTimeout(async () => {
          try {
            const gameConfig = session.games.config as QuizGameConfig;
            const firstQuestion = gameConfig.questions[0];
            const firstQuestionTimeLimit = firstQuestion.time_limit || gameConfig.settings.time_limit;
            await broadcastQuestionStarted(sessionId, 0, firstQuestionTimeLimit);
          } catch (broadcastError) {
            console.error('[API] Error broadcasting first question (delayed):', broadcastError);
          }
        }, 5000); // 5 second delay - enough time for countdown (4s) + navigation (1s)
        
      } catch (error) {
        console.error('[API] Error scheduling first question broadcast:', error);
      }

      return NextResponse.json<StartSessionResponse>({
        success: true,
        session: updatedSession
      });
    }

    // SUBMIT ANSWER
    if (action === 'answer') {
      const body: SubmitAnswerRequest = await req.json();
      const { participant_id, question_index, answer, time_taken } = body;

      if (!participant_id || question_index === undefined || !answer || time_taken === undefined) {
        return NextResponse.json<SubmitAnswerResponse>(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Check if supabaseAdmin is available
      if (!supabaseAdmin) {
        return NextResponse.json<SubmitAnswerResponse>(
          { success: false, error: 'Service configuration error' },
          { status: 503 }
        );
      }

      // Get session and game data
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('live_sessions')
        .select('*, games(config, difficulty)')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return NextResponse.json<SubmitAnswerResponse>(
          { success: false, error: 'Session not found' },
          { status: 404 }
        );
      }

      const gameConfig = session.games.config as QuizGameConfig;
      const currentQuestion = gameConfig.questions[question_index];

      if (!currentQuestion) {
        return NextResponse.json<SubmitAnswerResponse>(
          { success: false, error: 'Question not found' },
          { status: 404 }
        );
      }

      // Get participant
      const { data: participant, error: participantError } = await supabaseAdmin
        .from('live_participants')
        .select('*')
        .eq('id', participant_id)
        .eq('session_id', sessionId)
        .single();

      if (participantError || !participant) {
        return NextResponse.json<SubmitAnswerResponse>(
          { success: false, error: 'Participant not found' },
          { status: 404 }
        );
      }

      // Check if already answered this question
      const answers = participant.answers as Array<{question_index: number}>;
      const alreadyAnswered = answers.some(a => a.question_index === question_index);

      if (alreadyAnswered) {
        return NextResponse.json<SubmitAnswerResponse>(
          { success: false, error: 'Already answered this question' },
          { status: 400 }
        );
      }

      // Check if answer is correct
      const correctAnswer = (currentQuestion as QuestionWithAnswer).correct_answer || (currentQuestion as QuestionWithAnswer).correctAnswer;
      
      // Extract letter from MCQ format "A) text" -> "A"
      const extractLetter = (str: string) => {
        const match = str.trim().match(/^([A-Za-z])\)/);
        return match ? match[1].toUpperCase() : str.trim();
      };

      const normalizedAnswer = extractLetter(answer);
      const normalizedCorrect = extractLetter(correctAnswer || '');

      const isCorrect = normalizedAnswer.toLowerCase() === normalizedCorrect.toLowerCase();

      // Calculate new streak
      const newStreak = isCorrect ? participant.current_streak + 1 : 0;
      const newMaxStreak = Math.max(participant.max_streak, newStreak);

      // Calculate points
      const timeLimit = currentQuestion.time_limit || gameConfig.settings.time_limit;
      const pointsEarned = calculatePoints(
        isCorrect,
        session.games.difficulty || 'medium',
        time_taken,
        timeLimit,
        participant.current_streak
      );

      // Update participant
      const newAnswers = [
        ...answers,
        {
          question_index,
          answer,
          is_correct: isCorrect,
          time_taken,
          points_earned: pointsEarned,
          streak: newStreak
        }
      ];

      const { data: updatedParticipant, error: updateError } = await supabaseAdmin
        .from('live_participants')
        .update({
          score: participant.score + pointsEarned,
          correct_answers: participant.correct_answers + (isCorrect ? 1 : 0),
          current_streak: newStreak,
          max_streak: newMaxStreak,
          answers: newAnswers,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', participant_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating participant:', updateError);
        return NextResponse.json<SubmitAnswerResponse>(
          { success: false, error: 'Failed to submit answer' },
          { status: 500 }
        );
      }

      // Broadcast answer submitted event
      try {
        await broadcastAnswerSubmitted(sessionId, participant_id);
      } catch (broadcastError) {
        console.error('[API] Error broadcasting answer_submitted:', broadcastError);
        // Continue anyway - answer was saved successfully
      }

      // Check if all participants have answered
      try {
        // Fetch all active participants
        const { data: allParticipants, error: participantsError } = await supabaseAdmin
          .from('live_participants')
          .select('id, nickname, avatar, score, correct_answers, max_streak, answers')
          .eq('session_id', sessionId)
          .eq('is_active', true)
          .order('score', { ascending: false });

        if (participantsError || !allParticipants || allParticipants.length === 0) {
          // Don't broadcast if we can't fetch participants
          console.error('Error fetching participants for all-answered check:', participantsError);
        } else {
          // Check if ALL participants have answered this specific question
          const allAnswered = allParticipants.every(p => {
            const answers = p.answers as Array<{question_index: number}>;
            return answers.some(a => a.question_index === question_index);
          });

          if (allAnswered) {
            // Build leaderboard
            const leaderboard: LeaderboardEntry[] = allParticipants.map((p, index) => ({
              participant_id: p.id,
              nickname: p.nickname,
              avatar: p.avatar,
              score: p.score,
              correct_answers: p.correct_answers,
              max_streak: p.max_streak,
              rank: index + 1
            }));

            // Broadcast question ended
            await broadcastQuestionEnded(sessionId, question_index, leaderboard);
          }
        }
      } catch (allAnsweredError) {
        // Don't fail the request if broadcast fails
        console.error('Error checking/broadcasting all answered:', allAnsweredError);
      }

      return NextResponse.json<SubmitAnswerResponse>({
        success: true,
        participant: updatedParticipant,
        points_earned: pointsEarned,
        is_correct: isCorrect,
        correct_answer: (currentQuestion as QuestionWithAnswer).correct_answer || (currentQuestion as QuestionWithAnswer).correctAnswer,
        explanation: currentQuestion.explanation || undefined
      });
    }

    // NEXT QUESTION
    if (action === 'next') {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json<NextQuestionResponse>(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Verify host ownership
      if (!supabaseAdmin) {
        return NextResponse.json<NextQuestionResponse>(
          { success: false, error: 'Service configuration error' },
          { status: 503 }
        );
      }

      const { data: session, error: sessionError } = await supabaseAdmin
        .from('live_sessions')
        .select('*, games(config)')
        .eq('id', sessionId)
        .eq('host_id', user.id)
        .single();

      if (sessionError || !session) {
        return NextResponse.json<NextQuestionResponse>(
          { success: false, error: 'Session not found or access denied' },
          { status: 404 }
        );
      }

      const gameConfig = session.games.config as QuizGameConfig;
      const nextQuestionIndex = session.current_question_index + 1;
      const isLastQuestion = nextQuestionIndex >= gameConfig.questions.length;

      if (isLastQuestion) {
        // End session
        const completedAt = new Date().toISOString();
        const startedAt = new Date(session.started_at!);
        const sessionDuration = Math.round((new Date(completedAt).getTime() - startedAt.getTime()) / 1000);

        // Get final rankings
        const { data: participants } = await supabaseAdmin
          .from('live_participants')
          .select('*')
          .eq('session_id', sessionId)
          .eq('is_active', true)
          .order('score', { ascending: false });

        const finalRankings = (participants || []).map((p, index) => ({
          participant_id: p.id,
          nickname: p.nickname,
          avatar: p.avatar,
          score: p.score,
          correct_answers: p.correct_answers,
          max_streak: p.max_streak,
          rank: index + 1
        }));

        // Update participant ranks
        for (const ranking of finalRankings) {
          await supabaseAdmin
            .from('live_participants')
            .update({ final_rank: ranking.rank })
            .eq('id', ranking.participant_id);
        }

        // Calculate statistics
        const totalParticipants = participants?.length || 0;
        const averageScore = totalParticipants > 0
          ? participants!.reduce((sum, p) => sum + p.score, 0) / totalParticipants
          : 0;
        const completionRate = totalParticipants > 0
          ? (participants!.filter(p => p.answers.length === gameConfig.questions.length).length / totalParticipants) * 100
          : 0;

        // Update session
        const { data: updatedSession, error: updateError } = await supabaseAdmin
          .from('live_sessions')
          .update({
            status: 'completed',
            completed_at: completedAt,
            total_participants: totalParticipants,
            average_score: averageScore,
            completion_rate: completionRate,
            session_duration_seconds: sessionDuration,
            updated_at: completedAt
          })
          .eq('id', sessionId)
          .select()
          .single();

        if (updateError) {
          console.error('Error ending session:', updateError);
        }

        // Broadcast session ended
        try {
          await broadcastSessionEnded(sessionId, completedAt, finalRankings);
        } catch (broadcastError) {
          console.error('Error broadcasting session ended:', broadcastError);
        }

        return NextResponse.json<NextQuestionResponse>({
          success: true,
          session: updatedSession,
          is_last_question: true
        });
      }

      // Move to next question
      const nextQuestion = gameConfig.questions[nextQuestionIndex];
      const { data: updatedSession, error: updateError } = await supabaseAdmin
        .from('live_sessions')
        .update({
          current_question_index: nextQuestionIndex,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (updateError) {
        console.error('Error moving to next question:', updateError);
        return NextResponse.json<NextQuestionResponse>(
          { success: false, error: 'Failed to move to next question' },
          { status: 500 }
        );
      }

      // Broadcast question started
      try {
        const timeLimit = nextQuestion.time_limit || gameConfig.settings.time_limit;
        await broadcastQuestionStarted(sessionId, nextQuestionIndex, timeLimit);
      } catch (broadcastError) {
        console.error('Error broadcasting question started:', broadcastError);
      }

      return NextResponse.json<NextQuestionResponse>({
        success: true,
        session: updatedSession,
        is_last_question: false
      });
    }

    // END SESSION (manual end by host)
    if (action === 'end') {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json<EndSessionResponse>(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Verify host ownership
      if (!supabaseAdmin) {
        return NextResponse.json<EndSessionResponse>(
          { success: false, error: 'Service configuration error' },
          { status: 503 }
        );
      }

      const { data: session, error: sessionError } = await supabaseAdmin
        .from('live_sessions')
        .select('*, games(config)')
        .eq('id', sessionId)
        .eq('host_id', user.id)
        .single();

      if (sessionError || !session) {
        return NextResponse.json<EndSessionResponse>(
          { success: false, error: 'Session not found or access denied' },
          { status: 404 }
        );
      }

      const completedAt = new Date().toISOString();
      const startedAt = session.started_at ? new Date(session.started_at) : new Date();
      const sessionDuration = Math.round((new Date(completedAt).getTime() - startedAt.getTime()) / 1000);

      // Get final rankings
      const { data: participants } = await supabaseAdmin
        .from('live_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .order('score', { ascending: false });

      const finalRankings = (participants || []).map((p, index) => ({
        participant_id: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        score: p.score,
        correct_answers: p.correct_answers,
        max_streak: p.max_streak,
        rank: index + 1
      }));

      // Update participant ranks
      for (const ranking of finalRankings) {
        await supabaseAdmin
          .from('live_participants')
          .update({ final_rank: ranking.rank })
          .eq('id', ranking.participant_id);
      }

      const gameConfig = session.games.config as QuizGameConfig;
      const totalParticipants = participants?.length || 0;
      const averageScore = totalParticipants > 0
        ? participants!.reduce((sum, p) => sum + p.score, 0) / totalParticipants
        : 0;
      const completionRate = totalParticipants > 0
        ? (participants!.filter(p => p.answers.length === gameConfig.questions.length).length / totalParticipants) * 100
        : 0;

      // Update session
      const { data: updatedSession, error: updateError } = await supabaseAdmin
        .from('live_sessions')
        .update({
          status: 'completed',
          completed_at: completedAt,
          total_participants: totalParticipants,
          average_score: averageScore,
          completion_rate: completionRate,
          session_duration_seconds: sessionDuration,
          updated_at: completedAt
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (updateError) {
        console.error('Error ending session:', updateError);
        return NextResponse.json<EndSessionResponse>(
          { success: false, error: 'Failed to end session' },
          { status: 500 }
        );
      }

      // Broadcast session ended
      try {
        await broadcastSessionEnded(sessionId, completedAt, finalRankings);
      } catch (broadcastError) {
        console.error('Error broadcasting session ended:', broadcastError);
      }

      return NextResponse.json<EndSessionResponse>({
        success: true,
        session: updatedSession,
        final_rankings: finalRankings
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in session control API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
