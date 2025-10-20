"use client"

import { useEffect, useRef, useState } from "react"
import { ExclamationCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
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
import QuestionModeToggle from "@/components/QuestionModeToggle"
import NCERTQuestionForm from "@/components/NCERTQuestionForm"
import { generateNCERTQuestions } from "@/lib/gemini"
import { parseQuestions, processQuestions, Question } from "@/lib/questionParser"

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
  const [questionMode, setQuestionMode] = useState<"general" | "ncert">("general")
  

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


  // Restored handleGenerate function
  const handleGenerate = async (prompt: string, inputs: Inputs) => {
    setIsLoading(true);
    setOutput("Generating questions...");
    setQuestions([]);
    setSaveStatus('idle');
    setSaveError(null);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    try {
      const text = await generateQuestions(inputs);
      setOutput(text);

      const parsedQuestions = parseQuestions(text);
      const processedQuestions = processQuestions(parsedQuestions);

      setQuestions(processedQuestions);

      if (processedQuestions.length > 0) {
        setSaveStatus('saving');
        try {
          const saveResult = await saveQuestions(inputs, processedQuestions, user?.id || null);
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
            }));
            setQuestions(questionsWithId);
            setSaveStatus('saved');
          } else {
            setQuestions(processedQuestions);
            setSaveStatus('saved');
            setSaveError(null);
          }
        } catch (saveErr) {
          setQuestions(processedQuestions);
          setSaveStatus('saved');
          setSaveError(null);
        }
      }
    } catch (err) {
      setOutput("Error generating questions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateNCERT = async (inputs: Inputs) => {
  setIsLoading(true)
  setOutput("Generating questions...")
  setQuestions([])
  setSaveStatus('idle')
  setSaveError(null)

  setTimeout(() => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth" })
  }, 100)

  try {
    // 1. Generate questions using Gemini AI
    const text = await generateNCERTQuestions(inputs)
    setOutput(text)

    // 2. Parse the AI output into question objects
    const parsedQuestions = parseQuestions(text)
    const processedQuestions = processQuestions(parsedQuestions);

    setQuestions(processedQuestions);

    // 4. Save questions to database (same as general)
    if (processedQuestions.length > 0) {
      setSaveStatus('saving')
      try {
        const saveResult = await saveQuestions(inputs, processedQuestions, user?.id || null)
        if (saveResult.success && Array.isArray(saveResult.data)) {
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
          setQuestions(processedQuestions)
          setSaveStatus('saved')
          setSaveError(null)
        }
      } catch (saveErr) {
        setQuestions(processedQuestions)
        setSaveStatus('saved')
        setSaveError(null)
      }
    }
  } catch (err) {
    setOutput("Error generating questions. Please try again.")
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

        <QuestionModeToggle mode={questionMode} onChange={setQuestionMode} />

        <div className="card p-4 sm:p-6 bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          {questionMode === "general" ? (
            <AdvancedQuestionForm onGenerate={handleGenerate} isLoading={isLoading} currentQuestionCount={userQuestions} />
          ) : (
            <NCERTQuestionForm onGenerate={handleGenerateNCERT} isLoading={isLoading} currentQuestionCount={userQuestions} />
          )}
        </div>

        {/* Errors */}
        {saveError && (
          <div className="card p-4 sm:p-6 bg-red-50/80 border-red-200/50 text-red-700 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 dark:text-red-300" />
              <span className="font-medium text-sm sm:text-base">{saveError}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {(questions.length > 0 || output || isLoading) && (
          <div ref={resultsRef} className="card p-4 sm:p-6 space-y-5 sm:space-y-6 bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center dark:from-green-700 dark:to-emerald-700">
                <DocumentTextIcon className="w-5 h-5 text-white" />
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