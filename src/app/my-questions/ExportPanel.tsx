import React from 'react'

interface ExportPanelProps {
  selectedCount: number
  handleExportWorksheet: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  handleExportAnswerKey: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
}

const ExportPanel: React.FC<ExportPanelProps> = ({
  selectedCount,
  handleExportWorksheet,
  handleExportAnswerKey
}) => {
  return (
    <div className="card p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Export Options</h3>
            <p className="text-xs sm:text-sm text-gray-600">{selectedCount} questions selected</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleExportWorksheet}
            disabled={selectedCount === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export Worksheet</span>
          </button>

          <button
            onClick={handleExportAnswerKey}
            disabled={selectedCount === 0}
            className="px-3 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg sm:rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Export Answer Key</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportPanel