import React from 'react'

interface FilterPanelProps {
  typeDraft: string
  setTypeDraft: (v: string) => void
  gradeDraft: string
  setGradeDraft: (v: string) => void
  difficultyDraft: string
  setDifficultyDraft: (v: string) => void
  bloomsDraft: string
  setBloomsDraft: (v: string) => void
  typeOptions: string[]
  gradeOptions: string[]
  difficultyOptions: string[]
  bloomsOptions: string[]
  applyFilters: () => void
  clearFilters: () => void
  isAllSelected: boolean
  toggleSelectAll: () => void
  paginatedQuestionsCount: number
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  typeDraft, setTypeDraft,
  gradeDraft, setGradeDraft,
  difficultyDraft, setDifficultyDraft,
  bloomsDraft, setBloomsDraft,
  typeOptions, gradeOptions, difficultyOptions, bloomsOptions,
  applyFilters, clearFilters,
  isAllSelected, toggleSelectAll, paginatedQuestionsCount
}) => {
  return (
    <div className="card p-4 sm:p-6 bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-400">
            Filter Questions
          </h2>
        </div>

        {/* Select All */}
        <label className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group mt-2 sm:mt-0">
          <div className="relative">
            <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="sr-only" />
            <div
              className={`w-5 h-5 rounded border-2 transition-all duration-200 ${
                isAllSelected
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-500'
                  : 'border-gray-300 group-hover:border-blue-400 dark:border-gray-600 dark:group-hover:border-blue-500'
              }`}
            >
              {isAllSelected && (
                <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </div>
          <span className="text-xs sm:text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors dark:text-gray-200 dark:group-hover:text-gray-100">
            Select All on Page ({paginatedQuestionsCount})
          </span>
        </label>
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {/* Type */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center space-x-2 dark:text-gray-200">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>Question Type</span>
          </label>
          <select value={typeDraft} onChange={e => setTypeDraft(e.target.value)} className="form-select dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700">
            <option value="">All Types</option>
            {typeOptions.map(type => (
              <option key={type} value={type}>
                {type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Grade */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center space-x-2 dark:text-gray-200">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            <span>Grade Level</span>
          </label>
          <select value={gradeDraft} onChange={e => setGradeDraft(e.target.value)} className="form-select dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700">
            <option value="">All Grades</option>
            {gradeOptions.map(grade => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center space-x-2 dark:text-gray-200">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            <span>Difficulty</span>
          </label>
          <select value={difficultyDraft} onChange={e => setDifficultyDraft(e.target.value)} className="form-select dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700">
            <option value="">All Levels</option>
            {difficultyOptions.map(diff => (
              <option key={diff} value={diff}>
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Bloom's */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center space-x-2 dark:text-gray-200">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            <span>Bloom&apos;s Level</span>
          </label>
          <select value={bloomsDraft} onChange={e => setBloomsDraft(e.target.value)} className="form-select dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700">
            <option value="">All Levels</option>
            {bloomsOptions.map(bloom => (
              <option key={bloom} value={bloom}>
                {bloom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter actions */}
      <div className="flex justify-between items-center">
        <button
          onClick={clearFilters}
          className="px-3 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200 flex items-center space-x-2 dark:text-gray-300 dark:hover:text-gray-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Clear All</span>
        </button>

        <button onClick={applyFilters} className="btn-primary">Apply Filters</button>
      </div>
    </div>
  )
}

export default FilterPanel