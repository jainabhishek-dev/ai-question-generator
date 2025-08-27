import React from 'react'

const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 sm:space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card p-4 sm:p-6 animate-pulse bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <div className="flex space-x-4">
            <div className="w-5 h-5 bg-gray-300 dark:bg-gray-700 rounded"></div>
            <div className="flex-1 space-y-3 sm:space-y-4">
              <div className="flex space-x-2">
                <div className="w-20 h-6 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                <div className="w-16 h-6 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                <div className="w-18 h-6 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
              </div>
              <div className="w-full h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
              <div className="w-3/4 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default LoadingSkeleton