interface PlayerInsights {
  avg_time_per_question?: number;
  avg_hints_used?: number;
  hints_usage_rate?: number;
}

interface QuizInsightsProps {
  insights: PlayerInsights;
}

export default function QuizInsights({ insights }: QuizInsightsProps) {
  const insightCards = [
    {
      label: 'Avg Time Per Question',
      value: insights.avg_time_per_question ? `${insights.avg_time_per_question}s` : '-',
      icon: '⏱️',
      description: 'Average time players spend on each question',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20'
    },
    {
      label: 'Hints Usage Rate',
      value: insights.hints_usage_rate ? `${insights.hints_usage_rate}%` : '0%',
      icon: '💡',
      description: 'Percentage of players who used hints',
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20'
    },
    {
      label: 'Avg Hints Used',
      value: insights.avg_hints_used !== undefined ? insights.avg_hints_used.toFixed(1) : '-',
      icon: '🔍',
      description: 'Average number of hints used per quiz',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20'
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Quiz Insights
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {insightCards.map((card) => (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${card.bgColor} p-6 shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{card.icon}</div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {card.value}
              </p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {card.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {card.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
