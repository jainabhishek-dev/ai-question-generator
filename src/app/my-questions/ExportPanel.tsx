import React, { useState } from 'react'
import { ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import PdfCustomizationModal from '@/components/PdfCustomizationModal'
import { PdfCustomization } from '@/types/question'

interface ExportPanelProps {
  selectedCount: number
  handleExport: (customization?: PdfCustomization) => void
  onPreview?: (customization: PdfCustomization) => void
}

const ExportPanel: React.FC<ExportPanelProps> = ({
  selectedCount,
  handleExport,
  onPreview
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openCustomizationModal = () => {
    setIsModalOpen(true)
  }

  const handleCustomExport = (customization: PdfCustomization) => {
    handleExport(customization)
    setIsModalOpen(false)
  }

  const handlePreview = (customization: PdfCustomization) => {
    if (onPreview) {
      onPreview(customization)
    }
  }

  return (
    <>
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

          <div className="flex justify-center">
            <button
              onClick={openCustomizationModal}
              disabled={selectedCount === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 px-6 py-3"
            >
              <DocumentTextIcon className="w-5 h-5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      <PdfCustomizationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onExport={handleCustomExport}
        onPreview={onPreview ? handlePreview : undefined}
      />
    </>
  )
}

export default ExportPanel