import React from 'react'
import { PencilSquareIcon, TrashIcon, CheckIcon, EllipsisHorizontalIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import { QuestionRecord } from '@/types/question'
import { useState, useRef, useEffect } from 'react'


interface QuestionCardProps {
  question: QuestionRecord
  selected: boolean
  toggleSelect: (id: number) => void
  setShowDeleteModal: (v: boolean) => void
  setPendingDeleteId: (id: number) => void
  deletingId: number | null
  onEdit?: () => void
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question: q,
  selected,
  toggleSelect,
  setShowDeleteModal,
  setPendingDeleteId,
  deletingId,
  onEdit
}) => {

    // Dropdown state and ref for three dots menu
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
 
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isTrueFalse = q.question_type === 'true-false'
  
  return (
    <div className="group card overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
      {/* Card Header */}
      <div className=" bg-gray-800 text-white px-6 py-4 relative">
        <div className="flex items-start space-x-3 sm:space-x-4">
          {/* Checkbox */}
          <label className="flex items-center cursor-pointer group/checkbox mt-1">
            <div className="relative">
              <input
                type="checkbox"
                checked={!!q.id && selected}
                onChange={() => q.id && toggleSelect(q.id)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded border-2 transition-all duration-200 ${
                  q.id && selected
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-500'
                    : 'border-gray-300 group-hover/checkbox:border-blue-400 dark:border-gray-600 dark:group-hover/checkbox:border-blue-500'
                }`}
              >
                {q.id && selected && (
                  <CheckIcon className="w-3 h-3 text-white absolute top-0.5 left-0.5" />
                )}
              </div>
            </div>
          </label>

          <div className="flex-1 space-y-2 sm:space-y-3">
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="badge-blue dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700">
                {q.question_type?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>

            {/* Question Text */}
            <div className="prose max-w-none sm:prose-lg text-justify">
              <ReactMarkdown
                remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}
                rehypePlugins={[rehypeKatex]}
              >
                {q.question}
              </ReactMarkdown>
            </div>
          </div>
        </div>

          <div className="absolute top-4 right-4" ref={dropdownRef}>
            <div className="relative">
              {/* Three dots button */}
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all duration-200 flex items-center justify-center dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                title="More options"
                aria-label="More options"
              >
                <EllipsisHorizontalIcon className="w-4 h-4" />
              </button>

              {/* Dropdown menu */}
              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  {/* Edit option */}
                  {onEdit && (
                    <button
                      onClick={() => {
                        onEdit()
                        setShowDropdown(false)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center space-x-3 transition-colors"
                    >
                      <PencilSquareIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span>Edit</span>
                    </button>
                  )}

                  {/* Delete option */}
                  <button
                    onClick={() => {
                      setShowDeleteModal(true)
                      setPendingDeleteId(q.id!)
                      setShowDropdown(false)
                    }}
                    disabled={deletingId === q.id}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === q.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Card Body */}
      <div className="card-body space-y-4 sm:space-y-6 text-justify">
        {/* Options */}
        {q.options && q.options.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide dark:text-gray-300">Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(q.options ?? []).map((opt, idx) => {
                const cleanedOpt = typeof opt === 'string' ? opt.replace(/^[A-Za-z][\.)]\s*/i, '') : opt;
                const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D ...
                return (
                  <div
                    key={opt}
                    className="flex items-start space-x-3 p-3 sm:p-4 bg-gray-50/80 rounded-xl border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50"
                  >
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 dark:from-blue-800 dark:to-purple-800">
                      {optionLabel}
                    </div>
                    <div className="flex-1 prose max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({ children }) => (
                            <p className="text-gray-800 leading-relaxed text-sm sm:text-base dark:text-gray-200">{children}</p>
                          )
                        }}
                      >
                        {cleanedOpt as string}
                      </ReactMarkdown>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {isTrueFalse && (
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide dark:text-gray-300">Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {["True", "False"].map((option) => (
                <div
                  key={option}
                  className="flex items-start space-x-3 p-3 sm:p-4 bg-gray-50/80 rounded-xl border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50"
                >
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 dark:from-blue-800 dark:to-purple-800">
                    {option[0]}
                  </div>
                  <div className="flex-1 text-gray-800 leading-relaxed text-sm sm:text-base dark:text-gray-200">
                    {option}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answer */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:p-4 rounded-xl border border-green-200/50 dark:from-green-900 dark:to-emerald-900 dark:border-green-700">
          <h4 className="text-xs sm:text-sm font-bold text-green-800 uppercase tracking-wide mb-2 flex items-center space-x-2 dark:text-green-200">
            <CheckCircleIcon className="w-4 h-4" />
            <span>Correct Answer</span>
          </h4>
          <div className="prose max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ children }) => (
                  <p className="text-green-800 font-medium leading-relaxed text-sm sm:text-base dark:text-green-200">{children}</p>
                )
              }}
            >
              {q.correct_answer}
            </ReactMarkdown>
          </div>
        </div>

        {/* Explanation */}
        {q.explanation && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 rounded-xl border border-blue-200/50 dark:from-blue-900 dark:to-indigo-900 dark:border-blue-700">
            <h4 className="text-xs sm:text-sm font-bold text-blue-800 uppercase tracking-wide mb-2 flex items-center space-x-2 dark:text-blue-200">
              <InformationCircleIcon className="w-4 h-4" />
              <span>Explanation</span>
            </h4>
            <div className="prose max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => (
                    <p className="text-blue-800 leading-relaxed text-sm sm:text-base dark:text-blue-200">{children}</p>
                  )
                }}
              >
                {q.explanation}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="card-footer">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Subject: <span className="font-medium text-gray-700 dark:text-gray-200">{q.subject}</span>
          </span>
          <span>
            Created:{' '}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {q.created_at ? new Date(q.created_at).toLocaleDateString() : '-'}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default QuestionCard