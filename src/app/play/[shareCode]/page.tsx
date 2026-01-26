"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Game, isQuizConfig } from '@/types/game';
import QuizGameTemplate from '@/components/games/QuizGameTemplate';
import QuizWelcomeScreen from '@/components/games/QuizWelcomeScreen';
import LoadingSpinner from '@/components/LoadingSpinner';
import { soundService } from '@/lib/soundService';

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const shareCode = params?.shareCode as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const fetchGame = async () => {
      if (!shareCode) {
        setError('Invalid share code');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/play/${shareCode}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load game');
        }

        if (!data.game) {
          throw new Error('Game not found');
        }

        setGame(data.game);
      } catch (err) {
        console.error('Error fetching game:', err);
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [shareCode]);

  // Play/stop game-start sound based on welcome screen visibility
  useEffect(() => {
    if (showWelcome && game) {
      soundService.playGameStart();
    } else {
      soundService.stopGameStart();
    }

    // Cleanup on unmount
    return () => {
      soundService.stopGameStart();
    };
  }, [showWelcome, game]);

  const handleWelcomeComplete = (name: string) => {
    setPlayerName(name);
    setShowWelcome(false);
  };

  const handleGameComplete = async (results: {
    timeElapsed: number;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    maxStreak: number;
    hintsUsed: number;
    livesRemaining: number;
    answers: Array<{
      questionIndex: number;
      questionId?: number;
      question: string;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      explanation: string;
      timeTaken: number;
      pointsEarned: number;
    }>;
  }) => {
    if (!game) return;

    let gamePlayId: string | null = null;

    try {
      // Submit game play to database with answers
      const response = await fetch('/api/games/submit-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: game.id,
          player_name: playerName,
          time_taken_seconds: Math.floor(results.timeElapsed / 1000),
          completed: true,
          completion_percentage: 100,
          points_earned: results.score,
          questions_correct: results.correctAnswers,
          questions_total: results.totalQuestions,
          max_streak: results.maxStreak,
          hints_used: results.hintsUsed,
          lives_remaining: results.livesRemaining,
          answers: results.answers // Include answers for review
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to submit game play:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        alert(`Failed to save game results: ${JSON.stringify(errorData)}`);
      } else {
        const successData = await response.json();
        gamePlayId = successData.gamePlayId; // Get the game play ID for review
      }

      // Navigate to results page with query params including gamePlayId
      const params = new URLSearchParams({
        gameId: game.id,
        playerName: playerName,
        score: results.score.toString(),
        correct: results.correctAnswers.toString(),
        total: results.totalQuestions.toString(),
        time: results.timeElapsed.toString()
      });
      
      if (gamePlayId) {
        params.append('playId', gamePlayId);
      }
      
      router.push(`/play/${shareCode}/results?${params.toString()}`);
    } catch (err) {
      console.error('Error submitting game play:', err);
      // Still navigate to results even if submission fails
      const params = new URLSearchParams({
        gameId: game.id,
        playerName: playerName,
        score: results.score.toString(),
        correct: results.correctAnswers.toString(),
        total: results.totalQuestions.toString(),
        time: results.timeElapsed.toString()
      });
      router.push(`/play/${shareCode}/results?${params.toString()}`);
    }
  };

  const handleGameQuit = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Game Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || 'The game you\'re looking for doesn\'t exist or has been removed.'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render game based on type
  if (game.game_type === 'quiz') {
    if (!game.config) {
      console.error('Game config is missing:', game);
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Invalid Game Configuration
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This game is missing its configuration and cannot be played.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    if (!isQuizConfig(game.config)) {
      console.error('Game config is not a valid quiz config:', game.config);
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Invalid Quiz Configuration
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This quiz has an invalid configuration structure.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    // Validate config has required fields
    if (!game.config.settings) {
      console.error('Quiz config missing settings:', game.config);
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Invalid Game Configuration
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This game has an invalid configuration and cannot be played.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    // Show welcome screen or quiz template
    if (showWelcome) {
      return (
        <QuizWelcomeScreen
          gameTitle={game.title}
          gameDescription={game.description || undefined}
          subject={game.subject || undefined}
          topic={game.topic || undefined}
          difficulty={game.difficulty}
          gradeLevel={game.grade_level || undefined}
          numberOfQuestions={game.config.questions.length}
          timeLimit={game.config.settings.time_limit}
          lives={game.config.settings.lives}
          onStart={handleWelcomeComplete}
        />
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Quiz Game */}
          <QuizGameTemplate
            config={game.config}
            onGameComplete={handleGameComplete}
            onGameQuit={handleGameQuit}
          />
        </div>
      </div>
    );
  }

  // Other game types (to be implemented)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Game Type Not Supported Yet
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This game type ({game.game_type}) is coming soon!
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
