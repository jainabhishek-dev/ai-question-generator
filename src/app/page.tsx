"use client"
import { useState } from "react"
import AdvancedQuestionForm, { Inputs } from "@/components/AdvancedQuestionForm"
import { generateQuestions } from "@/lib/gemini"

interface Question {
  type: string
  question: string
  prompt?: string      // <-- Add this line
  options?: string[]
  choices?: string[]   // <-- (optional) if you want to normalize from 'choices'
  correctAnswer: string
  answer?: string      // <-- (optional) if you want to normalize from 'answer'
  explanation?: string
}

export default function Home() {
  const [output, setOutput] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // filepath: c:\Users\Archi\Projects\ai-question-generator\src\app\page.tsx
const parseQuestions = (text: string): Question[] => {
  let cleanText = text.trim();

  // Remove markdown code block wrappers (``` or ```json)
  cleanText = cleanText.replace(/^```(?:json)?/im, '').replace(/```$/m, '');

  // Remove leading/trailing quotes/backticks
  cleanText = cleanText.replace(/^["'`]+|["'`]+$/g, '');

  // Try to find the first JSON array or object in the text
  const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
  const objectMatch = cleanText.match(/\{[\s\S]*?\}/);

  let jsonString = arrayMatch ? arrayMatch[0] : objectMatch ? objectMatch[0] : cleanText;

  try {
    const parsed = JSON.parse(jsonString);

    // If the parsed result is an object with a 'questions' array, return that array
    if (!Array.isArray(parsed) && parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions;
    }
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error("Failed to parse questions:", error);
    console.error("Raw text was:", text);
    console.error("Cleaned text was:", jsonString);
    return tryAlternativeParsing(text);
  }
}

// Fallback parsing method
const tryAlternativeParsing = (text: string): Question[] => {
  try {
    // Look for JSON-like structure and extract it
    const lines = text.split('\n')
    let jsonStart = -1
    let jsonEnd = -1
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('{') && jsonStart === -1) {
        jsonStart = i
      }
      if (lines[i].includes('}') && jsonStart !== -1) {
        jsonEnd = i
      }
    }
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonText = lines.slice(jsonStart, jsonEnd + 1).join('\n')
      const parsed = JSON.parse(jsonText)
      return Array.isArray(parsed) ? parsed : [parsed]
    }
    
    return []
  } catch (error) {
    console.error("Alternative parsing also failed:", error)
    return []
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

  try {
    const text = await generateQuestions(inputs)
    setOutput(text)

    let parsedQuestions = parseQuestions(text)

    // Normalize fields for all question types
    parsedQuestions = parsedQuestions.map(q => ({
      type: q.type,
      question: q.question || q.prompt || "",
      options: q.options || q.choices || [],
      correctAnswer: q.correctAnswer || q.answer || "",
      explanation: q.explanation || ""
    }))

    setQuestions(parsedQuestions)
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
    <div key={index} className="bg-white p-6 rounded-lg shadow-md border">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Question {index + 1}</h3>
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
          {getQuestionTypeDisplay(q.type)}
        </span>
      </div>
      
      <p className="text-gray-700 mb-4 leading-relaxed">{q.question}</p>
      
      {/* Only show options for multiple choice questions */}
      {isMultipleChoice && q.options && (
        <div className="mb-4">
          <ul className="space-y-2">
            {q.options.map((option, i) => (
              <li key={i} className="text-gray-600 pl-2">
                {option} {/* Options already have A), B), C), D) prefixes */}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="border-t pt-3 mt-4 space-y-2">
        <p className="font-medium text-green-700">
          <strong>Answer:</strong> {q.correctAnswer}
        </p>
        {q.explanation && (
          <p className="text-gray-600 text-sm">
            <strong>Explanation:</strong> {q.explanation}
          </p>
        )}
      </div>
    </div>
  )
}

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <AdvancedQuestionForm onGenerate={handleGenerate} />

        {/* Results Section */}
        {(questions.length > 0 || output) && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Generated Questions</h2>
            
            {/* Formatted Questions */}
            {questions.length > 0 && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
                  ✅ Successfully generated {questions.length} questions
                </div>
                {questions.map((q, i) => formatQuestion(q, i))}
              </div>
            )}
            
            {/* Loading Spinner */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Generating questions...</p>
              </div>
            )}
            
            {/* Show raw output only if parsing failed */}
            {output && questions.length === 0 && !isLoading && (
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">Raw AI Response:</h3>
                <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded-lg text-sm text-gray-800 border">
                  {output}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
