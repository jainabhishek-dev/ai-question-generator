"use client"
import { useState } from "react"
import AdvancedQuestionForm, { Inputs } from "@/components/AdvancedQuestionForm"
import { generateQuestions } from "@/lib/gemini"
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { saveQuestions } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from '@/components/AuthModal'

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
  const [output, setOutput] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { user } = useAuth()
  
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

  // Fallback parsing method

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

    try {
      const text = await generateQuestions(inputs)
      setOutput(text)

      let parsedQuestions = parseQuestions(text)

      // Filter and normalize questions (your existing logic)
      parsedQuestions = parsedQuestions.filter(q =>
        q && (q.question || q.prompt || q.correctAnswer || q.answer)
      );

      parsedQuestions = parsedQuestions.map(q => {
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

        let correctAnswerLetter = "";
        if (q.correctAnswer) {
          const match = q.correctAnswer.match(/^[A-Z]/i);
          correctAnswerLetter = match ? match[0].toUpperCase() : "";
        }

        return {
          type: q.type,
          question: q.question || q.prompt || "",
          options,
          correctAnswer: q.correctAnswer || q.answer || "",
          correctAnswerLetter,
          explanation: q.explanation || ""
        };
      })

      // Update UI with questions first
      setQuestions(parsedQuestions)

      // UPDATED: Always save to database, with or without user
      if (parsedQuestions.length > 0) {
        setSaveStatus('saving')
        
        try {
          // Pass user.id if authenticated, null if not
          const saveResult = await saveQuestions(inputs, parsedQuestions, user?.id || null)
          
          if (saveResult.success) {
            setSaveStatus('saved')
            const logMessage = user 
              ? `✅ Successfully saved ${parsedQuestions.length} questions for ${user.email}`
              : `✅ Successfully saved ${parsedQuestions.length} questions (sign in to access later)`
            console.log(logMessage)
          } else {
            setSaveStatus('error')
            setSaveError(saveResult.error || 'Failed to save questions')
            console.error('❌ Failed to save questions:', saveResult.error)
          }
        } catch (saveErr) {
          setSaveStatus('error')
          setSaveError('Unexpected error while saving')
          console.error('❌ Save error:', saveErr)
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
      <div key={index} className="group backdrop-blur-xl bg-white/80 border border-white/30 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 p-6 border-b border-gray-200/50">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">{index + 1}</span>
              </div>
              
              <div className="flex-1 space-y-3">
                {/* Question Type Badge */}
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border border-blue-200">
                  {getQuestionTypeDisplay(q.type)}
                </span>
                
                {/* Question Text */}
                <div className="prose prose-lg max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({children}) => <div className="text-gray-900 font-medium leading-relaxed text-lg">{children}</div>
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
        <div className="p-6 space-y-6">
          {/* Options for Multiple Choice */}
          {isMultipleChoice && q.options && q.options.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Answer Options</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.options.map((option, i) => {
                  if (typeof option !== "string") return null;
                  const label = String.fromCharCode(65 + i);
                  const cleanedOption = typeof option === 'string' ? option.replace(/^[A-Za-z][\.\)]\s*/i, '') : option;
                  const isCorrect = q.correctAnswerLetter === label;
                  
                  return (
                    <div key={i} className={`flex items-start space-x-3 p-4 rounded-xl border transition-all duration-200 ${
                      isCorrect 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200/50 ring-2 ring-green-200' 
                        : 'bg-gray-50/80 border-gray-200/50 hover:bg-gray-100/80'
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isCorrect 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                          : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      }`}>
                        {label}
                      </div>
                      <div className="flex-1 prose prose-sm max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkMath]} 
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p: ({children}) => <div className={`leading-relaxed ${isCorrect ? 'text-green-800 font-semibold' : 'text-gray-800'}`}>{children}</div>
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
                          <span className="text-xs font-semibold">CORRECT</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Answer Section */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200/50">
            <h4 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-3 flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Correct Answer</span>
            </h4>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkMath]} 
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({children}) => <div className="text-green-800 font-semibold leading-relaxed text-base">{children}</div>
                }}
              >
                {q.correctAnswer}
              </ReactMarkdown>
            </div>
          </div>
          
          {/* Explanation */}
          {q.explanation && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200/50">
              <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-3 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Explanation</span>
              </h4>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkMath]} 
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: ({children}) => <div className="text-blue-800 leading-relaxed">{children}</div>
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Enhanced Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
            AI Question Generator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Create engaging educational content with AI-powered question generation. 
            Build customized assessments for your classroom in seconds.
          </p>
        </div>

        {/* Full AdvancedQuestionForm in card layout */}
        <AdvancedQuestionForm onGenerate={handleGenerate} />

        {/* Enhanced Error Display */}
        {saveError && (
          <div className="backdrop-blur-xl bg-red-50/80 border border-red-200/50 text-red-700 px-6 py-4 rounded-2xl shadow-lg">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{saveError}</span>
            </div>
          </div>
        )}

        {/* Enhanced Results Section */}
        {(questions.length > 0 || output || isLoading) && (
          <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Generated Questions
              </h2>
            </div>

            {/* Enhanced Success/Status Messages */}
            {questions.length > 0 && (
              <div className="space-y-4">
                <div className="backdrop-blur-xl bg-green-50/80 border border-green-200/50 text-green-700 px-6 py-4 rounded-2xl shadow-lg">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">
                      Successfully generated {questions.length} question{questions.length !== 1 ? 's' : ''}
                      {saveStatus === 'saving' && <span className="ml-2 text-blue-600">• Saving...</span>}
                      {saveStatus === 'saved' && user && <span className="ml-2 text-green-600">• Saved to My Questions</span>}
                      {saveStatus === 'saved' && !user && <span className="ml-2 text-orange-600">• Questions generated! Sign in to save to personal library</span>}
                    </span>
                  </div>
                </div>

                {/* Enhanced CTA for non-authenticated users */}
                {saveStatus === 'saved' && !user && (
                  <div className="backdrop-blur-xl bg-blue-50/80 border border-blue-200/50 text-blue-700 px-6 py-4 rounded-2xl shadow-lg">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <span className="font-medium">Want to build your personal question library?</span>
                        <button
                          onClick={() => setShowAuthModal(true)}
                          className="ml-2 px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Sign up for free
                        </button>
                        <span className="ml-2">to save, organize, and manage your questions!</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Question Display */}
                <div className="space-y-6">
                  {questions.map((q, i) => formatQuestion(q, i))}
                </div>
              </div>
            )}

            {/* Enhanced Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-6 relative">
                  <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
                  <div className="absolute top-4 left-4 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Generating Questions</h3>
                <p className="text-gray-600">Our AI is crafting personalized questions for you...</p>
              </div>
            )}

            {/* Enhanced Raw Output Display */}
            {output && questions.length === 0 && !isLoading && (
              <div className="space-y-4">
                <div className="backdrop-blur-xl bg-yellow-50/80 border border-yellow-200/50 text-yellow-700 px-6 py-4 rounded-2xl shadow-lg">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="font-medium">Unable to parse AI response. See raw output below:</span>
                  </div>
                </div>
                <div className="backdrop-blur-xl bg-white/90 border border-white/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span>Raw AI Response</span>
                  </h3>
                  <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded-xl text-sm text-gray-800 border border-gray-200 overflow-auto max-h-96">
                    {output}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Authentication Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    </main>
  );
}
