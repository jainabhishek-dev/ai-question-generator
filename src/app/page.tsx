"use client"

import { useEffect, useRef, useState } from "react"
import AdvancedQuestionForm, { Inputs } from "@/components/AdvancedQuestionForm"
import { generateQuestions } from "@/lib/gemini"
import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import { saveQuestions } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from '@/components/AuthModal'
import { getUserQuestions } from '@/lib/database'
import Link from "next/link"

interface Question {
  type: string
  question: string
  prompt?: string
  options?: string[]
  choices?: string[]
  correctAnswer: string
  correctAnswerLetter?: string
  answer?: string
  explanation?: string
}

export default function Home() {
  const resultsRef = useRef<HTMLDivElement>(null)
  const [output, setOutput] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { user } = useAuth()
  const [userQuestions, setUserQuestions] = useState(0)

  useEffect(() => {
    if (user?.id) {
      getUserQuestions(user.id).then((res) => {
        if (res.success && res.data) {
          setUserQuestions(res.data.length)
        } else {
          setUserQuestions(0);// fallback if no data
        }
      })
    }
  }, [user])

  const parseQuestions = (text: string): Question[] => {
    let cleanText = text.trim();

    // Remove markdown code block wrappers (``````json)
    cleanText = cleanText.replace(/^``````$/m, '');

    // Remove leading/trailing quotes/backticks
    cleanText = cleanText.replace(/^["'`]+|["'`]+$/g, '');

    // Try to find the first JSON array or object in the text
    const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
    const objectMatch = cleanText.match(/\{[\s\S]*\}/);

    const jsonString = arrayMatch ? arrayMatch[0] : objectMatch ? objectMatch[0] : cleanText;

    try {
      const parsed = JSON.parse(jsonString);

      // If the parsed result is an object with a 'questions' array, return that array
      if (!Array.isArray(parsed) && parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions;
      }
      // If it's a single question object, wrap in array
      if (!Array.isArray(parsed) && parsed.type && parsed.question) {
        return [parsed];
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to parse questions:", error);
      console.error("Raw text was:", text);
      console.error("Cleaned text was:", jsonString);
      return [];
    }
  }

  const getQuestionTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      'multiple-choice': 'Multiple Choice',
      'fill-in-the-blank': 'Fill in the Blank',
      'short-answer': 'Short Answer',
      'long-answer': 'Long Answer'
    }
    return typeMap[type] || type
  }

  const handleGenerate = async (prompt: string, inputs: Inputs) => {
    setIsLoading(true)
    setOutput("Generating questions...")
    setQuestions([])
    setSaveStatus('idle')
    setSaveError(null)

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)

    try {
      const text = await generateQuestions(inputs)
      setOutput(text)

      let parsedQuestions = parseQuestions(text)

      parsedQuestions = parsedQuestions
        .filter(q => q && (q.question || q.prompt || q.correctAnswer || q.answer))
        .map(q => {
        let options: string[] = [];
        // Only normalize options for multiple-choice
        if (q.type === "multiple-choice") {
          let rawOptions = q.options || q.choices || [];
          if (rawOptions && typeof rawOptions === "object" && !Array.isArray(rawOptions)) {
            rawOptions = Object.keys(rawOptions)
              .sort()
              .map(key => ((rawOptions as unknown) as Record<string, string>)[key]);
          }
          if (Array.isArray(rawOptions)) {
            options = rawOptions.map(opt => {
              if (typeof opt === "string" || typeof opt === "number") return String(opt);
              // If option is an object with a 'text' property, use that
              if (opt && typeof opt === "object" && Object.prototype.hasOwnProperty.call(opt, "text")) return String((opt as { text: string }).text);
              // Otherwise, try JSON.stringify as last resort
              return typeof opt !== "undefined" ? JSON.stringify(opt) : "";
            });
          }
        }

          let correctAnswerLetter = ""
          if (q.correctAnswer) {
            const match = q.correctAnswer.match(/^[A-Z]/i)
            correctAnswerLetter = match ? match[0].toUpperCase() : ""
          }

          return {
            type: q.type,
            question: q.question || q.prompt || "",
            options,
            correctAnswer: q.correctAnswer || q.answer || "",
            correctAnswerLetter,
            explanation: q.explanation || ""
          }
        })

      setQuestions(parsedQuestions)

      if (parsedQuestions.length > 0) {
        setSaveStatus('saving')
        try {
          const saveResult = await saveQuestions(inputs, parsedQuestions, user?.id || null)
          if (saveResult.success) {
            setSaveStatus('saved')
            console.log(
              user
                ? `✅ Successfully saved ${parsedQuestions.length} questions for ${user.email}`
                : `✅ Successfully saved ${parsedQuestions.length} questions (sign in to access later)`
            )
          } else {
            setSaveStatus('error')
            setSaveError(saveResult.error || 'Failed to save questions')
          }
        } catch (saveErr) {
          setSaveStatus('error')
          setSaveError('Unexpected error while saving')
          console.error('Save error:', saveErr)
        }
      }
    } catch (err) {
      setOutput("Error generating questions. Check console.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatQuestion = (q: Question, index: number) => {
    const isMultipleChoice = q.type === 'multiple-choice'

    return (
      <div key={index} className="group card overflow-hidden">
        {/* Card Header */}
        <div className="card-header">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 sm:space-x-4 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-base sm:text-lg">{index + 1}</span>
              </div>

              <div className="flex-1 space-y-2 sm:space-y-3">
                {/* Question Type Badge */}
                <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] sm:text-xs font-semibold border bg-blue-100 text-blue-800 border-blue-200 sm:px-3">
                  {getQuestionTypeDisplay(q.type)}
                </span>

                {/* Question Text */}
                <div className="prose max-w-none sm:prose-lg">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({ children }) => (
                        <div className="text-gray-900 font-medium leading-relaxed text-base sm:text-lg">{children}</div>
                      )
                    }}
                  >
                    {q.question}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="card-body space-y-4 sm:space-y-6">
          {/* Options for Multiple Choice */}
          {isMultipleChoice && q.options && q.options.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Answer Options</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.options.map((option, i) => {
                  if (typeof option !== "string") return null
                  const label = String.fromCharCode(65 + i)
                  const cleanedOption = option.replace(/^[A-Za-z][\.\)]\s*/i, '')
                  const isCorrect = q.correctAnswerLetter === label

                  return (
                    <div
                      key={i}
                      className={`flex items-start space-x-3 p-3 sm:p-4 rounded-xl border transition-all duration-200 ${
                        isCorrect
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200/50 ring-2 ring-green-200'
                          : 'bg-gray-50/80 border-gray-200/50 hover:bg-gray-100/80'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
                          isCorrect
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                            : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        }`}
                      >
                        {label}
                      </div>
                      <div className="flex-1 prose max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p: ({ children }) => (
                              <div className={`leading-relaxed text-sm sm:text-base ${isCorrect ? 'text-green-800 font-semibold' : 'text-gray-800'}`}>
                                {children}
                              </div>
                            )
                          }}
                        >
                          {cleanedOption}
                        </ReactMarkdown>
                      </div>
                      {isCorrect && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-[10px] sm:text-xs font-semibold">CORRECT</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Answer Section */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:p-4 rounded-xl border border-green-200/50">
            <h4 className="text-xs sm:text-sm font-bold text-green-800 uppercase tracking-wide mb-2 sm:mb-3 flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Correct Answer</span>
            </h4>
            <div className="prose max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => (
                    <div className="text-green-800 font-semibold leading-relaxed text-sm sm:text-base">{children}</div>
                  )
                }}
              >
                {q.correctAnswer}
              </ReactMarkdown>
            </div>
          </div>

          {/* Explanation */}
          {q.explanation && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 rounded-xl border border-blue-200/50">
              <h4 className="text-xs sm:text-sm font-bold text-blue-800 uppercase tracking-wide mb-2 sm:mb-3 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Explanation</span>
              </h4>
              <div className="prose max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: ({ children }) => (
                      <div className="text-blue-800 leading-relaxed text-sm sm:text-base">{children}</div>
                    )
                  }}
                >
                  {q.explanation}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-6 sm:py-8">
      <div className="max-w-full sm:max-w-4xl mx-auto px-3 sm:px-4 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
            Instaku - Create Instantly
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-lg sm:max-w-2xl mx-auto leading-relaxed">
            AI-powered worksheets in seconds.
          </p>
        </div>
        {user && (
          <div className="mb-4 text-center text-sm text-gray-700">
            You have <span className="font-bold">{userQuestions}</span> question{userQuestions !== 1 ? "s" : ""} in your{" "}
            <Link href="/my-questions" className="text-blue-600 underline hover:text-blue-800">
              library
            </Link>.
            {userQuestions >= 40 && (
              <span className="ml-2 text-red-600 font-semibold">You have reached your free limit.</span>
            )}
          </div>
        )}

        {/* AdvancedQuestionForm */}
        <div className="card p-4 sm:p-6">
          <AdvancedQuestionForm onGenerate={handleGenerate} isLoading={isLoading} currentQuestionCount={userQuestions} />
        </div>

        {/* Errors */}
        {saveError && (
          <div className="card p-4 sm:p-6 bg-red-50/80 border-red-200/50 text-red-700">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-sm sm:text-base">{saveError}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {(questions.length > 0 || output || isLoading) && (
          <div ref={resultsRef} className="card p-4 sm:p-6 space-y-5 sm:space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Generated Questions
              </h2>
            </div>

            {/* Success/status */}
            {questions.length > 0 && (
              <div className="space-y-4">
                <div className="card p-4 sm:p-6 bg-green-50/80 border-green-200/50 text-green-700">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-sm sm:text-base">
                      Successfully generated {questions.length} question{questions.length !== 1 ? 's' : ''}
                      {saveStatus === 'saving' && <span className="ml-2 text-blue-600">• Saving...</span>}
                      {saveStatus === 'saved' && user && <span className="ml-2 text-green-600">• Saved to My Questions</span>}
                      {saveStatus === 'saved' && !user && (
                        <span className="ml-2 text-orange-600">• Questions generated! Sign in to save to personal library</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* CTA for non-authenticated users */}
                {saveStatus === 'saved' && !user && (
                  <div className="card p-4 sm:p-6 bg-blue-50/80 border-blue-200/50 text-blue-700">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-sm sm:text-base">Want to build a personal question library?</span>
                      </div>
                      <div>
                        <button
                          onClick={() => setShowAuthModal(true)}
                          className="btn-primary"
                        >
                          Sign up for free
                        </button>
                        <span className="ml-2 text-sm text-blue-800">to save, organize, and manage questions.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Question list */}
                <div className="space-y-5 sm:space-y-6">
                  {questions.map((q, i) => formatQuestion(q, i))}
                </div>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="text-center py-10 sm:py-12">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-5 sm:mb-6 relative">
                  <div className="w-full h-full border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
                  <div className="absolute top-3.5 left-3.5 w-7 h-7 sm:top-4 sm:left-4 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Generating Questions</h3>
                <p className="text-sm sm:text-base text-gray-600">Our AI is crafting personalized questions...</p>
              </div>
            )}

            {/* Raw output fallback */}
            {output && questions.length === 0 && !isLoading && (
              <div className="space-y-4">
                <div className="card p-4 sm:p-6 bg-yellow-50/80 border-yellow-200/50 text-yellow-700">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="font-medium text-sm sm:text-base">Unable to parse AI response. See raw output below:</span>
                  </div>
                </div>
                <div className="card p-4 sm:p-6 bg-white/90 border-white/50">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span>Raw AI Response</span>
                  </h3>
                  <pre className="whitespace-pre-wrap bg-gray-100 p-3 sm:p-4 rounded-xl text-xs sm:text-sm text-gray-800 border border-gray-200 overflow-auto max-h-96">
                    {output}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Authentication Modal */}
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    </main>
  )
}