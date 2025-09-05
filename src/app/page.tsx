"use client"

import { useEffect, useRef, useState } from "react"
import AdvancedQuestionForm, { Inputs } from "@/components/AdvancedQuestionForm"
import { generateQuestions } from "@/lib/gemini"
import "katex/dist/katex.min.css"
import { saveQuestions } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from '@/components/AuthModal'
import { getUserQuestions } from '@/lib/database'
import { saveQuestionRating, getQuestionRating } from "@/lib/database"
import PageHeader from "@/components/PageHeader"
import UserInfoBar from "@/components/UserInfoBar"
import SuccessStatus from "@/components/SuccessStatus"
import LoadingSpinner from "@/components/LoadingSpinner"
import RawOutputFallback from "@/components/RawOutputFallback"
import SwipeableQuestions from "@/components/SwipeableQuestions"

interface Question {
  id?: number
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
  const [ratings, setRatings] = useState<{ [index: number]: number | null }>({})
  const [avgRatings, setAvgRatings] = useState<{ [index: number]: number | null }>({})
  const [ratingLoading, setRatingLoading] = useState<{ [index: number]: boolean }>({})
  
  const fetchRating = async (questionId: number, index: number) => {
  const res = await getQuestionRating(questionId, user?.id ?? null)
    let userRating = res.userRating ?? null
  // For anonymous users, check localStorage for rating
  if (!user) {
    const ratedKey = `rated_question_${questionId}`;
    if (localStorage.getItem(ratedKey)) {
      // You could store the actual rating value in localStorage if you want to show the correct star
      const stored = localStorage.getItem(ratedKey)
      userRating = stored ? parseInt(stored, 10) : 1
    }
  }
  if (res.success) {
    setRatings(r => ({ ...r, [index]: userRating }))
    setAvgRatings(a => ({ ...a, [index]: res.average ?? null }))
  }
}

  function escapeCurrencyDollarsSmart(str: string): string {
    // Find all $...$ math blocks and mark their ranges
    const mathBlockRanges: [number, number][] = [];
    const regex = /\$[^$]*?\$/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
      mathBlockRanges.push([match.index, match.index + match[0].length]);
    }

    function isInMathBlock(pos: number) {
      return mathBlockRanges.some(([start, end]) => pos >= start && pos < end);
    }

