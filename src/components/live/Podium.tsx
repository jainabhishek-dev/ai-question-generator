'use client';

import React, { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '@/types/liveQuiz';
import { TrophyIcon, SparklesIcon } from '@heroicons/react/24/solid';

interface PodiumProps {
  rankings: LeaderboardEntry[];
  currentParticipantId?: string;
  showMessage?: boolean;
}

export default function Podium({
  rankings,
  currentParticipantId,
  showMessage = true
}: PodiumProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  const top3 = rankings.slice(0, 3);
  const currentRanking = currentParticipantId
    ? rankings.find(r => r.participant_id === currentParticipantId)
    : null;
  const isOnPodium = currentRanking && currentRanking.rank <= 3;

  useEffect(() => {
    // Show confetti animation
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const getPodiumHeight = (rank: number) => {
    if (rank === 1) return 'h-48';
    if (rank === 2) return 'h-36';
    if (rank === 3) return 'h-28';
    return 'h-20';
  };

  const getPodiumColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-t from-yellow-400 to-yellow-300';
    if (rank === 2) return 'bg-gradient-to-t from-gray-400 to-gray-300';
    if (rank === 3) return 'bg-gradient-to-t from-amber-600 to-amber-500';
    return 'bg-gray-200';
  };

  const getTrophyColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-500';
  };

  // Order for display: 2nd, 1st, 3rd
  const displayOrder = [
    top3.find(r => r.rank === 2),
    top3.find(r => r.rank === 1),
    top3.find(r => r.rank === 3)
  ].filter(Boolean) as LeaderboardEntry[];

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            >
              <SparklesIcon className="w-4 h-4 text-yellow-400" />
            </div>
          ))}
        </div>
      )}

      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-4 animate-pulse">
          🎉 Final Results! 🎉
        </h1>
        {showMessage && isOnPodium && (
          <p className="text-2xl text-yellow-300 font-semibold">
            Congratulations! You placed {currentRanking.rank}
            {currentRanking.rank === 1 ? 'st' : currentRanking.rank === 2 ? 'nd' : 'rd'}!
          </p>
        )}
        {showMessage && !isOnPodium && currentRanking && (
          <p className="text-xl text-white">
            You placed {currentRanking.rank}
            {currentRanking.rank % 10 === 1 && currentRanking.rank !== 11 ? 'st' :
             currentRanking.rank % 10 === 2 && currentRanking.rank !== 12 ? 'nd' :
             currentRanking.rank % 10 === 3 && currentRanking.rank !== 13 ? 'rd' : 'th'}
            <br />
            <span className="text-gray-300">Better luck next time!</span>
          </p>
        )}
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-8 max-w-4xl w-full mb-12">
        {displayOrder.map((entry) => {
          const isCurrentUser = entry.participant_id === currentParticipantId;

          return (
            <div
              key={entry.participant_id}
              className={`flex flex-col items-center ${
                entry.rank === 1 ? 'scale-110' : ''
              }`}
            >
              {/* Trophy */}
              <div className="mb-4 animate-bounce">
                <TrophyIcon
                  className={`w-16 h-16 ${getTrophyColor(entry.rank)}`}
                />
              </div>

              {/* Avatar and Info */}
              <div
                className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl mb-4 ${
                  isCurrentUser ? 'ring-4 ring-blue-500' : ''
                }`}
              >
                <div className="text-6xl mb-3 text-center">{entry.avatar}</div>
                <p className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                  {entry.nickname}
                  {isCurrentUser && (
                    <span className="text-sm text-blue-600 dark:text-blue-400 block">
                      (You)
                    </span>
                  )}
                </p>
                <div className="text-center">
                  <p className={`text-4xl font-bold ${getTrophyColor(entry.rank)}`}>
                    {entry.score}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">points</p>
                </div>
                <div className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
                  <p>{entry.correct_answers} correct</p>
                  {entry.max_streak > 0 && (
                    <p>🔥 {entry.max_streak} max streak</p>
                  )}
                </div>
              </div>

              {/* Podium Stand */}
              <div
                className={`w-40 ${getPodiumHeight(entry.rank)} ${getPodiumColor(
                  entry.rank
                )} rounded-t-xl shadow-2xl flex flex-col items-center justify-center`}
              >
                <div className="text-6xl font-bold text-white opacity-80">
                  {entry.rank}
                </div>
                <div className="text-sm text-white opacity-70 font-semibold">
                  {entry.rank === 1 ? '1ST PLACE' : 
                   entry.rank === 2 ? '2ND PLACE' : '3RD PLACE'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Other rankings if current user is not on podium */}
      {!isOnPodium && currentRanking && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-white mb-4 text-center">
            Your Results
          </h3>
          <div className="flex items-center gap-4 bg-white/20 rounded-xl p-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {currentRanking.rank}
            </div>
            <div className="text-4xl">{currentRanking.avatar}</div>
            <div className="flex-1">
              <p className="text-white font-semibold text-lg">
                {currentRanking.nickname}
              </p>
              <p className="text-gray-300 text-sm">
                {currentRanking.correct_answers} correct • 🔥 {currentRanking.max_streak}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{currentRanking.score}</p>
              <p className="text-sm text-gray-300">pts</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  );
}
