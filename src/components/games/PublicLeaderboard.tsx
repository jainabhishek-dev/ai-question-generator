'use client';

import React from 'react';
import { TrophyIcon } from '@heroicons/react/24/solid';

interface LeaderboardEntry {
  rank: number;
  player_name: string;
  best_score: number;
  best_time_seconds: number | null;
  best_accuracy: number | null;
  total_plays: number;
  is_current_player?: boolean;
}

interface PublicLeaderboardProps {
  topPlayers: LeaderboardEntry[];
  currentPlayer?: LeaderboardEntry | null;
  totalPlayers: number;
}

export default function PublicLeaderboard({ topPlayers, currentPlayer, totalPlayers }: PublicLeaderboardProps) {
  if (topPlayers.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <TrophyIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400">
          No scores yet. Be the first to play!
        </p>
      </div>
    );
  }

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const shouldShowCurrentPlayerSeparately = currentPlayer && currentPlayer.rank > 15;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-b border-yellow-200 dark:border-yellow-800">
        <div className="flex items-center gap-3">
          <TrophyIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Leaderboard
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Top {topPlayers.length} of {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
        {topPlayers.map((entry) => (
          <div
            key={`${entry.rank}-${entry.player_name}`}
            className={`flex items-center justify-between p-3 rounded-lg transition-all ${
              entry.is_current_player
                ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 scale-105 shadow-md'
                : entry.rank <= 3
                ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10'
                : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              {/* Rank */}
              <div className="flex items-center justify-center w-8">
                {getMedalIcon(entry.rank) ? (
                  <span className="text-2xl">{getMedalIcon(entry.rank)}</span>
                ) : (
                  <span className={`text-sm font-bold ${
                    entry.is_current_player ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    #{entry.rank}
                  </span>
                )}
              </div>

              {/* Player Name */}
              <div className="flex-1">
                <p className={`font-semibold ${
                  entry.is_current_player ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
                }`}>
                  {entry.player_name || 'Anonymous'}
                  {entry.is_current_player && (
                    <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                      YOU
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {entry.total_plays} {entry.total_plays === 1 ? 'play' : 'plays'}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
              {/* Score */}
              <div className="text-right">
                <p className={`text-xl font-bold ${
                  entry.is_current_player ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                }`}>
                  {entry.best_score}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">pts</p>
              </div>

              {/* Accuracy */}
              {entry.best_accuracy !== null && (
                <div className="text-right hidden sm:block">
                  <p className={`text-sm font-semibold ${
                    entry.best_accuracy >= 90 ? 'text-green-600 dark:text-green-400' :
                    entry.best_accuracy >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {entry.best_accuracy}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">accuracy</p>
                </div>
              )}

              {/* Time */}
              {entry.best_time_seconds !== null && (
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {formatTime(entry.best_time_seconds)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">time</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Show current player separately if outside top 15 */}
        {shouldShowCurrentPlayerSeparately && (
          <>
            <div className="flex items-center justify-center py-2">
              <span className="text-gray-400 dark:text-gray-600">...</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 shadow-md">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center justify-center w-8">
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    #{currentPlayer.rank}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    {currentPlayer.player_name}
                    <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                      YOU
                    </span>
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {currentPlayer.total_plays} {currentPlayer.total_plays === 1 ? 'play' : 'plays'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {currentPlayer.best_score}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">pts</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
