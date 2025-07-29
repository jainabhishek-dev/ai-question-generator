"use client"
import { useState } from "react"
import { createAdvancedPrompt } from "@/lib/gemini"

interface Props {
  onGenerate: (prompt: string, inputs: Inputs) => void
}

export interface Inputs {
  subject: string
  subSubject: string
  topic: string
  subTopic: string
  grade: string
  totalQuestions: number
  numMCQ: number
  numFillBlank: number
  numShortAnswer: number
  numLongAnswer: number
  difficulty: string
  bloomsLevel: string
  pdfContent: string
  additionalNotes: string
}

const gradeOptions = [
  "Kindergarten","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5",
  "Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12",
  "Undergraduate","Graduate"
]

const bloomsOptions = [
  "Remember","Understand","Apply","Analyze","Evaluate","Create"
]

const difficultyOptions = ["Easy","Medium","Hard"]

export default function AdvancedQuestionForm({ onGenerate }: Props) {
  const [inputs, setInputs] = useState<Inputs>({
    subject: "",
    subSubject: "",
    topic: "",
    subTopic: "",
    grade: "Grade 6",
    totalQuestions: 10,
    numMCQ: 4,
    numFillBlank: 2,
    numShortAnswer: 3,
    numLongAnswer: 1,
    difficulty: "Medium",
    bloomsLevel: "Understand",
    pdfContent: "",
    additionalNotes: ""
  })
  const [error, setError] = useState("")

  const handleChange = (key: keyof Inputs, value: string | number) =>
    setInputs(prev => ({ ...prev, [key]: value }))

  const validateDistribution = () => {
    const { totalQuestions, numMCQ, numFillBlank, numShortAnswer, numLongAnswer } = inputs
    const sum = numMCQ + numFillBlank + numShortAnswer + numLongAnswer
    if (totalQuestions !== sum) {
      setError(`Total Questions (${totalQuestions}) must equal sum of distribution (${sum})`)
      return false
    }
    setError("")
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateDistribution()) return
    const prompt = createAdvancedPrompt(inputs)
    onGenerate(prompt, inputs)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">AI Question Generator</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Subject Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Subject Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input
                type="text"
                placeholder="e.g., Mathematics, Science, History"
                value={inputs.subject}
                onChange={e => handleChange("subject", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Subject</label>
              <input
                type="text"
                placeholder="e.g., Algebra, Biology, World War II"
                value={inputs.subSubject}
                onChange={e => handleChange("subSubject", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Question Settings</h3>
          
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Bloom's Taxonomy Level</label>
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

        {/* Question Distribution */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Question Distribution</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Questions *</label>
              <input
                type="number"
                min={1}
                max={50}
                value={inputs.totalQuestions}
                onChange={e => handleChange("totalQuestions", Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Multiple Choice</label>
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
          
          <p className="text-sm text-gray-600">
            Distribution total: {inputs.numMCQ + inputs.numFillBlank + inputs.numShortAnswer + inputs.numLongAnswer}
          </p>
        </div>

        {/* Content Input */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Reference Content (Optional)</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chapter/PDF Content</label>
            <textarea
              value={inputs.pdfContent}
              onChange={e => handleChange("pdfContent", e.target.value)}
              placeholder="Paste chapter content, textbook passages, or any reference material here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 h-32 resize-vertical"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes to AI</label>
            <textarea
              value={inputs.additionalNotes}
              onChange={e => handleChange("additionalNotes", e.target.value)}
              placeholder="Any special instructions or focus areas for the AI..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 h-24 resize-vertical"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Generate Questions
        </button>
      </form>
    </div>
  )
}
