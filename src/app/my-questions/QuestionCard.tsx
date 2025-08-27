import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import { QuestionRecord } from '@/types/question'

interface QuestionCardProps {
  question: QuestionRecord
  selected: boolean
  toggleSelect: (id: number) => void
  setShowDeleteModal: (v: boolean) => void
  setPendingDeleteId: (id: number) => void
  deletingId: number | null
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question: q,
  selected,
  toggleSelect,
  setShowDeleteModal,
  setPendingDeleteId,
  deletingId
}) => {
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
                  <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
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
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
              >
                {q.question}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={() => {
            setShowDeleteModal(true)
            setPendingDeleteId(q.id!)
          }}
          disabled={deletingId === q.id}
          className="absolute top-4 right-4 px-3 py-2 text-sm sm:text-base bg-red-50 text-red-600 rounded-lg sm:rounded-xl hover:bg-red-100 transition-all duration-200 border border-red-200 hover:border-red-300 flex items-center space-x-2 font-medium dark:bg-red-900/40 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900/60"
          title="Delete"
          aria-label="Delete"
        >
          {deletingId === q.id ? (
            <>
              <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
              <span>Deleting...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Card Body */}
      <div className="card-body space-y-4 sm:space-y-6 text-justify">
        {/* Options */}
        {q.options && q.options.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide dark:text-gray-300">Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((opt, i) => {
                const cleanedOpt = typeof opt === 'string' ? opt.replace(/^[A-Za-z][\.\)]\s*/i, '') : opt
                return (
                  <div
                    key={i}
                    className="flex items-start space-x-3 p-3 sm:p-4 bg-gray-50/80 rounded-xl border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50"
                  >
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 dark:from-blue-800 dark:to-purple-800">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div className="flex-1 prose max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({ children }) => (
                            <div className="text-gray-800 leading-relaxed text-sm sm:text-base dark:text-gray-200">{children}</div>
                          )
                        }}
                      >
                        {cleanedOpt as string}
                      </ReactMarkdown>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Answer */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:p-4 rounded-xl border border-green-200/50 dark:from-green-900 dark:to-emerald-900 dark:border-green-700">
          <h4 className="text-xs sm:text-sm font-bold text-green-800 uppercase tracking-wide mb-2 flex items-center space-x-2 dark:text-green-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Correct Answer</span>
          </h4>
          <div className="prose max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ children }) => (
                  <div className="text-green-800 font-medium leading-relaxed text-sm sm:text-base dark:text-green-200">{children}</div>
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Explanation</span>
            </h4>
            <div className="prose max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => (
                    <div className="text-blue-800 leading-relaxed text-sm sm:text-base dark:text-blue-200">{children}</div>
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