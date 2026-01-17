interface ScoreDistribution {
  range: string;
  count: number;
}

interface PerformanceChartsProps {
  scoreDistribution: ScoreDistribution[];
}

export default function PerformanceCharts({ scoreDistribution }: PerformanceChartsProps) {
  if (scoreDistribution.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📈</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Performance Data Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Performance charts will appear once players complete your quiz!
        </p>
      </div>
    );
  }

  // Find max count for scaling
  const maxCount = Math.max(...scoreDistribution.map(d => d.count));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Score Distribution
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          How players are performing across different score ranges
        </p>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {scoreDistribution.map((item) => {
            const percentage = (item.count / maxCount) * 100;
            const isHighPerformance = item.range.startsWith('8') || item.range.startsWith('9') || item.range.startsWith('10');
            const isMediumPerformance = item.range.startsWith('5') || item.range.startsWith('6') || item.range.startsWith('7');

            return (
              <div key={item.range} className="flex items-center gap-4">
                {/* Score Range Label */}
                <div className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.range}
                </div>

                {/* Bar */}
                <div className="flex-1 relative">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHighPerformance
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : isMediumPerformance
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                          : 'bg-gradient-to-r from-blue-500 to-blue-600'
                      }`}
                      style={{ width: `${percentage}%` }}
                    >
                      <div className="flex items-center justify-end h-full pr-3">
                        <span className="text-xs font-semibold text-white">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Count */}
                <div className="w-20 text-right">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.count} {item.count === 1 ? 'play' : 'plays'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-green-500 to-green-600"></div>
              <span className="text-gray-600 dark:text-gray-400">High (800+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-yellow-500 to-yellow-600"></div>
              <span className="text-gray-600 dark:text-gray-400">Medium (500-799)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-blue-600"></div>
              <span className="text-gray-600 dark:text-gray-400">Low (0-499)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
