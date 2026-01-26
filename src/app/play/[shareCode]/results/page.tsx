"use client";

import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrophyIcon, ClockIcon, CheckCircleIcon, FireIcon, DocumentTextIcon } from '@heroicons/react/24/solid';
import QuizReview from '@/components/games/QuizReview';
import PublicLeaderboard from '@/components/games/PublicLeaderboard';

interface QuizAnswer {
  questionIndex: number;
  questionId?: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  timeTaken: number;
  pointsEarned: number;
}

interface LeaderboardEntry {
  rank: number;
  player_name: string;
  best_score: number;
  best_time_seconds: number | null;
  best_accuracy: number | null;
  total_plays: number;
  is_current_player?: boolean;
}

interface LeaderboardResponse {
  topPlayers: LeaderboardEntry[];
  currentPlayer?: LeaderboardEntry | null;
  totalPlayers: number;
}

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const shareCode = params?.shareCode as string;

  const [results, setResults] = useState<{
    gameId: string;
    playerName: string;
    score: number;
    correct: number;
    total: number;
    time: number;
    accuracy: number;
  } | null>(null);

  const [answers, setAnswers] = useState<QuizAnswer[] | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  useEffect(() => {
    if (!searchParams) return;
    
    const gameId = searchParams.get('gameId');
    const playerName = searchParams.get('playerName') || 'Player';
    const score = parseInt(searchParams.get('score') || '0');
    const correct = parseInt(searchParams.get('correct') || '0');
    const total = parseInt(searchParams.get('total') || '0');
    const time = parseInt(searchParams.get('time') || '0');
    const playId = searchParams.get('playId');

    if (!gameId || !total) {
      router.push('/');
      return;
    }

    const accuracy = Math.round((correct / total) * 100);
    setResults({
      gameId,
      playerName,
      score,
      correct,
      total,
      time,
      accuracy
    });

    // Fetch answers if playId is available
    if (playId) {
      fetchAnswers(playId);
    }
  }, [searchParams, router]);

  const fetchAnswers = async (playId: string) => {
    setLoadingAnswers(true);
    try {
      const response = await fetch(`/api/games/play/${playId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.gamePlay?.answers) {
          setAnswers(data.gamePlay.answers);
        }
      } else {
        console.error('Failed to fetch answers:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch answers:', error);
    } finally {
      setLoadingAnswers(false);
    }
  };

  // Fetch leaderboard
  useEffect(() => {
    if (!results) return;
    
    const fetchLeaderboard = async () => {
      try {
        const params = new URLSearchParams({
          playerName: results.playerName
        });
        const response = await fetch(`/api/games/${results.gameId}/leaderboard?${params}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setLeaderboard(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    fetchLeaderboard();
  }, [results]);

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const timeInSeconds = Math.floor(results.time / 1000);
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4 shadow-lg">
            <TrophyIcon className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Great job, {results.playerName}!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            You completed the quiz. Here&apos;s how you did
          </p>
        </div>

        {/* Results Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6">
          {/* Score Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
            <div className="text-white/80 text-sm font-medium uppercase tracking-wider mb-2">
              Final Score
            </div>
            <div className="text-6xl font-bold text-white mb-2">
              {results.score}
            </div>
            <div className="text-white/90 text-lg">
              {results.correct} out of {results.total} correct
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
            {/* Accuracy */}
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
              <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {results.accuracy}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Accuracy
              </div>
            </div>

            {/* Time */}
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
              <ClockIcon className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Time Taken
              </div>
            </div>

          </div>

          {/* Performance Message */}
          <div className="px-8 pb-8">
            <div className={`p-6 rounded-xl ${
              results.accuracy >= 90 
                ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-800'
                : results.accuracy >= 70
                ? 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800'
                : 'bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 border border-orange-200 dark:border-orange-800'
            }`}>
              <p className="text-center text-lg font-medium text-gray-800 dark:text-gray-200">
                {results.accuracy >= 90 && `🌟 Outstanding, ${results.playerName}! You've mastered this topic!`}
                {results.accuracy >= 70 && results.accuracy < 90 && `👍 Good work, ${results.playerName}! Keep practicing to improve!`}
                {results.accuracy < 70 && `💪 Keep learning, ${results.playerName}! Review the material and try again!`}
              </p>
            </div>
          </div>
        </div>

        {/* Review Answers Section */}
        {answers && answers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowReview(!showReview)}
                className="w-full flex items-center justify-between text-left cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Review Your Answers
                  </h2>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {showReview ? 'Hide' : 'Show'} ({answers.length} questions)
                </span>
              </button>
            </div>
            
            {showReview && (
              <div className="p-6">
                <QuizReview answers={answers} />
              </div>
            )}
          </div>
        )}

        {/* Loading state for answers */}
        {loadingAnswers && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading review...</p>
          </div>
        )}

        {/* Leaderboard Section */}
        {!loadingLeaderboard && leaderboard && (
          <div className="mb-6">
            <PublicLeaderboard 
              topPlayers={leaderboard.topPlayers}
              currentPlayer={leaderboard.currentPlayer}
              totalPlayers={leaderboard.totalPlayers}
            />
          </div>
        )}

        {/* Loading state for leaderboard */}
        {loadingLeaderboard && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading leaderboard...</p>
          </div>
        )}

        {/* Create Your Own Quiz Promo */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-1">Create your own AI-powered quiz</h3>
              <p className="text-white/90 text-sm">
                Turn your knowledge into a fun quiz and share it with anyone.
              </p>
            </div>
            <Link
              href="/create-game"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
            >
              Create Quiz
            </Link>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push(`/play/${shareCode}`)}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            Play Again
          </button>
          <button
            onClick={() => router.push('/my-games')}
            className="flex-1 px-6 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl border-2 border-gray-200 dark:border-gray-700 transition-all duration-200"
          >
            My Games
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 px-6 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl border-2 border-gray-200 dark:border-gray-700 transition-all duration-200"
          >
            Home
          </button>
        </div>

        {/* Share Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Share this quiz with others!
          </p>
          <div className="flex items-center justify-center gap-3">
            <input
              type="text"
              value={`${window.location.origin}/play/${shareCode}`}
              readOnly
              className="flex-1 max-w-md px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 text-sm"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/play/${shareCode}`);
                alert('Link copied to clipboard!');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
