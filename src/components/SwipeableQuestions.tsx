import React, { useState, useEffect, useCallback } from "react"
import { useSwipeable } from "react-swipeable"
import QuestionCard from "./QuestionCard"

interface Question {
  id?: number
  type: string
  question: string
  options?: string[]
  correctAnswer: string
  correctAnswerLetter?: string
  explanation?: string
}

interface SwipeableQuestionsProps {
  questions: Question[]
  ratings: { [index: number]: number | null }
  avgRatings: { [index: number]: number | null }
  ratingLoading: { [index: number]: boolean }
  onRate: (questionId: number, index: number, rating: number) => void
  getQuestionTypeDisplay: (type: string) => string
}

const SwipeableQuestions: React.FC<SwipeableQuestionsProps> = ({
  questions,
  ratings,
  avgRatings,
  ratingLoading,
  onRate,
  getQuestionTypeDisplay
}) => {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState<"left" | "right" | null>(null) // for animation

  const goPrev = useCallback(() => {
    setDirection("left")
    setCurrent((i) => Math.max(i - 1, 0))
  }, [])
  const goNext = useCallback(() => {
    setDirection("right")
    setCurrent((i) => Math.min(i + 1, questions.length - 1))
  }, [questions.length])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [current, questions.length, goPrev, goNext])

  const handlers = useSwipeable({
    onSwipedLeft: goNext,
    onSwipedRight: goPrev,
    trackMouse: true // allows swipe with mouse on desktop
  })

  if (!questions.length) return <div>No questions generated yet.</div>

  return (
    <div {...handlers} className="relative w-full max-w-2xl mx-auto">
      <div
        key={current}
        className={`transition-transform duration-300 ease-in-out ${
          direction === "right"
            ? "animate-slide-in-right"
            : direction === "left"
            ? "animate-slide-in-left"
            : ""
        }`}
        onAnimationEnd={() => setDirection(null)}
      >
        <QuestionCard
          question={questions[current]}
          index={current}
          ratings={ratings}
          avgRatings={avgRatings}
          ratingLoading={ratingLoading}
          onRate={onRate}
          getQuestionTypeDisplay={getQuestionTypeDisplay}
        />
      </div>
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50"
        >
          ← Previous
        </button>
        <span className="text-sm text-gray-400">
          {current + 1} / {questions.length}
        </span>
        <button
          onClick={goNext}
          disabled={current === questions.length - 1}
          className="px-4 py-2 rounded bg-blue-700 text-white disabled:opacity-50"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

export default SwipeableQuestions