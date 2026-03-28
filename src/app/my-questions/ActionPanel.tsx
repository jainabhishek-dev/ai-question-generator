import React from 'react'
import { TableCellsIcon, TrashIcon, Square2StackIcon } from '@heroicons/react/24/outline'

interface ActionPanelProps {
  selectedCount: number
  onCsvExport?: () => void
  onBulkDelete?: () => void
}

const ActionPanel: React.FC<ActionPanelProps> = ({
  selectedCount,
  onCsvExport,
  onBulkDelete
}) => {

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Square2StackIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Bulk Actions</h3>
            <p className="text-xs sm:text-sm text-gray-600">{selectedCount} questions selected</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onCsvExport}
            disabled={selectedCount === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 px-4 py-2"
          >
            <TableCellsIcon className="w-5 h-5" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={onBulkDelete}
            disabled={selectedCount === 0}
            className="flex items-center justify-center space-x-2 px-4 py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <TrashIcon className="w-5 h-5" />
            <span>Delete Selected</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ActionPanel