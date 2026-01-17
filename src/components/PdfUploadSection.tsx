"use client"

import { useState, useRef } from 'react'
import { DocumentArrowUpIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface PdfUploadSectionProps {
  onFileUpload: (fileUri: string, fileName: string) => void
  onClear: () => void
  uploadedFileName?: string
  isLoading?: boolean
}

export default function PdfUploadSection({ 
  onFileUpload, 
  onClear, 
  uploadedFileName,
  isLoading = false 
}: PdfUploadSectionProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    setError(null)
    setUploading(true)

    try {
      // Validate file
      if (file.type !== 'application/pdf') {
        throw new Error('Only PDF files are allowed')
      }

      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        throw new Error('File size must be less than 10MB')
      }

      // Upload to API
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/pdf/upload-to-gemini', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to upload PDF')
      }

      // Notify parent component
      onFileUpload(result.fileUri, result.fileName)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload PDF')
    } finally {
      setUploading(false)
    }
  }

  const handleClearFile = () => {
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClear()
  }

  if (uploadedFileName) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                PDF Uploaded Successfully
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                {uploadedFileName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearFile}
            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 transition-colors"
            aria-label="Remove PDF"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
        Upload PDF (Optional)
      </label>
      
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${uploading || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && !isLoading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleChange}
          className="hidden"
          disabled={uploading || isLoading}
        />

        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-700 dark:text-gray-300">Uploading PDF...</p>
          </div>
        ) : (
          <>
            <DocumentArrowUpIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
              Drop your PDF here or click to browse
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Maximum file size: 10MB
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <p className="text-xs text-gray-600 dark:text-gray-400">
        Upload a PDF to generate questions based on its content. The AI will analyze the document and create relevant questions.
      </p>
    </div>
  )
}
