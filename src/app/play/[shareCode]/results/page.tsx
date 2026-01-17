"use client";

import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TrophyIcon, ClockIcon, CheckCircleIcon, FireIcon } from '@heroicons/react/24/solid';

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
    grade: string;
  } | null>(null);

  useEffect(() => {
    if (!searchParams) return;
    
    const gameId = searchParams.get('gameId');
    const playerName = searchParams.get('playerName') || 'Player';
    const score = parseInt(searchParams.get('score') || '0');
    const correct = parseInt(searchParams.get('correct') || '0');
    const total = parseInt(searchParams.get('total') || '0');
    const time = parseInt(searchParams.get('time') || '0');

    if (!gameId || !total) {
      router.push('/');
      return;
    }

    const accuracy = Math.round((correct / total) * 100);
    let grade = 'F';
    if (accuracy >= 90) grade = 'A';
    else if (accuracy >= 80) grade = 'B';
    else if (accuracy >= 70) grade = 'C';
    else if (accuracy >= 60) grade = 'D';

    setResults({
      gameId,
      playerName,
      score,
      correct,
      total,
      time,
      accuracy,
      grade
    });
  }, [searchParams, router]);

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8">
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

            {/* Grade */}
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
              <FireIcon className="w-12 h-12 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {results.grade}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Grade
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
