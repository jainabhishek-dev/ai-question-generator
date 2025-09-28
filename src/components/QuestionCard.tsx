import React, { useState } from "react"
import { CheckIcon, XMarkIcon, CheckCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import "katex/dist/katex.min.css"

interface Question {
  id?: number
  type: string
  question: string
  options?: string[]
  correctAnswer: string
  correctAnswerLetter?: string
  explanation?: string
}

interface QuestionCardProps {
  question: Question
  index: number
  ratings: { [index: number]: number | null }
  avgRatings: { [index: number]: number | null }
  ratingLoading: { [index: number]: boolean }
  onRate: (questionId: number, index: number, rating: number) => void
  getQuestionTypeDisplay: (type: string) => string
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question: q,
  index,
  ratings,
  avgRatings,
  ratingLoading,
  onRate,
  getQuestionTypeDisplay
}) => {
  const isMultipleChoice = q.type === 'multiple-choice'
  const isTrueFalse = q.type === 'true-false'
  const isFillBlank = q.type === 'fill-in-the-blank'
  const isShortAnswer = q.type === 'short-answer'
  const isLongAnswer = q.type === 'long-answer'
  
  // State for fill-in-the-blank
  const [fillValue, setFillValue] = useState("")
  const [fillAttempted, setFillAttempted] = useState(false)
  const [fillCorrect, setFillCorrect] = useState(false)

  const normalize = (str: string) =>
    str.trim().toLowerCase().replace(/\s+/g, " ")

  // Handler for fill-in-the-blank submit
  const handleFillSubmit = () => {
    const userAns = normalize(fillValue)
    const correctAns = normalize(q.correctAnswer)
    setFillAttempted(true)
    setFillCorrect(userAns === correctAns)
    setShowAnswer(true)
  }

  // NEW: State for user interaction
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)

  // Helper: For MCQ, get correct label
  const correctLabel = q.correctAnswerLetter;
  // Helper: For True/False, get correct value
  const correctTF = q.correctAnswer?.toLowerCase();
  // MCQ/TF: Handle option click
  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
    setAttempted(true);
    setShowAnswer(true);
  };

  return (
    <div className="group card overflow-hidden">
      {/* Card Header */}
      <div className="bg-gray-800 text-white px-6 py-4 relative">
        <div className="flex items-start space-x-3 sm:space-x-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-base sm:text-lg">{index + 1}</span>
          </div>
          <div className="flex-1 space-y-2 sm:space-y-3">
            {/* Question Type Badge */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] sm:text-xs font-semibold border bg-blue-100 text-blue-800 border-blue-200 sm:px-3 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700">
              {getQuestionTypeDisplay(q.type)}
            </span>
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
      </div>

      {/* Card Body */}
      <div className="card-body space-y-4 sm:space-y-6 text-justify bg-gray-900">
        {/* MCQ Options */}
        {isMultipleChoice && q.options && q.options.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center space-x-2">
              <span>Options</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((option, i) => {
                if (typeof option !== "string") return null
                const cleanedOption = option.replace(/^[A-Za-z][\.")]\s*/i, '')

                // Button style
                const isSelected = selectedOption === option
                const labelChar = String.fromCharCode(65 + i)
                const isCorrect = attempted && correctLabel === labelChar
                const showFeedback = attempted && isSelected

                return (
                  <button
                    key={i}
                    className={`flex items-start space-x-3 p-3 sm:p-4 rounded-xl transition-all duration-200 w-full text-left
                      ${isSelected ? (isCorrect ? 'bg-green-800 ring-2 ring-green-700' : 'bg-red-800 ring-2 ring-red-700') : 'bg-gray-800 hover:bg-gray-700'}
                    `}
                    disabled={attempted}
                    onClick={() => handleOptionClick(option)}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0
                        ${isCorrect ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white' : 'bg-gradient-to-r from-blue-800 to-purple-800 text-white'}
                      `}
                    >
                      {labelChar}
                    </div>
                    <div className="flex-1 prose max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({ children }) => (
                            <p className={`leading-relaxed text-sm sm:text-base ${isCorrect ? 'text-green-200 font-semibold' : 'text-gray-200'}`}>
                              {children}
                            </p>
                          )
                        }}
                      >
                        {cleanedOption}
                      </ReactMarkdown>
                    </div>
                    {showFeedback && (
                      <div className={`flex items-center space-x-1 ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                        {isCorrect ? (
                          <CheckIcon className="w-4 h-4" />
                        ) : (
                          <XMarkIcon className="w-4 h-4" />
                        )}
                        <span className="text-[10px] sm:text-xs font-semibold">
                          {isCorrect ? "CORRECT" : "INCORRECT"}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* True/False options */}
        {isTrueFalse && (
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center space-x-2">
              <span>Options</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {["True", "False"].map((option) => {
                const isSelected = selectedOption === option
                const isCorrect = attempted && correctTF === option.toLowerCase()
                const showFeedback = attempted && isSelected

                return (
                  <button
                    key={option}
                    className={`flex items-start space-x-3 p-3 sm:p-4 rounded-xl transition-all duration-200 w-full text-left
                      ${isSelected ? (isCorrect ? 'bg-green-800 ring-2 ring-green-700' : 'bg-red-800 ring-2 ring-red-700') : 'bg-gray-800 hover:bg-gray-700'}
                    `}
                    disabled={attempted}
                    onClick={() => handleOptionClick(option)}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0
                        ${isCorrect ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white' : 'bg-gradient-to-r from-blue-800 to-purple-800 text-white'}
                      `}
                    >
                      {option[0]}
                    </div>
                    <div className={`leading-relaxed text-sm sm:text-base ${isCorrect ? 'text-green-200 font-semibold' : 'text-gray-200'}`}>
                      {option}
                    </div>
                    {showFeedback && (
                      <div className={`flex items-center space-x-1 ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                        {isCorrect ? (
                          <CheckIcon className="w-4 h-4" />
                        ) : (
                          <XMarkIcon className="w-4 h-4" />
                        )}
                        <span className="text-[10px] sm:text-xs font-semibold">
                          {isCorrect ? "CORRECT" : "INCORRECT"}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {isFillBlank && (
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center space-x-2">
              <span>Enter your answer</span>
            </h4>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <input
                type="text"
                value={fillValue}
                onChange={e => setFillValue(e.target.value)}
                disabled={fillAttempted}
                className="px-3 py-2 rounded-lg border border-gray-400 bg-gray-800 text-white w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type your answer here"
              />
              <button
                onClick={handleFillSubmit}
                disabled={fillAttempted || !fillValue.trim()}
                className="px-4 py-2 rounded bg-blue-700 text-white disabled:opacity-50"
              >
                Check
              </button>
            </div>
            {fillAttempted && (
              <div className={`mt-2 text-sm font-semibold ${fillCorrect ? "text-green-400" : "text-red-400"}`}>
                {fillCorrect ? "CORRECT" : "INCORRECT"}
              </div>
            )}
          </div>
        )}

        {(isShortAnswer || isLongAnswer) && (
          <div className="space-y-3">
            <button
              onClick={() => setShowAnswer(true)}
              disabled={showAnswer}
              className="px-4 py-2 rounded bg-blue-700 text-white disabled:opacity-50"
            >
              {showAnswer ? "Answer Shown" : "Show Answer"}
            </button>
          </div>
        )}

        {/* Animated expansion for answer/explanation */}
        {showAnswer && (
        <div className={`transition-all duration-500 overflow-hidden overflow-y-auto ${showAnswer ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0"}`}>
          {/* Answer Section */}
          <div className="bg-gradient-to-r from-green-900 to-emerald-900 p-3 sm:p-4 rounded-xl ring-2 ring-green-700">
            <h4 className="text-xs sm:text-sm font-bold text-green-200 uppercase tracking-wide mb-2 sm:mb-3 flex items-center space-x-2">
              <CheckCircleIcon className="w-4 h-4" />
              <span>Correct Answer</span>
            </h4>
            <div className="prose max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => (
                    <p className="text-green-200 font-semibold leading-relaxed text-sm sm:text-base">{children}</p>
                  )
                }}
              >
                {q.correctAnswer}
              </ReactMarkdown>
            </div>
          </div>

          {/* Explanation */}
          {q.explanation && (
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-3 sm:p-4 rounded-xl ring-2 ring-blue-800 mt-4">
              <h4 className="text-xs sm:text-sm font-bold text-blue-200 uppercase tracking-wide mb-2 sm:mb-3 flex items-center space-x-2">
                <InformationCircleIcon className="w-4 h-4" />
                <span>Explanation</span>
              </h4>
              <div className="prose max-w-none">
                <ReactMarkdown
                  remarkPlugins={[[remarkGfm, { breaks: true }],remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                  p: ({ children }) => (
                    <p className="text-blue-200 leading-relaxed text-sm sm:text-base mb-4">{children}</p>
                  )
                }}
                >
                  {q.explanation}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
       )}

        {/* Rating UI */}
        {(q.id) && (
          <div className="flex items-center mt-4 space-x-1">
            <span className="text-xs text-gray-400 mr-2">Rate:</span>
            {[1,2,3,4,5].map(star => (
              <button
                key={star}
                onClick={() => onRate(q.id!, index, star)}
                disabled={ratingLoading[index]}
                className={`text-xl ${ratings[index] && ratings[index]! >= star ? "text-yellow-400" : "text-gray-400"}`}
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                type="button"
              >★</button>
            ))}
            {avgRatings[index] !== null && (
              <span className="ml-2 text-xs text-gray-500">Avg: {avgRatings[index]?.toFixed(1)}</span>
            )}
            {ratings[index] && (
              <span className="ml-2 text-xs text-green-600">Your rating: {ratings[index]}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default QuestionCard