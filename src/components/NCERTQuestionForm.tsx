import React, { useEffect, useState } from "react"
import { fetchNCERTMetadata } from "@/lib/fetchNCERTMetadata"
import { Inputs } from "@/components/AdvancedQuestionForm"

interface NCERTMetadata {
  subject: string
  grade: string
  chapter_number: number
  chapter_name: string
  outcome1?: string
  outcome2?: string
  outcome3?: string
  outcome4?: string
  outcome5?: string
}

interface Props {
  onGenerate: (inputs: Inputs) => void
  isLoading: boolean
}

const bloomsOptions = [
  "Remember","Understand","Apply","Analyze","Evaluate","Create"
]

const difficultyOptions = ["Easy","Medium","Hard"]

export default function NCERTQuestionForm({ onGenerate, isLoading }: Props) {
  const [ncertData, setNCERTData] = useState<NCERTMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [subject, setSubject] = useState("")
  const [grade, setGrade] = useState("")
  const [chapterName, setChapterName] = useState("")
  const [difficulty, setDifficulty] = useState("Medium")
  const [bloomsLevel, setBloomsLevel] = useState("Understand")
  const [totalQuestions, setTotalQuestions] = useState(5)
  const [numMCQ, setNumMCQ] = useState(1)
  const [numTrueFalse, setNumTrueFalse] = useState(1)
  const [numFillBlank, setNumFillBlank] = useState(1)
  const [numShortAnswer, setNumShortAnswer] = useState(1)
  const [numLongAnswer, setNumLongAnswer] = useState(1)
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [distributionError, setDistributionError] = useState("")
  const [learningOutcomeOptions, setLearningOutcomeOptions] = useState<string[]>([])
  const [learningOutcome, setLearningOutcome] = useState("")


  useEffect(() => {
    fetchNCERTMetadata()
      .then((data: NCERTMetadata[]) => {
        setNCERTData(data)
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to fetch NCERT metadata")
        setLoading(false)
      })
  }, [])

  // Dropdown options
  const subjectOptions = Array.from(new Set(ncertData.map(d => d.subject)))
  const gradeOptions = Array.from(new Set(ncertData.filter(d => d.subject === subject).map(d => d.grade)))
  const chapterNameOptions = ncertData
  .filter(d => d.subject === subject && d.grade === grade)
  .map(d => ({ name: d.chapter_name, number: d.chapter_number }));

  // Update learning outcome when chapter name changes
  useEffect(() => {
    const selectedChapter = ncertData.find(d =>
      d.subject === subject &&
      d.grade === grade &&
      d.chapter_name === chapterName
    )
    const options = [
      selectedChapter?.outcome1,
      selectedChapter?.outcome2,
      selectedChapter?.outcome3,
      selectedChapter?.outcome4,
      selectedChapter?.outcome5
    ].filter((x): x is string => !!x)
    setLearningOutcomeOptions(options)
    setLearningOutcome("")
  }, [subject, grade, chapterName, ncertData])

  // Validate question distribution
  useEffect(() => {
    const sum = numMCQ + numFillBlank + numTrueFalse + numShortAnswer + numLongAnswer
    if (totalQuestions > 10) {
      setDistributionError("You can generate a maximum of 10 questions at a time.")
    } else if (totalQuestions !== sum) {
      setDistributionError(`Total Questions (${totalQuestions}) must equal sum of distribution (${sum})`)
    } else {
      setDistributionError("")
    }
  }, [totalQuestions, numMCQ, numFillBlank, numTrueFalse, numShortAnswer, numLongAnswer])

  const handleGenerateClick = () => {
    if (distributionError) return
    const selectedChapter = ncertData.find(d =>
      d.subject === subject &&
      d.grade === grade &&
      d.chapter_name === chapterName
    )
    onGenerate({
      subject,
      grade,
      chapterNumber: selectedChapter?.chapter_number ?? "",
      chapterName,
      learningOutcome,
      difficulty,
      bloomsLevel,
      totalQuestions,
      numMCQ,
      numTrueFalse,
      numFillBlank,
      numShortAnswer,
      numLongAnswer,
      additionalNotes,
      question_source: "ncert",
      subSubject: "",
      topic: "",
      subTopic: "",
      pdfContent: ""
    })
  }

  return (
    <form className="space-y-8">
      {/* NCERT Selection Card */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6v14a1 1 0 001 1h16a1 1 0 001-1V6" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l9 6 9-6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex-1">NCERT Chapter Selection</h3>
        </div>
        {loading && <div>Loading NCERT data...</div>}
        {error && <div className="text-red-500">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <select value={subject} onChange={e => {
              setSubject(e.target.value)
              setGrade("")
              setChapterName("")
              setLearningOutcome("")
            }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" required>
              <option value="">Select Subject</option>
              {subjectOptions.map(subj => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
            <select value={grade} onChange={e => {
              setGrade(e.target.value)
              setChapterName("")
              setLearningOutcome("")
            }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" required disabled={!subject}>
              <option value="">Select Grade</option>
              {gradeOptions.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Chapter Name *</label>
            <select
              value={chapterName}
              onChange={e => setChapterName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              required
              disabled={!grade}
            >
              <option value="">Select Chapter Name</option>
              {chapterNameOptions.map(ch => (
                <option key={ch.name} value={ch.name}>
                  {`Chapter ${ch.number}: ${ch.name}`}
                </option>
              ))}
            </select>
          </div>
          
          {/* Learning Outcome Selection */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Learning Outcome *</label>
            {learningOutcomeOptions.length === 0 ? (
              <div className="text-gray-500 text-sm">Please select subject, grade, and chapter details to view available learning outcomes.</div>
            ) : (
              <div className="space-y-2">
                {learningOutcomeOptions.map((outcome, idx) => (
                  <label key={idx} className="flex items-start space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="learningOutcome"
                      value={outcome}
                      checked={learningOutcome === outcome}
                      onChange={() => setLearningOutcome(outcome)}
                      className="mt-1"
                      required
                    />
                    <span className="text-xs text-gray-900 break-words text-justify">{outcome}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Question Settings Card */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zm7.5-3.5a7.5 7.5 0 0 1-1.1 3.9l1.6 2.8a1 1 0 0 1-1.3 1.4l-3.2-1.3a7.5 7.5 0 0 1-3.9 1.1V21a1 1 0 0 1-2 0v-1.1a7.5 7.5 0 0 1-3.9-1.1l-3.2 1.3a1 1 0 0 1-1.3-1.4l1.6-2.8A7.5 7.5 0 0 1 4.5 12c0-.7.1-1.4.2-2.1l-1.6-2.8a1 1 0 0 1 1.3-1.4l3.2 1.3a7.5 7.5 0 0 1 3.9-1.1V3a1 1 0 0 1 2 0v1.1a7.5 7.5 0 0 1 3.9 1.1l3.2-1.3a1 1 0 0 1 1.3 1.4l-1.6 2.8c.1.7.2 1.4.2 2.1z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex-1">Question Settings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              {difficultyOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bloom&apos;s Taxonomy Level</label>
            <select
              value={bloomsLevel}
              onChange={e => setBloomsLevel(e.target.value)}
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
              value={totalQuestions}
              onChange={e => setTotalQuestions(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MCQ</label>
            <input
              type="number"
              min={0}
              value={numMCQ}
              onChange={e => setNumMCQ(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fill in Blanks</label>
            <input
              type="number"
              min={0}
              value={numFillBlank}
              onChange={e => setNumFillBlank(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">True-False</label>
            <input
              type="number"
              min={0}
              value={numTrueFalse}
              onChange={e => setNumTrueFalse(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Short Answer</label>
            <input
              type="number"
              min={0}
              value={numShortAnswer}
              onChange={e => setNumShortAnswer(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Long Answer</label>
            <input
              type="number"
              min={0}
              value={numLongAnswer}
              onChange={e => setNumLongAnswer(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Distribution total: {numMCQ + numFillBlank + numTrueFalse + numShortAnswer + numLongAnswer}
        </p>
        {distributionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mt-4">
            {distributionError}
          </div>
        )}
      </div>

      {/* Additional Notes Card */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8M8 8h8M4 6a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex-1">Additional Notes to AI</h3>
        </div>
        <textarea
          value={additionalNotes}
          onChange={e => setAdditionalNotes(e.target.value)}
          placeholder="Any special instructions or focus areas for the AI..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md h-24 resize-vertical"
        />
      </div>

      {/* Submit Button Card */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow duration-300">
        <button
          type="button"
          className={`
            w-full font-medium py-4 px-6 rounded-xl transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${isLoading || loading || distributionError ||
              !subject || !grade || !chapterName
              ? 'bg-blue-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
            }
            text-white shadow-md
          `}
          disabled={
            isLoading || loading || !!distributionError ||
            !subject || !grade || !chapterName
          }
          onClick={handleGenerateClick}
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