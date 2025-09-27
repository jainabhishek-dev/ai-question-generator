import React, { useState, useEffect } from "react"
import {
  QuestionMarkCircleIcon,
  Squares2X2Icon,
  CheckCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  PlusIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline"
import { QuestionRecord } from "@/types/question"

interface EditQuestionModalProps {
  question: QuestionRecord
  onSave: (updated: QuestionRecord) => Promise<void>
  onClose: () => void
}

const QUESTION_TYPES_WITH_OPTIONS = ["multiple-choice", "true-false"]

const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  question,
  onSave,
  onClose
}) => {
  const [questionText, setQuestionText] = useState(question.question)
  const [questionType] = useState(question.question_type)
  const [options, setOptions] = useState<string[]>(
    question.options && QUESTION_TYPES_WITH_OPTIONS.includes(question.question_type)
      ? question.options
      : question.question_type === "true-false"
      ? ["True", "False"]
      : []
  )
  // For MCQ, store only the letter (A, B, C, D, ...)
  const [correctAnswer, setCorrectAnswer] = useState(() => {
    if (question.question_type === "multiple-choice" && question.options) {
      const idx = question.options.findIndex(
        (opt, i) =>
          question.correct_answer === opt ||
          question.correct_answer === String.fromCharCode(65 + i)
      )
      return idx >= 0 ? String.fromCharCode(65 + idx) : ""
    }
    return question.correct_answer
  })
  const [explanation, setExplanation] = useState(question.explanation || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Animation effect
  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Handle option change for MCQ
  const handleOptionChange = (idx: number, value: string) => {
    setOptions(prev => prev.map((opt, i) => (i === idx ? value : opt)))
  }

  // Add new option for MCQ
  const handleAddOption = () => {
    setOptions(prev => [...prev, ""])
  }

  // Remove option for MCQ
  const handleRemoveOption = (idx: number) => {
    setOptions(prev => prev.filter((_, i) => i !== idx))
  }

  // Handle correct answer selection for MCQ
  const handleCorrectAnswerSelect = (optionIndex: number) => {
    if (questionType === "multiple-choice") {
      setCorrectAnswer(String.fromCharCode(65 + optionIndex))
    }
  }

  // Get option letter colors (matching your UI)
  const getOptionColor = (index: number) => {
    const colors = [
      'bg-indigo-600', // A - Purple/Indigo
      'bg-blue-600',   // B - Blue  
      'bg-purple-600', // C - Purple
      'bg-pink-600',   // D - Pink
      'bg-orange-600', // E - Orange
      'bg-cyan-600'    // F - Cyan
    ]
    return colors[index] || 'bg-gray-600'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // Validation
    if (!questionText.trim()) {
      setError("Question text is required.")
      setSaving(false)
      return
    }
    if (QUESTION_TYPES_WITH_OPTIONS.includes(questionType)) {
      if (questionType === "multiple-choice") {
        if (options.length < 2 || options.some(opt => !opt.trim())) {
          setError("MCQ must have at least 2 non-empty options.")
          setSaving(false)
          return
        }
        const validLetters = options.map((_, i) => String.fromCharCode(65 + i))
        if (!validLetters.includes(correctAnswer)) {
          setError("Please select a correct answer from the options.")
          setSaving(false)
          return
        }
      }
      if (questionType === "true-false") {
        if (
          options.length !== 2 ||
          options[0].toLowerCase() !== "true" ||
          options[1].toLowerCase() !== "false"
        ) {
          setError('True-False options must be ["True", "False"].')
          setSaving(false)
          return
        }
      }
    }

    try {
      await onSave({
        ...question,
        question: questionText,
        options: QUESTION_TYPES_WITH_OPTIONS.includes(questionType) ? options : null,
        correct_answer: correctAnswer,
        explanation
      })
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : err instanceof Error
          ? err.message
          : "Failed to save changes."
      )
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black bg-opacity-60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div 
        className={`bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] h-[90vh] overflow-hidden transition-all duration-300 border border-slate-700 flex flex-col ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Edit Question</h2>
            <p className="text-sm text-slate-400 mt-1">
              Question Type: <span className="capitalize font-medium text-blue-400">{questionType.replace('-', ' ')}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
            disabled={saving}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Question Text */}
            <div>
              <label className="flex items-center text-sm font-semibold text-slate-200 mb-3">
                <QuestionMarkCircleIcon className="w-5 h-5 mr-2 text-blue-400" />
                Question Text
              </label>
              <textarea
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 resize-none transition-all"
                rows={4}
                placeholder="Enter your question here..."
                required
              />
            </div>

            {/* Options for MCQ and True-False */}
            {QUESTION_TYPES_WITH_OPTIONS.includes(questionType) && (
              <div>
                <label className="flex items-center text-sm font-semibold text-slate-200 mb-3">
                  <div className="w-5 h-5 mr-2 bg-slate-600 rounded-sm flex items-center justify-center">
                    <Squares2X2Icon className="w-4 h-4 text-slate-300" />
                  </div>
                  OPTIONS
                </label>
                
                <div className="space-y-3">
                  {options.map((opt, idx) => (
                    <div 
                      key={idx}
                      className={`flex flex-wrap items-center space-x-3 p-4 rounded-lg border transition-all ${
                        correctAnswer === String.fromCharCode(65 + idx)
                          ? 'border-green-500/50 bg-slate-700/50 ring-1 ring-green-500/30'
                          : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                      }`}
                    >
                      {/* Option Letter */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${getOptionColor(idx)} flex-shrink-0`}>
                        {String.fromCharCode(65 + idx)}
                      </div>

                      {/* Option Input */}
                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={opt}
                          onChange={e => handleOptionChange(idx, e.target.value)}
                          className="w-full px-3 py-2 bg-transparent border-0 text-white placeholder-slate-400 focus:outline-none"
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          required
                          disabled={questionType === "true-false"}
                        />
                      </div>

                      {/* Correct Answer Toggle */}
                      {questionType === "multiple-choice" && (
                        <button
                          type="button"
                          onClick={() => handleCorrectAnswerSelect(idx)}
                          className={`p-2 rounded-full transition-all flex-shrink-0 ${
                            correctAnswer === String.fromCharCode(65 + idx)
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                          }`}
                          title={correctAnswer === String.fromCharCode(65 + idx) ? "Current correct answer" : "Mark as correct"}
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                      )}

                      {/* Remove Option */}
                      {questionType === "multiple-choice" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="p-2 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all flex-shrink-0"
                          disabled={options.length <= 2}
                          title="Remove option"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {questionType === "multiple-choice" && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="w-full p-4 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-blue-500 hover:text-blue-400 transition-all flex items-center justify-center space-x-2"
                    >
                      <PlusIcon className="w-5 h-5" />
                      <span>Add Another Option</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Correct Answer for non-MCQ */}
            {!QUESTION_TYPES_WITH_OPTIONS.includes(questionType) && (
              <div>
                <label className="flex items-center text-sm font-semibold text-slate-200 mb-3">
                  <div className="w-5 h-5 mr-2 bg-green-600 rounded-sm flex items-center justify-center">
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                  </div>
                  CORRECT ANSWER
                </label>
                <input
                  type="text"
                  value={correctAnswer}
                  onChange={e => setCorrectAnswer(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-400 transition-all"
                  placeholder="Enter the correct answer..."
                  required
                />
              </div>
            )}

            {/* True/False Correct Answer Selection */}
            {questionType === "true-false" && (
              <div>
                <label className="flex items-center text-sm font-semibold text-slate-200 mb-3">
                  <div className="w-4 h-4 mr-2 bg-green-600 rounded-sm flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  CORRECT ANSWER
                </label>
                <div className="flex space-x-3">
                  {["True", "False"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCorrectAnswer(value)}
                      className={`flex-1 p-4 rounded-lg border font-medium transition-all ${
                        correctAnswer === value
                          ? 'border-green-500 bg-green-600/20 text-green-400'
                          : 'border-slate-600 bg-slate-700/30 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation */}
            <div>
              <label className="flex items-center text-sm font-semibold text-slate-200 mb-3">
                <div className="w-5 h-5 mr-2 bg-blue-600 rounded-sm flex items-center justify-center">
                  <InformationCircleIcon className="w-4 h-4 text-white" />
                </div>
                EXPLANATION
              </label>
              <textarea
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 resize-none transition-all"
                rows={3}
                placeholder="Provide an explanation for the correct answer..."
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start space-x-3 p-4 bg-red-900/30 border border-red-800/50 rounded-lg">
                <ExclamationCircleIcon className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-slate-700 bg-slate-800/50">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 rounded-lg font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-question-form"
            onClick={handleSubmit}
            className={`px-6 py-2.5 rounded-lg font-medium text-white transition-all flex items-center space-x-2 ${
              saving 
                ? 'bg-blue-500/60 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
            disabled={saving}
          >
            {saving ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditQuestionModal