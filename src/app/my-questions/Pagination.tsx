import React from 'react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  setCurrentPage: (page: number) => void
  startIndex: number
  endIndex: number
  totalCount: number
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  setCurrentPage,
  startIndex,
  endIndex,
  totalCount
}) => {
  return (
    <div className="flex items-center justify-between card p-4 sm:p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-4">
        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
          Showing {startIndex + 1} to {Math.min(endIndex, totalCount)} of {totalCount} questions
        </span>
      </div>
      <div className="flex items-center space-x-2">
        {/* Previous */}
        <button
          onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:block">Previous</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center space-x-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
            const showPage = pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1
            if (!showPage && pageNum === 2 && currentPage > 4) {
              return (
                <span key={`l-${pageNum}`} className="px-2 text-gray-400 dark:text-gray-500">
                  ...
                </span>
              )
            }
            if (!showPage && pageNum === totalPages - 1 && currentPage < totalPages - 3) {
              return (
                <span key={`r-${pageNum}`} className="px-2 text-gray-400 dark:text-gray-500">
                  ...
                </span>
              )
            }
            if (!showPage) return null
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === pageNum
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        {/* Next */}
        <button
          onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <span className="hidden sm:block">Next</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default Pagination