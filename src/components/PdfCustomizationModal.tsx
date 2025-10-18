'use client'
import React, { useState } from 'react'
import { XMarkIcon, DocumentTextIcon, EyeIcon, UserIcon } from '@heroicons/react/24/outline'
import { PdfCustomization, StudentFields, PdfFormatting } from '@/types/question'

interface Props {
  isOpen: boolean
  onClose: () => void
  onExport: (customization: PdfCustomization) => void
  onPreview?: (customization: PdfCustomization) => void
}

const defaultStudentFields: StudentFields = {
  name: {
    enabled: true,
    label: 'Name',
    defaultValue: '',
    placeholder: 'Student Name'
  },
  class: {
    enabled: true,
    label: 'Class',
    defaultValue: '',
    placeholder: 'e.g., 10th A'
  },
  rollNumber: {
    enabled: true,
    label: 'Roll Number',
    defaultValue: '',
    placeholder: 'e.g., 101'
  },
  date: {
    enabled: true,
    label: 'Date',
    defaultValue: new Date().toLocaleDateString(),
    placeholder: 'DD/MM/YYYY'
  },
  duration: {
    enabled: true,
    label: 'Duration',
    defaultValue: '60 minutes',
    placeholder: 'e.g., 60 minutes'
  }
}

// Modal formatting interface - only student info settings, layout handled by backend
interface ModalFormatting {
  showStudentInfo: boolean;
  studentInfoPosition: 'top-left' | 'top-right' | 'top-center';
}

const defaultFormatting: ModalFormatting = {
  showStudentInfo: false,
  studentInfoPosition: 'top-right'
}

const PdfCustomizationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onExport,
  onPreview
}) => {
  const [activeTab, setActiveTab] = useState<'fields' | 'content'>('fields')
  const [studentFields, setStudentFields] = useState<StudentFields>(defaultStudentFields)
  const [formatting, setFormatting] = useState(defaultFormatting)
  const [contentOptions, setContentOptions] = useState({
    includeQuestionText: true,
    includeOptions: true,
    includeCorrectAnswer: false,
    includeExplanation: false,
    showQuestionNumbers: true,
    showQuestionTypes: true,
    showSubjectBadges: false,
    includeCommonInstructions: true,
    commonInstructionsText: 'Read all questions carefully before answering. Choose the best answer for each question.'
  })

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
    // Create full formatting object with backend defaults for layout properties
    const fullFormatting: PdfFormatting = {
      // Layout properties handled by backend with fixed defaults
      fontSize: 12,
      questionSpacing: 20,
      margins: { top: 1.5, right: 0.75, bottom: 1.5, left: 0.75 },
      showHeader: true,
      headerText: 'Question Set',
      // Student info from modal
      ...formatting
    }

    const customization: PdfCustomization = {
      template: 'academic',
      studentFields,
      formatting: fullFormatting,
      includeQuestionText: contentOptions.includeQuestionText,
      includeOptions: contentOptions.includeOptions,
      includeCorrectAnswer: contentOptions.includeCorrectAnswer,
      includeExplanation: contentOptions.includeExplanation,
      showQuestionNumbers: contentOptions.showQuestionNumbers,
      showQuestionTypes: contentOptions.showQuestionTypes,
      showSubjectBadges: contentOptions.showSubjectBadges,
      includeCommonInstructions: contentOptions.includeCommonInstructions,
      commonInstructionsText: contentOptions.commonInstructionsText
    }
    onExport(customization)
  }

  const handlePreview = () => {
    if (onPreview) {
      // Create full formatting object with backend defaults for layout properties
      const fullFormatting: PdfFormatting = {
        // Layout properties handled by backend with fixed defaults
        fontSize: 12,
        questionSpacing: 20,
        margins: { top: 1, right: 0.75, bottom: 1, left: 0.75 },
        showHeader: true,
        headerText: 'Question Set',
        // Student info from modal
        ...formatting
      }

      const customization: PdfCustomization = {
        template: 'academic',
        studentFields,
        formatting: fullFormatting,
        includeQuestionText: contentOptions.includeQuestionText,
        includeOptions: contentOptions.includeOptions,
        includeCorrectAnswer: contentOptions.includeCorrectAnswer,
        includeExplanation: contentOptions.includeExplanation,
        showQuestionNumbers: contentOptions.showQuestionNumbers,
        showQuestionTypes: contentOptions.showQuestionTypes,
        showSubjectBadges: contentOptions.showSubjectBadges,
        includeCommonInstructions: contentOptions.includeCommonInstructions,
        commonInstructionsText: contentOptions.commonInstructionsText
      }
      onPreview(customization)
    }
  }

  const exportWithDefaults = () => {
    const defaultCustomization: PdfCustomization = {
      template: 'current',
      studentFields: defaultStudentFields,
      formatting: {
        fontSize: 12,
        questionSpacing: 20,
        margins: {
          top: 0.5,
          right: 0.5,
          bottom: 0.75,
          left: 0.5
        },
        showHeader: true,
        headerText: '',
        showStudentInfo: true,
        studentInfoPosition: 'top-right'
      },
      includeQuestionText: true,
      includeOptions: true,
      includeCorrectAnswer: false,
      includeExplanation: false,
      showQuestionNumbers: true,
      showQuestionTypes: true,
      showSubjectBadges: false,
      includeCommonInstructions: true,
      commonInstructionsText: 'Read all questions carefully before answering.'
    }
    onExport(defaultCustomization)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-gray-800 to-gray-600 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Customize PDF Export
              </h2>
              <p className="text-sm text-gray-800">Configure your PDF export settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {[
            { id: 'fields', label: 'Student Fields', icon: UserIcon, shortLabel: 'Fields' },
            { id: 'content', label: 'Content', icon: DocumentTextIcon, shortLabel: 'Content' }
          ].map(({ id, label, shortLabel, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as 'fields' | 'content')}
              className={`flex items-center space-x-2 px-3 sm:px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 max-h-80 sm:max-h-96 overflow-y-auto">
          {activeTab === 'fields' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4 mb-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formatting.showStudentInfo}
                    onChange={(e) => setFormatting(prev => ({ ...prev, showStudentInfo: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Include Student Information Section</span>
                </label>
              </div>

              {formatting.showStudentInfo && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-900 mb-2">Position</label>
                    <select
                      value={formatting.studentInfoPosition}
                      onChange={(e) => setFormatting(prev => ({ 
                        ...prev, 
                        studentInfoPosition: e.target.value as 'top-left' | 'top-right' | 'top-center' 
                      }))}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                    >
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-center">Top Center</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(studentFields).map(([key, field]) => (
                      <div key={key} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.enabled}
                              onChange={(e) => updateStudentField(key as keyof StudentFields, 'enabled', e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          </label>
                        </div>
                        
                        {field.enabled && (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-900 mb-1">Label</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateStudentField(key as keyof StudentFields, 'label', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-900 mb-1">Default Value</label>
                              <input
                                type="text"
                                value={field.defaultValue}
                                onChange={(e) => updateStudentField(key as keyof StudentFields, 'defaultValue', e.target.value)}
                                placeholder={field.placeholder}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900"
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
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Content Selection</h3>
                <p className="text-sm text-gray-900 mb-4">Choose what to include in your PDF export:</p>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={contentOptions.includeQuestionText}
                      onChange={(e) => setContentOptions(prev => ({ ...prev, includeQuestionText: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-800">Question Text</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={contentOptions.includeOptions}
                      onChange={(e) => setContentOptions(prev => ({ ...prev, includeOptions: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-800">Options (for MCQ and True/False)</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={contentOptions.includeCorrectAnswer}
                      onChange={(e) => setContentOptions(prev => ({ ...prev, includeCorrectAnswer: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-800">Correct Answer</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={contentOptions.includeExplanation}
                      onChange={(e) => setContentOptions(prev => ({ ...prev, includeExplanation: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-800">Explanation</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={contentOptions.showQuestionNumbers}
                      onChange={(e) => setContentOptions(prev => ({ ...prev, showQuestionNumbers: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-800">Question Numbers</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={contentOptions.showQuestionTypes}
                      onChange={(e) => setContentOptions(prev => ({ ...prev, showQuestionTypes: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-800">Question Type Badge</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={contentOptions.showSubjectBadges}
                      onChange={(e) => setContentOptions(prev => ({ ...prev, showSubjectBadges: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-800">Subject Badge</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Instructions</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={contentOptions.includeCommonInstructions}
                      onChange={(e) => setContentOptions(prev => ({ ...prev, includeCommonInstructions: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-800">Add Common Instructions</span>
                  </label>
                  
                  {contentOptions.includeCommonInstructions && (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Instructions Text</label>
                      <textarea
                        value={contentOptions.commonInstructionsText}
                        onChange={(e) => setContentOptions(prev => ({ ...prev, commonInstructionsText: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 resize-none"
                        rows={3}
                        placeholder="Enter common instructions for all questions..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-3 sm:p-6 border-t border-gray-200 bg-gray-50 gap-3">
          <button
            onClick={exportWithDefaults}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Use Default Settings
          </button>
          
          <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
            {onPreview && (
              <button
                onClick={handlePreview}
                className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex-1 sm:flex-none"
              >
                <EyeIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Preview</span>
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleExport}
              className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors flex-1 sm:flex-none"
            >
              <DocumentTextIcon className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PdfCustomizationModal