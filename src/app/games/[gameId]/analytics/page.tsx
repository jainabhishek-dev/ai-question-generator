"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import AnalyticsOverview from '@/components/analytics/AnalyticsOverview';
import RecentPlaysTable from '@/components/analytics/RecentPlaysTable';
import LeaderboardSection from '@/components/analytics/LeaderboardSection';
import PerformanceCharts from '@/components/analytics/PerformanceCharts';
import QuizInsights from '@/components/analytics/QuizInsights';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Game, GamePlay } from '@/types/game';

interface TopScoreEntry {
  player_name: string;
  best_score: number;
  best_time_seconds: number | null;
  best_accuracy: number | null;
  total_plays: number;
  perfect_score_count: number;
}

interface ScoreDistribution {
  range: string;
  count: number;
}

interface PlayerInsights {
  avg_time_per_question: number;
  avg_hints_used: number;
  avg_lives_remaining: number;
  hints_usage_rate: number;
}

interface AnalyticsData {
  game: Game;
  overview: {
    total_plays: number;
    unique_players: number;
    completion_rate: number;
    avg_score: number;
  };
  recentPlays: GamePlay[];
  topScores: TopScoreEntry[];
  scoreDistribution: ScoreDistribution[];
  playerInsights: PlayerInsights;
}

export default function GameAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const gameId = params?.gameId as string;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/');
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}/analytics`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load analytics');
        }

        setData(result.data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      fetchAnalytics();
    }
  }, [gameId, user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Error Loading Analytics
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <button
              onClick={() => router.push('/my-games')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Back to My Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/my-games')}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to My Games
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {data.game.title}
                </h1>
                {data.game.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {data.game.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {data.game.subject && (
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                      {data.game.subject}
                    </span>
                  )}
                  {data.game.topic && (
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm rounded-full">
                      {data.game.topic}
                    </span>
                  )}
                  {data.game.difficulty && (
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      data.game.difficulty === 'easy'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        : data.game.difficulty === 'medium'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                    }`}>
                      {data.game.difficulty.charAt(0).toUpperCase() + data.game.difficulty.slice(1)}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Share Code</p>
                <code className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                  {data.game.share_code}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <AnalyticsOverview
          totalPlays={data.overview.total_plays}
          uniquePlayers={data.overview.unique_players}
          completionRate={data.overview.completion_rate}
          avgScore={data.overview.avg_score}
        />

        {/* Quiz Insights (game-type specific) */}
        {data.game.game_type === 'quiz' && (
          <div className="mb-8">
            <QuizInsights insights={data.playerInsights} />
          </div>
        )}

        {/* Two Column Layout for Recent Plays and Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Plays */}
          <div className="lg:col-span-2">
            <RecentPlaysTable plays={data.recentPlays} />
          </div>
        </div>

        {/* Performance Charts and Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Performance Charts */}
          <PerformanceCharts scoreDistribution={data.scoreDistribution} />

          {/* Top Scores */}
          <LeaderboardSection leaderboard={data.topScores} />
        </div>
      </div>
    </div>
  );
}
