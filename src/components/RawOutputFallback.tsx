import React from "react"

interface RawOutputFallbackProps {
  output: string
}

const RawOutputFallback: React.FC<RawOutputFallbackProps> = ({ output }) => (
  <div className="space-y-4">
    <div className="card p-4 sm:p-6 bg-yellow-50/80 border-yellow-200/50 text-yellow-700 dark:bg-yellow-900/40 dark:border-yellow-700 dark:text-yellow-300">
      <div className="flex items-center space-x-2 sm:space-x-3">
        <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="font-medium text-sm sm:text-base">Unable to parse AI response. See raw output below:</span>
      </div>
    </div>
    <div className="card p-4 sm:p-6 bg-white/90 border-white/50 dark:bg-gray-900/90 dark:border-gray-700/50">
      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center space-x-2 dark:text-gray-200">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <span>Raw AI Response</span>
      </h3>
      <pre className="whitespace-pre-wrap bg-gray-100 p-3 sm:p-4 rounded-xl text-xs sm:text-sm text-gray-800 border border-gray-200 overflow-auto max-h-96 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
        {output}
      </pre>
    </div>
  </div>
)

export default RawOutputFallback