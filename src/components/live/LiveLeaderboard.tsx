'use client';

import React from 'react';
import type { LeaderboardEntry } from '@/types/liveQuiz';
import { TrophyIcon } from '@heroicons/react/24/solid';

interface LiveLeaderboardProps {
  entries: LeaderboardEntry[];
  currentParticipantId?: string;
  showCurrentPosition?: boolean;
  title?: string;
}

export default function LiveLeaderboard({
  entries,
  currentParticipantId,
  showCurrentPosition = false,
  title = 'Leaderboard'
}: LiveLeaderboardProps) {
  const top5 = entries.slice(0, 5);
  const currentParticipant = currentParticipantId
    ? entries.find(e => e.participant_id === currentParticipantId)
    : null;
  const isInTop5 = currentParticipant && currentParticipant.rank <= 5;

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 dark:bg-yellow-900/20';
    if (rank === 2) return 'bg-gray-100 dark:bg-gray-800';
    if (rank === 3) return 'bg-amber-100 dark:bg-amber-900/20';
    return 'bg-white dark:bg-gray-800';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full">
      <div className="flex items-center gap-2 mb-4">
        <TrophyIcon className="w-6 h-6 text-yellow-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
      </div>

      <div className="space-y-2">
        {top5.map((entry, index) => {
          const isCurrentUser = entry.participant_id === currentParticipantId;

          return (
            <div
              key={entry.participant_id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                getRankBg(entry.rank)
              } ${
                isCurrentUser
                  ? 'ring-2 ring-blue-500 scale-105'
                  : 'hover:scale-102'
              }`}
            >
              {/* Rank */}
              <div
                className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                  entry.rank <= 3
                    ? 'text-white bg-gradient-to-br from-yellow-400 to-yellow-600'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {entry.rank}
              </div>

              {/* Avatar */}
              <div className="text-2xl">{entry.avatar}</div>

              {/* Nickname */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {entry.nickname}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                      (You)
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {entry.correct_answers} correct
                  {entry.max_streak > 0 && (
                    <span className="ml-2">🔥 {entry.max_streak}</span>
                  )}
                </p>
              </div>

              {/* Score */}
              <div className="text-right">
                <p className={`text-2xl font-bold ${getRankColor(entry.rank)}`}>
                  {entry.score}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">pts</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show current participant if not in top 5 */}
      {showCurrentPosition && currentParticipant && !isInTop5 && (
        <>
          <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm">
                {currentParticipant.rank}
              </div>
              <div className="text-2xl">{currentParticipant.avatar}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {currentParticipant.nickname}
                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                    (You)
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentParticipant.correct_answers} correct
                  {currentParticipant.max_streak > 0 && (
                    <span className="ml-2">🔥 {currentParticipant.max_streak}</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">
                  {currentParticipant.score}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">pts</p>
              </div>
            </div>
          </div>
        </>
      )}

      {entries.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
          No participants yet
        </p>
      )}
    </div>
  );
}
