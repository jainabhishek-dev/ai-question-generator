'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getLiveQuizService } from '@/lib/liveQuizService';
import type { LiveSession, LiveParticipant, LeaderboardEntry } from '@/types/liveQuiz';
import type { QuizGameConfig, QuizQuestion } from '@/types/game';
import LoadingSpinner from '@/components/LoadingSpinner';
import LiveLeaderboard from '@/components/live/LiveLeaderboard';
import Podium from '@/components/live/Podium';
import ImageRenderer from '@/components/ImageRenderer';
import { Clock, Users, ChevronRight } from 'lucide-react';

export default function HostControlPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<LiveSession | null>(null);
  const [gameConfig, setGameConfig] = useState<QuizGameConfig | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showPodium, setShowPodium] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [participantsAnswered, setParticipantsAnswered] = useState<Set<string>>(new Set());

  const gameConfigRef = useRef<QuizGameConfig | null>(null);

  // Update ref when gameConfig changes
  useEffect(() => {
    gameConfigRef.current = gameConfig;
  }, [gameConfig]);

  useEffect(() => {
    if (!sessionId) return;

    const liveService = getLiveQuizService();

    const fetchData = async () => {
      // Fetch session with game config
      const { data: sessionData, error: sessionError } = await supabase
        .from('live_sessions')
        .select('*, games(config)')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error('Error fetching session:', sessionError);
        setLoading(false);
        return;
      }

      setSession(sessionData);
      const config = sessionData.games.config as QuizGameConfig;
      setGameConfig(config);
      setCurrentQuestion(config.questions[sessionData.current_question_index]);
      setCurrentQuestionIndex(sessionData.current_question_index);

      // Set initial timer - will be overridden by broadcast if it arrives
      const questionTimeLimit = config.questions[sessionData.current_question_index]?.time_limit || config.settings.time_limit;
      console.log('[HOST] Setting initial timer from database:', questionTimeLimit);
      setTimeRemaining(questionTimeLimit);

      // If session is active and we have participants, timer should be running
      if (sessionData.status === 'active') {
        console.log('[HOST] Session is active, timer will start automatically');
      }

      // Fetch participants
      const { data: participantsData } = await supabase
        .from('live_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .order('score', { ascending: false });

      if (participantsData) {
        setParticipants(participantsData);
      }

      console.log('[HOST] Session loaded:', {
        session_id: sessionData.id,
        current_question_index: sessionData.current_question_index,
        participant_count: participantsData?.length || 0,
        config_loaded: !!config
      });

      setLoading(false);
    };

    fetchData();

    // Join realtime channel
    liveService.joinSession(sessionId);

    // Set up ALL event listeners BEFORE subscribing
    // Subscribe to broadcast events for participant answers
    liveService.subscribeToEvents('answer_submitted', (event) => {
      console.log('[HOST] 📝 answer_submitted broadcast received:', event);
      const payload = event.payload as { participant_id: string };
      
      // Track this participant as answered
      setParticipantsAnswered(prev => {
        const updated = new Set(prev).add(payload.participant_id);
        console.log('[HOST] Participant answered:', {
          participant_id: payload.participant_id,
          total_answered: updated.size,
          total_participants: participants.length
        });
        return updated;
      });
      
      // Refresh participants for updated scores
      const fetchParticipants = async () => {
        const { data } = await supabase
          .from('live_participants')
          .select('*')
          .eq('session_id', sessionId)
          .eq('is_active', true)
          .order('score', { ascending: false });
        
        if (data) {
          setParticipants(data);
        }
      };
      fetchParticipants();
    });

    // Subscribe to question started event for timer sync
    liveService.subscribeToEvents('question_started', (event) => {
      const payload = event.payload as { question_index: number; timer_duration: number };
      console.log('[HOST] 🎯 question_started broadcast received:', payload);
      const config = gameConfigRef.current;
      
      console.log('[HOST] gameConfig available:', !!config);
      
      if (config) {
        const newQuestion = config.questions[payload.question_index];
        console.log('[HOST] Loading question:', {
          index: payload.question_index,
          timer: payload.timer_duration,
          question_type: newQuestion?.question_type,
          has_options: !!(newQuestion?.options)
        });
        
        // Update question index state (primitive, safe)
        setCurrentQuestionIndex(payload.question_index);
        setCurrentQuestion(newQuestion);
        
        // Update timer and reset countdown state
        setTimeRemaining(payload.timer_duration);
        setShowLeaderboard(false);
        setParticipantsAnswered(new Set()); // Reset for new question
        
        console.log('[HOST] ✅ Question loaded and timer set to:', payload.timer_duration);
      } else {
        console.error('[HOST] ❌ gameConfig is null, cannot load question');
      }
    });

    // Subscribe to session ended event
    liveService.subscribeToEvents('session_ended', (event) => {
      console.log('Session ended event received');
      setShowPodium(true);
    });

    // NOW subscribe the channel (only once)
    liveService.subscribe();

    return () => {
      liveService.leaveSession();
    };
  }, [sessionId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) {
      console.log('[HOST] [TIMER] Timer stopped: timeRemaining is', timeRemaining);
      return;
    }
    
    if (showLeaderboard) {
      console.log('[HOST] [TIMER] Timer stopped: showLeaderboard is', showLeaderboard);
      return;
    }

    console.log('[HOST] [TIMER] Starting timer for question', currentQuestionIndex, 'at', timeRemaining, 'seconds');

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          console.log('[HOST] [TIMER] ⏰ Timer expired, showing leaderboard');
          setShowLeaderboard(true);
          return 0;
        }
        if (prev % 5 === 0) {
          console.log('[HOST] [TIMER] Countdown:', prev - 1);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      console.log('[HOST] [TIMER] Cleaning up timer');
      clearInterval(timer);
    };
  }, [currentQuestionIndex, showLeaderboard, timeRemaining]); // Restart when timer changes

  const handleNextQuestion = async () => {
    if (!session || !gameConfig) return;

    console.log('[HOST] 🔄 Next question button clicked');
    setShowLeaderboard(false);

    try {
      const response = await fetch(`/api/live/sessions/${sessionId}?action=next`, {
        method: 'POST'
      });

      const data = await response.json();
      console.log('[HOST] Next question API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to move to next question');
      }

      if (data.is_last_question) {
        console.log('[HOST] 🏁 Last question completed, showing podium');
        setShowPodium(true);
      } else {
        console.log('[HOST] ⏳ Waiting for question_started broadcast...');
      }
      // DON'T update local state here - let the broadcast handler do it
      // The question_started broadcast will trigger the timer restart
    } catch (err) {
      console.error('[HOST] ❌ Error moving to next question:', err);
      alert(err instanceof Error ? err.message : 'Failed to move to next question');
    }
  };

  const getLeaderboard = (): LeaderboardEntry[] => {
    return participants.map((p, index) => ({
      participant_id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score,
      correct_answers: p.correct_answers,
      max_streak: p.max_streak,
      rank: index + 1
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <LoadingSpinner title="Loading Quiz..." message="Preparing quiz questions..." />
      </div>
    );
  }

  if (showPodium) {
    return <Podium rankings={getLeaderboard()} />;
  }

  if (!session || !gameConfig || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <p className="text-white text-xl">Session error</p>
      </div>
    );
  }

  const isLastQuestion = session.current_question_index === gameConfig.questions.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Question */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Users className="w-6 h-6 text-white" />
                <span className="text-white font-semibold">
                  {participants.length} Players
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-white font-semibold">
                  Question {session.current_question_index + 1} / {gameConfig.questions.length}
                </span>
              </div>
            </div>

            {/* Timer */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-6">
              <div className="flex items-center justify-center gap-4 mb-6">
                <Clock className="w-8 h-8 text-blue-600" />
                <div className={`text-6xl font-bold ${timeRemaining <= 5 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
                  {timeRemaining}s
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    timeRemaining <= 5 ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${(timeRemaining / (currentQuestion.time_limit || gameConfig.settings.time_limit)) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Question Card or Leaderboard Overlay */}
            {showLeaderboard ? (
              /* Full-screen Leaderboard Overlay */
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-3xl w-full">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                    Leaderboard
                  </h2>
                  <LiveLeaderboard
                    entries={getLeaderboard()}
                    title=""
                  />
                  <button
                    onClick={handleNextQuestion}
                    className="mt-8 w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xl font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                  >
                    {isLastQuestion ? 'Show Final Results' : 'Next Question'}
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : (
              /* Question Display */
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
                <div className="mb-6">
                  <ImageRenderer content={currentQuestion.question} className="text-2xl font-bold text-gray-900 dark:text-white" />
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {(currentQuestion.options || []).map((option, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-100 dark:bg-gray-700 rounded-xl"
                    >
                      <ImageRenderer content={option} className="text-lg text-gray-900 dark:text-white" />
                    </div>
                  ))}
                </div>

                {/* Show FIB indicator if no options */}
                {!currentQuestion.options && (
                  <p className="mt-4 text-center text-gray-500 dark:text-gray-400 italic">
                    Fill in the Blank Question - Players are typing their answers...
                  </p>
                )}

                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                  {participantsAnswered.size} / {participants.length} players answered
                  {participantsAnswered.size === participants.length && participants.length > 0 && ' - All done!'}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar - Live Standings (Hidden when leaderboard overlay is shown) */}
          {!showLeaderboard && (
            <div className="lg:col-span-1">
              <LiveLeaderboard
                entries={getLeaderboard()}
                title="Live Standings"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
