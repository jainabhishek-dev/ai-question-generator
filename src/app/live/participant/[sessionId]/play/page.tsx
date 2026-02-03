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
import AudioControl from '@/components/live/AudioControl';
import { soundService } from '@/lib/soundService';
import { Clock, TrophyIcon, Loader2 } from 'lucide-react';

export default function ParticipantQuizPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<LiveSession | null>(null);
  const [gameConfig, setGameConfig] = useState<QuizGameConfig | null>(null);
  const [participant, setParticipant] = useState<LiveParticipant | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lastPointsEarned, setLastPointsEarned] = useState(0);
  const [showPodium, setShowPodium] = useState(false);
  const [waitingForNext, setWaitingForNext] = useState(false);

  const participantIdRef = useRef<string | null>(null);
  const gameConfigRef = useRef<QuizGameConfig | null>(null);

  // Update ref when gameConfig changes
  useEffect(() => {
    gameConfigRef.current = gameConfig;
  }, [gameConfig]);

  // Start layered background music on mount
  useEffect(() => {
    soundService.startBackgroundMusic();
    
    return () => {
      soundService.stopBackgroundMusic();
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    // Get participant ID from session storage
    const storedParticipantId = sessionStorage.getItem('live_participant_id');
    if (!storedParticipantId) {
      router.push('/live/join');
      return;
    }

    participantIdRef.current = storedParticipantId;

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

      // Start timer for current question
      const questionTimeLimit = config.questions[sessionData.current_question_index]?.time_limit || config.settings.time_limit;
      setTimeRemaining(questionTimeLimit);

      // Fetch participant
      const { data: participantData } = await supabase
        .from('live_participants')
        .select('*')
        .eq('id', storedParticipantId)
        .single();

      if (participantData) {
        setParticipant(participantData);
      }

      // Fetch all participants for leaderboard
      const { data: participantsData } = await supabase
        .from('live_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .order('score', { ascending: false });

      if (participantsData) {
        setParticipants(participantsData);
      }

      setLoading(false);
    };

    fetchData();

    // Join realtime channel
    liveService.joinSession(sessionId);

    // Set up ALL event listeners BEFORE subscribing
    // Subscribe to question started events
    liveService.subscribeToEvents('question_started', (event) => {
      const payload = event.payload as { question_index: number; timer_duration: number };
      const config = gameConfigRef.current;
      
      // Play question start sound
      soundService.playClick();
      
      if (config) {
        const newQuestion = config.questions[payload.question_index];
        
        // Update question index state (primitive, safe)
        setCurrentQuestionIndex(payload.question_index);
        
        setCurrentQuestion(newQuestion);
        setTimeRemaining(payload.timer_duration);
        setSelectedAnswer('');
        setHasAnswered(false);
        setSubmitting(false); // Reset submitting state for new question
        setShowLeaderboard(false);
        setWaitingForNext(false);
      } else {
        console.error('[PARTICIPANT] gameConfig is null, cannot load question');
      }
    });

    // Subscribe to session ended events
    liveService.subscribeToEvents('session_ended', async () => {
      // Stop layered background music
      soundService.stopBackgroundMusic();
      
      // Play celebration sound instead of game complete
      soundService.playCelebration();
      
      // Fetch the latest participant data for accurate podium
      const { data: finalParticipants } = await supabase
        .from('live_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .order('score', { ascending: false });
      
      if (finalParticipants) {
        setParticipants(finalParticipants);
      }
      
      setShowPodium(true);
    });

    // Subscribe to question ended event (all participants answered)
    liveService.subscribeToEvents('question_ended', async (event) => {
      const payload = event.payload as { question_index: number; leaderboard: LeaderboardEntry[] };
      
      // Play leaderboard sound
      soundService.playPoints(100);
      
      // Fetch latest participant data for accurate display
      const { data: updatedParticipants } = await supabase
        .from('live_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .order('score', { ascending: false });

      if (updatedParticipants) {
        setParticipants(updatedParticipants);
      }
      
      // Show leaderboard immediately
      setShowLeaderboard(true);
      setWaitingForNext(true);
    });

    // NOW subscribe the channel (only once)
    liveService.subscribe();

    return () => {
      liveService.leaveSession();
    };
  }, [sessionId, router]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0 || showLeaderboard) {
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        // Timer warning at 5 seconds
        if (prev === 5) {
          soundService.playTick();
        }
        
        if (prev <= 1) {
          // Play leaderboard sound
          soundService.playPoints(100);
          setShowLeaderboard(true);
          setWaitingForNext(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [currentQuestionIndex, showLeaderboard, timeRemaining]);

  const handleAnswerSelect = async (answer: string) => {
    if (hasAnswered || submitting || !participant || !currentQuestion || !session) return;

    setSelectedAnswer(answer);
    setSubmitting(true);

    try {
      const questionTimeLimit = currentQuestion.time_limit || gameConfig!.settings.time_limit;
      const timeTaken = questionTimeLimit - timeRemaining;

      const response = await fetch(`/api/live/sessions/${sessionId}?action=answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participant.id,
          question_index: currentQuestionIndex,
          answer,
          time_taken: timeTaken
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit answer');
      }

      // Play correct/incorrect sound
      if (data.is_correct) {
        soundService.playCorrect();
      } else {
        soundService.playIncorrect();
      }

      setHasAnswered(true);
      setLastPointsEarned(data.points_earned || 0);
      setParticipant(data.participant);
      
      // Fetch updated participants for leaderboard
      const { data: updatedParticipants } = await supabase
        .from('live_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .order('score', { ascending: false });

      if (updatedParticipants) {
        setParticipants(updatedParticipants);
      }
      
      // Don't show leaderboard yet - wait for timer to expire for synchronized display
      setWaitingForNext(true);
      setSubmitting(false); // Reset submitting state
    } catch (err) {
      console.error('Error submitting answer:', err);
      setSubmitting(false);
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
        <LoadingSpinner title="Loading Quiz..." message="Getting ready to play..." />
      </div>
    );
  }

  if (showPodium) {
    return (
      <Podium
        rankings={getLeaderboard()}
        currentParticipantId={participant?.id}
        showMessage={true}
      />
    );
  }

  if (!session || !gameConfig || !currentQuestion || !participant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <p className="text-white text-xl">Session error</p>
      </div>
    );
  }

  if (waitingForNext && showLeaderboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
        <div className="container mx-auto max-w-2xl">
          {/* Points Earned */}
          {hasAnswered && (
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 mb-6 text-center">
              <p className="text-2xl text-white mb-2">
                {lastPointsEarned > 0 ? '🎉 Correct!' : '❌ Incorrect'}
              </p>
              <p className="text-5xl font-bold text-yellow-400 mb-2">
                +{lastPointsEarned} pts
              </p>
              {participant.current_streak > 0 && (
                <p className="text-lg text-orange-300">
                  🔥 {participant.current_streak} streak!
                </p>
              )}
            </div>
          )}

          {/* Leaderboard */}
          <LiveLeaderboard
            entries={getLeaderboard()}
            currentParticipantId={participant.id}
            showCurrentPosition={true}
            title="Leaderboard"
          />

          {/* Waiting Message */}
          <div className="mt-8 text-center">
            <Loader2 className="w-12 h-12 text-white mx-auto mb-4 animate-spin" />
            <p className="text-2xl text-white font-semibold">
              Waiting for next question...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      {/* Leaderboard Overlay - Show after answering */}
      {showLeaderboard && waitingForNext && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              Leaderboard
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
              Waiting for next question...
            </p>
            <LiveLeaderboard
              entries={getLeaderboard()}
              currentParticipantId={participant?.id}
              title=""
            />
            <div className="mt-6 text-center text-gray-500 dark:text-gray-400 text-sm">
              The host will start the next question shortly
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{participant.avatar}</div>
            <div>
              <p className="text-white font-semibold">{participant.nickname}</p>
              <p className="text-sm text-gray-300">
                {participant.score} pts
                {participant.current_streak > 0 && ` • 🔥 ${participant.current_streak}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-300">Question</p>
            <p className="text-xl font-bold text-white">
              {session.current_question_index + 1}/{gameConfig.questions.length}
            </p>
          </div>
        </div>

        {/* Timer */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Clock className="w-6 h-6 text-blue-600" />
            <div className={`text-5xl font-bold ${timeRemaining <= 5 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
              {timeRemaining}s
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
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

        {/* Question */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-6">
          <div className="mb-6">
            <ImageRenderer
              content={currentQuestion.question}
              className="text-2xl font-bold text-gray-900 dark:text-white"
            />
          </div>

          {/* Options - Only for MCQ and True/False */}
          {currentQuestion.options && currentQuestion.options.length > 0 ? (
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === option;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={hasAnswered || submitting}
                    className={`w-full p-4 rounded-xl text-left transition-all transform ${
                      isSelected
                        ? 'bg-blue-600 text-white scale-105 ring-4 ring-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    } ${
                      (hasAnswered || submitting) && !isSelected
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:scale-102'
                    }`}
                  >
                    <ImageRenderer
                      content={option}
                      className={`text-lg ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            /* Fill in the Blank Input */
            <div className="space-y-4">
              <input
                type="text"
                value={selectedAnswer}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                disabled={hasAnswered || submitting}
                placeholder="Type your answer..."
                className="w-full p-4 text-lg rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
                autoFocus
              />
              <button
                onClick={() => handleAnswerSelect(selectedAnswer)}
                disabled={!selectedAnswer.trim() || hasAnswered || submitting}
                className="w-full py-4 bg-blue-600 text-white text-lg font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Answer'
                )}
              </button>
            </div>
          )}

          {/* Only show submitting message for MCQ */}
          {currentQuestion.options && submitting && (
            <p className="mt-4 text-center text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </p>
          )}
        </div>
      </div>
      
      {/* Audio Control */}
      <AudioControl />
    </div>
  );
}
