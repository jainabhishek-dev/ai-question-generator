'use client'
import React, { useState } from 'react'
import { 
  XMarkIcon, 
  DocumentTextIcon, 
  EyeIcon, 
  UserIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  AdjustmentsHorizontalIcon,
  DocumentArrowDownIcon,
  SparklesIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { PdfCustomization, StudentFields } from '@/types/question'
import { DEFAULT_STUDENT_FIELDS, DEFAULT_CONTENT_OPTIONS, createPdfCustomization, DEFAULT_PDF_FORMATTING } from '@/constants/pdfDefaults'

interface Props {
  isOpen: boolean
  onClose: () => void
  onExport: (customization: PdfCustomization) => void
  onPreview?: (customization: PdfCustomization) => void
}

const PdfCustomizationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onExport,
  onPreview
}) => {
  const [activeTab, setActiveTab] = useState<'fields' | 'content'>('fields')
  const [studentFields, setStudentFields] = useState<StudentFields>(DEFAULT_STUDENT_FIELDS)
  const [formatting, setFormatting] = useState<{
    showStudentInfo: boolean;
    studentInfoPosition: 'top-left' | 'top-right' | 'top-center';
  }>({
    showStudentInfo: false,
    studentInfoPosition: 'top-right'
  })
  const [contentOptions, setContentOptions] = useState(DEFAULT_CONTENT_OPTIONS)

  const updateStudentField = (fieldKey: keyof StudentFields, property: keyof StudentFields[keyof StudentFields], value: string | boolean) => {
    setStudentFields(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        [property]: value
      }
    }))
  }

  const handleExport = () => {
    const customization = createPdfCustomization({
      studentFields,
      formatting: {
        ...DEFAULT_PDF_FORMATTING,
        ...formatting
      },
      ...contentOptions
    });
    onExport(customization)
  }

  const handlePreview = () => {
    if (onPreview) {
      const customization = createPdfCustomization({
        studentFields,
        formatting: {
          ...DEFAULT_PDF_FORMATTING,
          ...formatting
        },
        ...contentOptions
      });
      onPreview(customization)
    }
  }

  const exportWithDefaults = () => {
    const defaultCustomization = createPdfCustomization();
    onExport(defaultCustomization)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-purple-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-purple-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <DocumentTextIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5" />
                  Customize PDF Export
                </h2>
                <p className="text-blue-100 text-sm">Configure your PDF export settings with style</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors group"
            >
              <XMarkIcon className="w-6 h-6 text-white group-hover:text-blue-100" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gradient-to-r from-gray-50 to-blue-50 border-b border-purple-100 overflow-x-auto">
          {[
            { id: 'fields', label: 'Student Fields', icon: UserIcon, shortLabel: 'Fields', color: 'text-blue-600' },
            { id: 'content', label: 'Content', icon: AdjustmentsHorizontalIcon, shortLabel: 'Content', color: 'text-purple-600' }
          ].map(({ id, label, shortLabel, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as 'fields' | 'content')}
              className={`flex items-center space-x-2 px-4 sm:px-6 py-4 text-sm font-semibold transition-all whitespace-nowrap relative ${
                activeTab === id
                  ? `${color} bg-white border-b-3 border-b-blue-500 shadow-sm`
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel}</span>
              {activeTab === id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 max-h-80 sm:max-h-96 overflow-y-auto bg-gradient-to-br from-gray-50/50 to-blue-50/30">
          {activeTab === 'fields' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formatting.showStudentInfo}
                      onChange={(e) => setFormatting(prev => ({ ...prev, showStudentInfo: e.target.checked }))}
                      className="w-5 h-5 rounded border-2 border-blue-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                    />
                    {formatting.showStudentInfo && (
                      <CheckCircleIcon className="w-5 h-5 text-blue-600 absolute -top-0.5 -left-0.5 pointer-events-none" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <UserIcon className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                      Include Student Information Section
                    </span>
                  </div>
                  <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                </label>
              </div>

              {formatting.showStudentInfo && (
                <>
                  <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm">
                    <label className="flex items-center space-x-2 mb-3">
                      <Cog6ToothIcon className="w-5 h-5 text-purple-600" />
                      <span className="block text-sm font-semibold text-gray-900">Position Settings</span>
                    </label>
                    <select
                      value={formatting.studentInfoPosition}
                      onChange={(e) => setFormatting(prev => ({ 
                        ...prev, 
                        studentInfoPosition: e.target.value as 'top-left' | 'top-right' | 'top-center' 
                      }))}
                      className="w-full border-2 border-purple-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors"
                    >
                      <option value="top-left">📍 Top Left</option>
                      <option value="top-right">📍 Top Right</option>
                      <option value="top-center">📍 Top Center</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(studentFields).map(([key, field]) => (
                      <div key={key} className="bg-white rounded-xl p-4 border-2 border-gray-100 hover:border-blue-200 transition-colors shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center space-x-3 cursor-pointer group">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={field.enabled}
                                onChange={(e) => updateStudentField(key as keyof StudentFields, 'enabled', e.target.checked)}
                                className="w-4 h-4 rounded border-2 border-blue-300 text-blue-600 focus:ring-blue-500"
                              />
                              {field.enabled && (
                                <CheckCircleIcon className="w-4 h-4 text-blue-600 absolute -top-0.5 -left-0.5 pointer-events-none" />
                              )}
                            </div>
                            <span className="font-semibold text-gray-900 capitalize group-hover:text-blue-700">
                              {key.replace(/([A-Z])/g, ' $1')}
                            </span>
                          </label>
                        </div>
                        
                        {field.enabled && (
                          <div className="space-y-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
                            <div>
                              <label className="block text-xs font-semibold text-blue-700 mb-1">🏷️ Label</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateStudentField(key as keyof StudentFields, 'label', e.target.value)}
                                className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-purple-700 mb-1">✨ Default Value</label>
                              <input
                                type="text"
                                value={field.defaultValue}
                                onChange={(e) => updateStudentField(key as keyof StudentFields, 'defaultValue', e.target.value)}
                                placeholder={field.placeholder}
                                className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}


          {activeTab === 'content' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <AdjustmentsHorizontalIcon className="w-6 h-6 text-blue-600" />
                  <h3 className="font-bold text-gray-900">Content Selection</h3>
                </div>
                <p className="text-sm font-medium text-gray-700 mb-4 flex items-center space-x-2">
                  <SparklesIcon className="w-4 h-4 text-purple-500" />
                  <span>Choose what to include in your PDF export:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={contentOptions.includeQuestionText}
                        onChange={(e) => setContentOptions(prev => ({ ...prev, includeQuestionText: e.target.checked }))}
                        className="w-4 h-4 rounded border-2 border-blue-300 text-blue-600 focus:ring-blue-500"
                      />
                      {contentOptions.includeQuestionText && (
                        <CheckCircleIcon className="w-4 h-4 text-blue-600 absolute -top-0.5 -left-0.5 pointer-events-none" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">📝 Question Text</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-100 hover:border-green-200 hover:bg-green-50 transition-all cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={contentOptions.includeOptions}
                        onChange={(e) => setContentOptions(prev => ({ ...prev, includeOptions: e.target.checked }))}
                        className="w-4 h-4 rounded border-2 border-green-300 text-green-600 focus:ring-green-500"
                      />
                      {contentOptions.includeOptions && (
                        <CheckCircleIcon className="w-4 h-4 text-green-600 absolute -top-0.5 -left-0.5 pointer-events-none" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-green-700">🔤 Options (MCQ/True-False)</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={contentOptions.includeCorrectAnswer}
                        onChange={(e) => setContentOptions(prev => ({ ...prev, includeCorrectAnswer: e.target.checked }))}
                        className="w-4 h-4 rounded border-2 border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      {contentOptions.includeCorrectAnswer && (
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600 absolute -top-0.5 -left-0.5 pointer-events-none" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700">✅ Correct Answer</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={contentOptions.includeExplanation}
                        onChange={(e) => setContentOptions(prev => ({ ...prev, includeExplanation: e.target.checked }))}
                        className="w-4 h-4 rounded border-2 border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      {contentOptions.includeExplanation && (
                        <CheckCircleIcon className="w-4 h-4 text-purple-600 absolute -top-0.5 -left-0.5 pointer-events-none" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-purple-700">💡 Explanation</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={contentOptions.showQuestionNumbers}
                        onChange={(e) => setContentOptions(prev => ({ ...prev, showQuestionNumbers: e.target.checked }))}
                        className="w-4 h-4 rounded border-2 border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {contentOptions.showQuestionNumbers && (
                        <CheckCircleIcon className="w-4 h-4 text-indigo-600 absolute -top-0.5 -left-0.5 pointer-events-none" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700">🔢 Question Numbers</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-100 hover:border-pink-200 hover:bg-pink-50 transition-all cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={contentOptions.showQuestionTypes}
                        onChange={(e) => setContentOptions(prev => ({ ...prev, showQuestionTypes: e.target.checked }))}
                        className="w-4 h-4 rounded border-2 border-pink-300 text-pink-600 focus:ring-pink-500"
                      />
                      {contentOptions.showQuestionTypes && (
                        <CheckCircleIcon className="w-4 h-4 text-pink-600 absolute -top-0.5 -left-0.5 pointer-events-none" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-pink-700">🏷️ Question Type Badge</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={contentOptions.showSubjectBadges}
                        onChange={(e) => setContentOptions(prev => ({ ...prev, showSubjectBadges: e.target.checked }))}
                        className="w-4 h-4 rounded border-2 border-orange-300 text-orange-600 focus:ring-orange-500"
                      />
                      {contentOptions.showSubjectBadges && (
                        <CheckCircleIcon className="w-4 h-4 text-orange-600 absolute -top-0.5 -left-0.5 pointer-events-none" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-orange-700">📚 Subject Badge</span>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-yellow-100 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <InformationCircleIcon className="w-6 h-6 text-yellow-600" />
                  <h3 className="font-bold text-gray-900">Instructions</h3>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-100 hover:border-yellow-200 hover:bg-yellow-50 transition-all cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={contentOptions.includeCommonInstructions}
                        onChange={(e) => setContentOptions(prev => ({ ...prev, includeCommonInstructions: e.target.checked }))}
                        className="w-4 h-4 rounded border-2 border-yellow-300 text-yellow-600 focus:ring-yellow-500"
                      />
                      {contentOptions.includeCommonInstructions && (
                        <CheckCircleIcon className="w-4 h-4 text-yellow-600 absolute -top-0.5 -left-0.5 pointer-events-none" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-yellow-700">📋 Add Common Instructions</span>
                  </label>
                  
                  {contentOptions.includeCommonInstructions && (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border-2 border-yellow-200">
                      <label className="flex items-center space-x-2 mb-2">
                        <DocumentTextIcon className="w-4 h-4 text-yellow-600" />
                        <span className="block text-sm font-semibold text-yellow-800">Instructions Text</span>
                      </label>
                      <textarea
                        value={contentOptions.commonInstructionsText}
                        onChange={(e) => setContentOptions(prev => ({ ...prev, commonInstructionsText: e.target.value }))}
                        className="w-full border-2 border-yellow-300 rounded-lg px-4 py-3 text-sm text-gray-900 resize-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-colors"
                        rows={3}
                        placeholder="✨ Enter common instructions for all questions..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-t border-purple-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={exportWithDefaults}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center justify-center space-x-2 group"
            >
              <Cog6ToothIcon className="w-4 h-4 group-hover:rotate-45 transition-transform" />
              <span>Use Default Settings</span>
            </button>
            
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              {onPreview && (
                <button
                  onClick={handlePreview}
                  className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 text-sm font-semibold text-blue-700 bg-blue-100 border-2 border-blue-200 rounded-xl hover:bg-blue-200 hover:border-blue-300 transition-all shadow-sm flex-1 sm:flex-none group"
                >
                  <EyeIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">Preview</span>
                  <span className="sm:hidden">👁️</span>
                </button>
              )}
              
              <button
                onClick={onClose}
                className="px-4 sm:px-6 py-3 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-2"
              >
                <XMarkIcon className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              
              <button
                onClick={handleExport}
                className="flex items-center justify-center space-x-2 px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex-1 sm:flex-none group transform hover:scale-105"
              >
                <DocumentArrowDownIcon className="w-5 h-5 group-hover:animate-bounce" />
                <span>Export PDF</span>
                <SparklesIcon className="w-4 h-4 group-hover:rotate-45 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PdfCustomizationModal