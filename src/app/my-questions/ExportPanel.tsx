import React from 'react'
import { ArrowDownTrayIcon, TableCellsIcon } from '@heroicons/react/24/outline'

interface ExportPanelProps {
  selectedCount: number
  onCsvExport?: () => void
}

const ExportPanel: React.FC<ExportPanelProps> = ({
  selectedCount,
  onCsvExport
}) => {

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <ArrowDownTrayIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Export Questions</h3>
            <p className="text-xs sm:text-sm text-gray-600">{selectedCount} questions selected</p>
          </div>
        </div>

        <button
          onClick={onCsvExport}
          disabled={selectedCount === 0}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 px-4 py-2 sm:px-6 sm:py-3"
        >
          <TableCellsIcon className="w-5 h-5" />
          <span>Export CSV</span>
        </button>
      </div>
    </div>
  )
}

export default ExportPanel