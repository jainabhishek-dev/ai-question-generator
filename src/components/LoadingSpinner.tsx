const LoadingSpinner = () => (
  <div className="text-center py-10 sm:py-12">
    <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-5 sm:mb-6 relative">
      <div className="w-full h-full border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400"></div>
      <div className="absolute top-3.5 left-3.5 w-7 h-7 sm:top-4 sm:left-4 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center dark:from-blue-800 dark:to-purple-800">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
    </div>
    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 dark:text-gray-100">Generating Questions</h3>
    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Our AI is crafting personalized questions...</p>
  </div>
)

export default LoadingSpinner