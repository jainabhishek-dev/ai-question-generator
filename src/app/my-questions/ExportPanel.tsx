import React from 'react'
import { ArrowDownTrayIcon, DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

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
            <ArrowDownTrayIcon className="w-5 h-5 text-white" />
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
            <DocumentTextIcon className="w-5 h-5" />
            <span>Export Worksheet</span>
          </button>

          <button
            onClick={handleExportAnswerKey}
            disabled={selectedCount === 0}
            className="px-3 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg sm:rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
          >
            <CheckCircleIcon className="w-5 h-5" />
            <span>Export Answer Key</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportPanel