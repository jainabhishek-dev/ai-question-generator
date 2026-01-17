interface AnalyticsOverviewProps {
  totalPlays: number;
  uniquePlayers: number;
  completionRate: number;
  avgScore: number;
}

export default function AnalyticsOverview({
  totalPlays,
  uniquePlayers,
  completionRate,
  avgScore
}: AnalyticsOverviewProps) {
  const stats = [
    {
      label: 'Total Plays',
      value: totalPlays,
      icon: '🎮',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20'
    },
    {
      label: 'Unique Players',
      value: uniquePlayers,
      icon: '👥',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20'
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      icon: '✅',
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20'
    },
    {
      label: 'Avg Score',
      value: Math.round(avgScore),
      icon: '⭐',
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${stat.bgColor} p-6 shadow-sm hover:shadow-md transition-shadow`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {stat.label}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </p>
            </div>
            <div className={`text-4xl opacity-20`}>
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
