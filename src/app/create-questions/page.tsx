"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { ExclamationCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import AdvancedQuestionForm, { Inputs } from "@/components/AdvancedQuestionForm"
import "katex/dist/katex.min.css"
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from '@/components/AuthModal'
import { getUserVisibleQuestionCount } from '@/lib/database'
import { saveQuestionRating, getQuestionRating } from "@/lib/database"
import PageHeader from "@/components/PageHeader"
import UserInfoBar from "@/components/UserInfoBar"
import SuccessStatus from "@/components/SuccessStatus"
import LoadingSpinner from "@/components/LoadingSpinner"
import SwipeableQuestions from "@/components/SwipeableQuestions"
import QuestionModeToggle from "@/components/QuestionModeToggle"
import NCERTQuestionForm from "@/components/NCERTQuestionForm"
import { processQuestions, Question, extractImagePromptsFromQuestion } from "@/lib/questionParser"
import ImageGenerationModal from "@/components/ImageGenerationModal"
import ComprehensiveImageModal from "@/components/ComprehensiveImageModal"
import ReviewProgressCard, {
  applyEventToSlot,
  buildInitialSlots,
  type QuestionSlotState,
} from "@/components/ReviewProgressCard"
import type { GeneratedImage } from "@/types/question"
import type { GenerationJobEvent } from "@/lib/database"

