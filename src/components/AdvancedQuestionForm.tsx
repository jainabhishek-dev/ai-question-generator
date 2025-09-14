"use client"
import { useState } from "react"
import { createAdvancedPrompt } from "@/lib/gemini"
import { BookOpenIcon } from "@heroicons/react/24/outline";
import { subjectMap } from "./subjectMap"

interface Props {
  onGenerate: (prompt: string, inputs: Inputs) => void
  isLoading?: boolean
  currentQuestionCount: number
}

export interface Inputs {
  subject: string
  subSubject: string
  topic: string
  subTopic: string
  grade: string
  totalQuestions: number
  numMCQ: number
  numTrueFalse: number
  numFillBlank: number
  numShortAnswer: number
  numLongAnswer: number
  difficulty: string
  bloomsLevel: string
  pdfContent: string
  additionalNotes: string
  learningOutcome?: string
  question_source?: string // <-- add this
  [key: string]: unknown
}

const gradeOptions = [
  "Kindergarten","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5",
  "Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12",
  "Undergraduate","Graduate"
]

const subjectOptions = Object.keys(subjectMap)

const bloomsOptions = [
  "Remember","Understand","Apply","Analyze","Evaluate","Create"
]

const difficultyOptions = ["Easy","Medium","Hard"]

export default function AdvancedQuestionForm({ onGenerate, isLoading = false, currentQuestionCount }: Props) {
  const [inputs, setInputs] = useState<Inputs>({
    subject: "",
    subSubject: "",
    topic: "",
    subTopic: "",
    grade: "Grade 6",
    totalQuestions: 5,
    numMCQ: 1,
    numTrueFalse: 1,
    numFillBlank: 1,
    numShortAnswer: 1,
    numLongAnswer: 1,
    difficulty: "Medium",
    bloomsLevel: "Understand",
    pdfContent: "",
    additionalNotes: ""
  })
  const [error, setError] = useState("")
  if (currentQuestionCount >= 40) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-8 rounded-xl text-center mt-8">
        <h2 className="text-xl font-bold mb-2">Question Limit Reached</h2>
        <p>You have reached your free limit of 40 questions. To create more, please subscribe.</p>
      </div>
    )
  }
  const subSubjectOptions = subjectMap[inputs.subject] || []

  const handleChange = (key: keyof Inputs, value: string | number) =>
    setInputs(prev => ({ ...prev, [key]: value }))

  const validateDistribution = () => {
    const { totalQuestions, numMCQ, numFillBlank, numShortAnswer, numLongAnswer, numTrueFalse } = inputs
    const sum = numMCQ + numFillBlank + numShortAnswer + numLongAnswer + numTrueFalse
    if (totalQuestions > 10) {
    setError("You can generate a maximum of 10 questions at a time.")
    return false
  }
    if (totalQuestions !== sum) {
      setError(`Total Questions (${totalQuestions}) must equal sum of distribution (${sum})`)
      return false
    }
    setError("")
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
      if (currentQuestionCount >= 40) {
      setError("You have reached your free limit of 100 questions. To create more, please subscribe.")
    return
  }
    if (currentQuestionCount + inputs.totalQuestions > 40) {
      setError(`You can only create ${40 - currentQuestionCount} more questions. Reduce the total or delete some questions.`)
      return
  }
    if (!validateDistribution()) return
    const prompt = createAdvancedPrompt(inputs)
    onGenerate(prompt, inputs)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Subject Information Card */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
            {/* Book/subject icon */}
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6v14a1 1 0 001 1h16a1 1 0 001-1V6" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l9 6 9-6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex-1">Subject Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <select
              value={inputs.subject}
              onChange={e => {
                handleChange("subject", e.target.value)
                handleChange("subSubject", "") // Reset sub-subject
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              required
            >
              <option value="">Select subject</option>
              {subjectOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Subject</label>
            <select
              value={inputs.subSubject}
              onChange={e => handleChange("subSubject", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              disabled={!inputs.subject}
              required={!!inputs.subject}
            >
              <option value="">Select sub-subject</option>
              {subSubjectOptions.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic *</label>
            <input
              type="text"
              placeholder="e.g., Linear Equations, Cell Division"
              value={inputs.topic}
              onChange={e => handleChange("topic", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Topic</label>
            <input
              type="text"
              placeholder="e.g., Solving for X, Mitosis"
              value={inputs.subTopic}
              onChange={e => handleChange("subTopic", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Question Settings Card */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl flex items-center justify-center mr-3">
            {/* Settings/gear icon */}
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zm7.5-3.5a7.5 7.5 0 0 1-1.1 3.9l1.6 2.8a1 1 0 0 1-1.3 1.4l-3.2-1.3a7.5 7.5 0 0 1-3.9 1.1V21a1 1 0 0 1-2 0v-1.1a7.5 7.5 0 0 1-3.9-1.1l-3.2 1.3a1 1 0 0 1-1.3-1.4l1.6-2.8A7.5 7.5 0 0 1 4.5 12c0-.7.1-1.4.2-2.1l-1.6-2.8a1 1 0 0 1 1.3-1.4l3.2 1.3a7.5 7.5 0 0 1 3.9-1.1V3a1 1 0 0 1 2 0v1.1a7.5 7.5 0 0 1 3.9 1.1l3.2-1.3a1 1 0 0 1 1.3 1.4l-1.6 2.8c.1.7.2 1.4.2 2.1z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex-1">Question Settings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
            <select
              value={inputs.grade}
              onChange={e => handleChange("grade", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
            <select
              value={inputs.difficulty}
              onChange={e => handleChange("difficulty", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              {difficultyOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bloom&apos;s Taxonomy Level</label>
            <select
              value={inputs.bloomsLevel}
              onChange={e => handleChange("bloomsLevel", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              {bloomsOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Question Distribution Card */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-xl flex items-center justify-center mr-3">
            {/* Pie chart/distribution icon */}
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3v8h8a8 8 0 1 1-8-8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex-1">Question Distribution</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Questions *</label>
            <input
              type="number"
              min={1}
              max={10}
              value={inputs.totalQuestions}
              onChange={e => handleChange("totalQuestions", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MCQ</label>
            <input
              type="number"
              min={0}
              value={inputs.numMCQ}
              onChange={e => handleChange("numMCQ", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fill in Blanks</label>
            <input
              type="number"
              min={0}
              value={inputs.numFillBlank}
              onChange={e => handleChange("numFillBlank", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">True-False</label>
            <input
              type="number"
              min={0}
              value={inputs.numTrueFalse}
              onChange={e => handleChange("numTrueFalse", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Short Answer</label>
            <input
              type="number"
              min={0}
              value={inputs.numShortAnswer}
              onChange={e => handleChange("numShortAnswer", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Long Answer</label>
            <input
              type="number"
              min={0}
              value={inputs.numLongAnswer}
              onChange={e => handleChange("numLongAnswer", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Distribution total: {inputs.numMCQ + inputs.numFillBlank + inputs.numTrueFalse + inputs.numShortAnswer + inputs.numLongAnswer}
        </p>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mt-4">
            {error}
          </div>
        )}
      </div>

      {/* Reference Content Card (Optional) */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
            {/* Document/content icon */}
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8M8 8h8M4 6a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex-1">Reference Content (Optional)</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chapter/PDF Content</label>
          <textarea
            value={inputs.pdfContent}
            onChange={e => handleChange("pdfContent", e.target.value)}
            placeholder="Paste chapter content, textbook passages, or any reference material here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 h-32 resize-vertical"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes to AI</label>
          <textarea
            value={inputs.additionalNotes}
            onChange={e => handleChange("additionalNotes", e.target.value)}
            placeholder="Any special instructions or focus areas for the AI..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 h-24 resize-vertical"
          />
        </div>
      </div>

      {/* Submit Button Card */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow duration-300">
        <button 
          type="submit" 
          className={`
            w-full font-medium py-4 px-6 rounded-xl transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${isLoading || currentQuestionCount >= 100
              ? 'bg-blue-500 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
            }
            text-white shadow-md
          `}
          disabled={isLoading || currentQuestionCount >= 100}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-3">
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span>Generating Questions...</span>
            </div>
          ) : (
            <span className="text-lg">Generate Questions ✨</span>
          )}
        </button>
      </div>
    </form>
  )
}