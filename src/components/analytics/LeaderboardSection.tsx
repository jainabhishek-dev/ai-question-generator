interface LeaderboardEntry {
  player_name: string;
  best_score: number;
  best_time_seconds: number | null;
  best_accuracy: number | null;
  total_plays: number;
  perfect_score_count: number;
}

interface LeaderboardSectionProps {
  leaderboard: LeaderboardEntry[];
}

export default function LeaderboardSection({ leaderboard }: LeaderboardSectionProps) {
  if (leaderboard.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🏆</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Top Scores Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Top scores will appear once players complete your quiz!
        </p>
      </div>
    );
  }

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Top Scores - Top 10
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Best score for each player name
        </p>
      </div>

      <div className="p-6">
        <div className="space-y-3">
          {leaderboard.map((entry, index) => {
            const medal = getMedalIcon(index);
            const rank = index + 1;

            return (
              <div
                key={`${entry.player_name}-${entry.best_score}-${index}`}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  rank <= 3
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800'
                    : 'bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-10 h-10">
                    {medal ? (
                      <span className="text-3xl">{medal}</span>
                    ) : (
                      <span className="text-lg font-bold text-gray-600 dark:text-gray-400">
                        #{rank}
                      </span>
                    )}
                  </div>

                  {/* Player Info */}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {entry.player_name || 'Anonymous'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {entry.total_plays} {entry.total_plays === 1 ? 'play' : 'plays'}
                      {entry.perfect_score_count > 0 && (
                        <span className="ml-2">• ⭐ {entry.perfect_score_count} perfect</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {entry.best_score}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