export default function CreateQuestionsPage() {
  const resultsRef = useRef<HTMLDivElement>(null)
  const pollingRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastEventTs = useRef<string>('1970-01-01T00:00:00.000Z')

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

  // Review progress state
  const [jobId, setJobId] = useState<string | null>(null)
  const [slots, setSlots] = useState<QuestionSlotState[]>([])
  const [jobComplete, setJobComplete] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Image generation state
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedQuestionForImages, setSelectedQuestionForImages] = useState<Question | null>(null)
  const [questionImages, setQuestionImages] = useState<{ [questionIndex: number]: GeneratedImage[] }>({})

  // Image management state
  const [showImageManagementModal, setShowImageManagementModal] = useState(false)
  const [selectedQuestionForManagement, setSelectedQuestionForManagement] = useState<Question | null>(null)

  const fetchRating = async (questionId: number, index: number) => {
    const res = await getQuestionRating(questionId, user?.id ?? null)
    let userRating = res.userRating ?? null
    if (!user) {
      const ratedKey = `rated_question_${questionId}`
      if (localStorage.getItem(ratedKey)) {
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
      const ratedKey = `rated_question_${questionId}`
      if (localStorage.getItem(ratedKey)) {
        alert('You have already rated this question.')
        return
      }
      localStorage.setItem(ratedKey, rating.toString())
      setRatings(r => ({ ...r, [index]: rating }))
    }
    setRatingLoading(l => ({ ...l, [index]: true }))
    await saveQuestionRating(questionId, user?.id ?? null, rating)
    await fetchRating(questionId, index)
    setRatingLoading(l => ({ ...l, [index]: false }))
  }

  // Fetch the count of review-passed questions for the quota display
  useEffect(() => {
    if (user?.id) {
      getUserVisibleQuestionCount(user.id).then((res) => {
        setUserQuestions(res.success ? (res.count ?? 0) : 0)
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

  // ── Polling logic ─────────────────────────────────────────────────────────
  // Reads new events from /api/generate/[jobId]/status every 2 seconds.
  // Applies each event to the correct question slot.
  // Adds passed questions to the SwipeableQuestions view immediately.
  const pollJobStatus = useCallback(async (currentJobId: string) => {
    try {
      const url = `/api/generate/${currentJobId}/status?since=${encodeURIComponent(lastEventTs.current)}`
      const res = await fetch(url)
      if (!res.ok) return

      const data = await res.json() as {
        success: boolean
        jobStatus: string
        events: GenerationJobEvent[]
      }

      if (!data.success || !data.events?.length) return

      // Update lastEventTs to the most recent event's timestamp
      const latestEvent = data.events[data.events.length - 1]
      if (latestEvent?.created_at) {
        lastEventTs.current = latestEvent.created_at
      }

      // Apply events to slots
      setSlots(prev => {
        const updated = [...prev]
        for (const event of data.events) {
          if (event.question_index !== null && event.question_index !== undefined) {
            const idx = event.question_index
            if (updated[idx]) {
              updated[idx] = applyEventToSlot(updated[idx], event)
            }
          }

          // When a question passes, add it to SwipeableQuestions immediately
          if (event.event_type === 'passed' && event.payload) {
            const questionData = event.payload.question as Question | undefined
            if (questionData) {
              const processed = processQuestions([questionData])
              if (processed.length > 0) {
                setQuestions(prev => {
                  // Avoid duplicates by comparing question strings since payloads from AI lack a DB ID
                  const alreadyExists = prev.some(q => q.question === processed[0].question)
                  return alreadyExists ? prev : [...prev, processed[0]]
                })
                // Load images for logged-in users
                if (user?.accessToken && processed[0].id) {
                  loadQuestionImages(processed[0].id, questions.length)
                }
              }
            }
          }

          // Job complete — stop polling, update counts
          if (event.event_type === 'complete') {
            setJobComplete(true)
            setSaveStatus('saved')
            if (user?.id) {
              getUserVisibleQuestionCount(user.id).then(res => {
                setUserQuestions(res.success ? (res.count ?? 0) : 0)
              })
            }
          }
        }
        return updated
      })

      // Stop polling if job is done
      if (data.jobStatus === 'completed' || data.jobStatus === 'failed') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
        setIsLoading(false)
        if (data.jobStatus === 'failed') {
          setGenerationError('The generation job encountered an error. Please try again.')
        }
      }
    } catch (err) {
      console.error('[pollJobStatus] error:', err)
    }
  }, [user, questions.length])

  // Start/stop polling when jobId changes
  useEffect(() => {
    if (!jobId) return
    pollingRef.current = setInterval(() => pollJobStatus(jobId), 2000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [jobId, pollJobStatus])

  // ── Shared generation starter ─────────────────────────────────────────────
  const startGenerationJob = async (inputs: Inputs, mode: 'general' | 'ncert') => {
    setIsLoading(true)
    setQuestions([])
    setSaveStatus('idle')
    setSaveError(null)
    setGenerationError(null)
    setJobId(null)
    setJobComplete(false)
    setSlots(buildInitialSlots(inputs))
    lastEventTs.current = '1970-01-01T00:00:00.000Z'

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (user?.accessToken) {
        headers['Authorization'] = `Bearer ${user.accessToken}`
      }

      const res = await fetch('/api/generate/start', {
        method: 'POST',
        headers,
        body: JSON.stringify({ inputs, mode }),
      })

      const data = await res.json() as { success: boolean; jobId?: string; error?: string }

      if (!data.success || !data.jobId) {
        setGenerationError(data.error ?? 'Failed to start generation. Please try again.')
        setIsLoading(false)
        return
      }

      setJobId(data.jobId)
      // Polling starts via the useEffect that watches jobId
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Please try again.'
      setGenerationError(msg)
      setIsLoading(false)
    }
  }

  const handleGenerate = async (_prompt: string, inputs: Inputs) => {
    await startGenerationJob(inputs, 'general')
  }

  const handleGenerateNCERT = async (inputs: Inputs) => {
    await startGenerationJob(inputs, 'ncert')
  }

  const loadQuestionImages = async (questionId: number, index: number) => {
    if (!user?.accessToken) {
      return
    }

    try {
      const headers: { [key: string]: string } = {
        'Authorization': `Bearer ${user.accessToken}`
      }

      const response = await fetch(`/api/questions/${questionId}/images`, {
        headers
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success && result.data) {
          setQuestionImages(prev => {
            const updated = {
              ...prev,
              [index]: result.data
            }
            return updated
          })
        } else {
          console.warn(`⚠️ API returned success but no data for question ${questionId}`)
        }
      } else {
        console.error(`❌ Failed to load images - status ${response.status}`)
      }
    } catch (error) {
      console.error('❌ loadQuestionImages error:', error)
    }
  }

  const handleImagesGenerated = (images: GeneratedImage[]) => {
    if (selectedQuestionForImages?.id) {
      const questionIndex = questions.findIndex(q => q.id === selectedQuestionForImages.id)
      if (questionIndex !== -1) {
        setQuestionImages(prev => ({
          ...prev,
          [questionIndex]: images
        }))
      }
    }
  }

  const handleManagementImagesGenerated = (images: GeneratedImage[]) => {
    if (selectedQuestionForManagement?.id) {
      const questionIndex = questions.findIndex(q => q.id === selectedQuestionForManagement.id)
      if (questionIndex !== -1) {
        setQuestionImages(prev => ({
          ...prev,
          [questionIndex]: images
        }))
      }
    }
  }

  const handleImageModalClose = () => {
    setShowImageModal(false)
    setSelectedQuestionForImages(null)
  }

  const handleManageImages = async (question: Question) => {
    if (!user?.accessToken) {
      alert('To create and manage images, please sign in to your account.')
      setShowAuthModal(true)
      return
    }

    let questionWithPrompts = question;
    if (!question.imagePrompts || question.imagePrompts.length === 0) {
      const extractedPrompts = extractImagePromptsFromQuestion(question);
      if (extractedPrompts.length > 0) {
        questionWithPrompts = {
          ...question,
          imagePrompts: extractedPrompts
        };
      } else {
        setSelectedQuestionForManagement(question)
        setShowImageManagementModal(true)
        return;
      }
    }

    if (questionWithPrompts.imagePrompts && questionWithPrompts.imagePrompts.length > 0) {
      try {
        const promptsWithIds = []
        
        for (const prompt of questionWithPrompts.imagePrompts) {
          const response = await fetch('/api/images/prompts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${user.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              question_id: questionWithPrompts.id,
              prompt_text: prompt.prompt,
              placement: (prompt as { placement?: string }).placement || 'question',
              style_preference: prompt.style || 'educational_diagram',
              original_ai_prompt: prompt.prompt
            })
          })
          
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data) {
              promptsWithIds.push({
                ...prompt,
                id: result.data.id,
                placeholder: prompt.placeholder
              })
            }
          }
        }
        
        const questionWithIds = {
          ...questionWithPrompts,
          imagePrompts: promptsWithIds
        }
        
        setSelectedQuestionForManagement(questionWithIds)
        setShowImageManagementModal(true)
        
      } catch (error) {
        console.error('Error saving prompts to database:', error)
        setSelectedQuestionForManagement(questionWithPrompts)
        setShowImageManagementModal(true)
      }
    } else {
      setSelectedQuestionForManagement(questionWithPrompts)
      setShowImageManagementModal(true)
    }
  }

  const handleImageManagementClose = () => {
    setShowImageManagementModal(false)
    setSelectedQuestionForManagement(null)
  }

  const handleImageManagementSelect = async (imageId: string, placeholder: string, isSelected: boolean) => {
    if (selectedQuestionForManagement?.id) {
      const questionIndex = questions.findIndex(q => q.id === selectedQuestionForManagement.id)
      if (questionIndex !== -1) {
        await loadQuestionImages(selectedQuestionForManagement.id, questionIndex)
      }
    }
  }

  const handleRefreshImages = async () => {
    if (selectedQuestionForManagement?.id) {
      const questionIndex = questions.findIndex(q => q.id === selectedQuestionForManagement.id)
      
      if (questionIndex !== -1) {
        await loadQuestionImages(selectedQuestionForManagement.id, questionIndex)
      } else {
        console.error('❌ Could not find question in questions array', {
          searchingForId: selectedQuestionForManagement.id,
          availableIds: questions.map(q => q.id)
        })
      }
    } else {
      console.error('❌ No question ID available in handleRefreshImages')
    }
  }

  // ── Unused variable removed (TODO comment was for a test button handler) ──
  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-6 sm:py-8 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-full sm:max-w-4xl mx-auto px-3 sm:px-4 space-y-6 sm:space-y-8">
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

        {saveError && (
          <div className="card p-4 sm:p-6 bg-red-50/80 border-red-200/50 text-red-700 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 dark:text-red-300" />
              <span className="font-medium text-sm sm:text-base">{saveError}</span>
            </div>
          </div>
        )}

        {/* Generation error */}
        {generationError && (
          <div className="card p-4 sm:p-6 bg-red-50/80 border-red-200/50 text-red-700 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 dark:text-red-300" />
              <span className="font-medium text-sm sm:text-base">{generationError}</span>
            </div>
          </div>
        )}

        {/* Review progress — shown as soon as a job starts */}
        {slots.length > 0 && (
          <div ref={resultsRef} className="card p-4 sm:p-6 space-y-4 bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                  {jobComplete ? 'Generation Complete' : 'Reviewing Questions...'}
                </h2>
              </div>
              {jobComplete && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {questions.length} passed · {slots.filter(s => s.status === 'discarded').length} discarded
                </span>
              )}
            </div>

            {/* Per-question progress cards */}
            <div className="grid gap-3">
              {slots.map(slot => (
                <ReviewProgressCard key={slot.index} slot={slot} />
              ))}
            </div>

            {/* Passed questions shown immediately */}
            {questions.length > 0 && (
              <>
                <SuccessStatus
                  questionCount={questions.length}
                  saveStatus={saveStatus}
                  user={user}
                  onShowAuthModal={() => setShowAuthModal(true)}
                />
                <SwipeableQuestions
                  questions={questions}
                  ratings={ratings}
                  avgRatings={avgRatings}
                  ratingLoading={ratingLoading}
                  onRate={handleRate}
                  getQuestionTypeDisplay={getQuestionTypeDisplay}
                  questionImages={questionImages}
                  onManageImages={handleManageImages}
                />
              </>
            )}

            {isLoading && questions.length === 0 && <LoadingSpinner />}
          </div>
        )}

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

        {selectedQuestionForImages && (
          <ImageGenerationModal
            isOpen={showImageModal}
            onClose={handleImageModalClose}
            question={selectedQuestionForImages}
            onImagesGenerated={handleImagesGenerated}
          />
        )}

        {selectedQuestionForManagement && (
          <ComprehensiveImageModal
            isOpen={showImageManagementModal}
            onClose={handleImageManagementClose}
            question={selectedQuestionForManagement}
            images={selectedQuestionForManagement?.id 
              ? (questionImages[questions.findIndex(q => q.id === selectedQuestionForManagement.id)] || [])
              : []}
            onImageSelect={handleImageManagementSelect}
            onRefreshImages={handleRefreshImages}
            onImagesGenerated={handleManagementImagesGenerated}
            questionId={selectedQuestionForManagement.id}
            useNewSchema={true}
          />
        )}
      </div>
    </main>
  )
}