    // Replace $ followed by a number (currency), but only if not inside math block and not already escaped
    return str.replace(/(^|[^\\])\$(\d[\d,\.]*)/g, (m, pre, num, offset) => {
      if (isInMathBlock(offset + pre.length)) return m;
      return pre + '\\$' + num;
    });
  }

  const handleRate = async (questionId: number, index: number, rating: number) => {
      if (!user) {
    const ratedKey = `rated_question_${questionId}`;
    if (localStorage.getItem(ratedKey)) {
      alert("You have already rated this question.");
      return;
    }
    localStorage.setItem(ratedKey, rating.toString());
    // Immediately update UI for anonymous users
    setRatings(r => ({ ...r, [index]: rating }))
  }
    setRatingLoading(l => ({ ...l, [index]: true }))
    await saveQuestionRating(questionId, user?.id ?? null, rating)
    await fetchRating(questionId, index)
    setRatingLoading(l => ({ ...l, [index]: false }))
  }

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
  
  useEffect(() => {
    questions.forEach((q, index) => {
      if (q.id) fetchRating(q.id, index)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, user?.id])

  const parseQuestions = (text: string): Question[] => {
    console.log("=== RAW AI OUTPUT ===", text);
    let cleanText = text.trim();

    // Remove markdown code block wrappers (``````json)
    cleanText = cleanText
      .replace(/^\s*```(?:json)?/im, "")
      .replace(/```\s*$/m, "")
      .trim();

    // Remove leading/trailing quotes/backticks
    cleanText = cleanText.replace(/^["'`]+|["'`]+$/g, '');
    cleanText = cleanText.replace(/\\\r?\n/g, '');
    cleanText = cleanText.replace(/\\$/gm, '');

    try {
      const parsed = JSON.parse(cleanText);
      console.log("After JSON.parse, parsed:", parsed);

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
      console.error("Cleaned text was:", cleanText);
      return [];
    }
  }

  const getQuestionTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      'multiple-choice': 'Multiple Choice',
      'fill-in-the-blank': 'Fill in the Blank',
      'true-false': 'True-False',
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
      console.log("Parsed questions:", parsedQuestions)     

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

        let correctAnswer = "";
        let correctAnswerLetter = "";

        if (Array.isArray(q.correctAnswer)) {
          correctAnswer = q.correctAnswer.join("\n");
        } else if (typeof q.correctAnswer === "string") {
          correctAnswer = q.correctAnswer;
          const match = q.correctAnswer.match(/^[A-Z]/i);
          correctAnswerLetter = match ? match[0].toUpperCase() : "";
        } else if (typeof q.answer === "string") {
          correctAnswer = q.answer;
        }

        const escapeCurrencyDollars = (str: string) =>
          str.replace(/\$(?=\d[\d,\.]*)/g, '\\$');

        return {
          type: q.type,
          question: escapeCurrencyDollarsSmart(q.question || q.prompt || ""),
          options: options.map(escapeCurrencyDollarsSmart),
          correctAnswer: escapeCurrencyDollarsSmart(correctAnswer),
          correctAnswerLetter,
          explanation: escapeCurrencyDollarsSmart(q.explanation || "")
        }
      });
      
      console.log("Questions to display (before DB save):", parsedQuestions)
      setQuestions(parsedQuestions);  

      if (parsedQuestions.length > 0) {
        setSaveStatus('saving')
        try {
          const saveResult = await saveQuestions(inputs, parsedQuestions, user?.id || null)
          console.log("DB save result:", saveResult)
          if (saveResult.success && Array.isArray(saveResult.data)) {
            // Map DB fields to your Question type for UI
            const questionsWithId = saveResult.data.map(q => ({
            
              id: q.id,
              type: q.question_type,
              question: q.question,
              options: q.options || [],
              correctAnswer: q.correct_answer,
              correctAnswerLetter: q.correct_answer?.match(/^[A-Z]/i)?.[0]?.toUpperCase() || "",
              explanation: q.explanation || ""
            }))
            setQuestions(questionsWithId)
            setSaveStatus('saved')
          } else {
            setQuestions(parsedQuestions)
            setSaveStatus('saved')
            setSaveError(null)
          }
        } catch (saveErr) {
          setQuestions(parsedQuestions)
          setSaveStatus('saved')
          setSaveError(null)
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

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-6 sm:py-8 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-full sm:max-w-4xl mx-auto px-3 sm:px-4 space-y-6 sm:space-y-8">
        {/* Header */}
        <PageHeader />
        {user && <UserInfoBar userQuestions={userQuestions} />}

        {/* AdvancedQuestionForm */}
        <div className="card p-4 sm:p-6 bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <AdvancedQuestionForm onGenerate={handleGenerate} isLoading={isLoading} currentQuestionCount={userQuestions} />
        </div>

        {/* Errors */}
        {saveError && (
          <div className="card p-4 sm:p-6 bg-red-50/80 border-red-200/50 text-red-700 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-sm sm:text-base">{saveError}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {(questions.length > 0 || output || isLoading) && (
          <div ref={resultsRef} className="card p-4 sm:p-6 space-y-5 sm:space-y-6 bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center dark:from-green-700 dark:to-emerald-700">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-400">
                Generated Questions
              </h2>
            </div>

            {/* Success/status */}
            {questions.length > 0 && (
              <>
                <SuccessStatus
                  questionCount={questions.length}
                  saveStatus={saveStatus}
                  user={user}
                  onShowAuthModal={() => setShowAuthModal(true)}
                />

              {/* Swipeable single-question view */}
              <div>
                <SwipeableQuestions
                  questions={questions}
                  ratings={ratings}
                  avgRatings={avgRatings}
                  ratingLoading={ratingLoading}
                  onRate={handleRate}
                  getQuestionTypeDisplay={getQuestionTypeDisplay}
                />
              </div>
            </>
          )}

            {/* Loading */}
            {isLoading && <LoadingSpinner />}

            {/* Raw output fallback */}
            {output && questions.length === 0 && !isLoading && (
              <RawOutputFallback output={output} />
              )}
            </div>
          )}

        {/* Authentication Modal */}
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    </main>
  )
}