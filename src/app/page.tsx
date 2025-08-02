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
  prompt?: string      // <-- Add this line
  options?: string[]
  choices?: string[]   // <-- (optional) if you want to normalize from 'choices'
  correctAnswer: string
  correctAnswerLetter?: string   // <-- Add this line
  answer?: string      // <-- (optional) if you want to normalize from 'answer'
  explanation?: string
}

export default function Home() {
  const [output, setOutput] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { user, loading, signOut } = useAuth()
  
  // filepath: c:\Users\Archi\Projects\ai-question-generator\src\app\page.tsx
const parseQuestions = (text: string): Question[] => {
  let cleanText = text.trim();

  // Remove markdown code block wrappers (``` or ```json)
  cleanText = cleanText.replace(/^```(?:json)?/im, '').replace(/```$/m, '');

  // Remove leading/trailing quotes/backticks
  cleanText = cleanText.replace(/^["'`]+|["'`]+$/g, '');

  // Try to find the first JSON array or object in the text
  const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
  const objectMatch = cleanText.match(/\{[\s\S]*\}/);

  let jsonString = arrayMatch ? arrayMatch[0] : objectMatch ? objectMatch[0] : cleanText;

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
            if (opt && typeof opt === "object" && Object.prototype.hasOwnProperty.call(opt, "text")) return String((opt as any).text);
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
    <div key={index} className="bg-white p-6 rounded-lg shadow-md border">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Question {index + 1}</h3>
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
          {getQuestionTypeDisplay(q.type)}
        </span>
      </div>

      {/* Render question with math support */}
      <div className="text-gray-700 mb-4 leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {q.question}
        </ReactMarkdown>
      </div>

      {/* Only show options for multiple choice questions */}
      {isMultipleChoice && q.options && (
        <div className="mb-4">
          <ul className="space-y-2">
            {q.options.map((option, i) => {
  if (typeof option !== "string") return null; // Skip non-string options
  const label = String.fromCharCode(65 + i); // A, B, C, D...
  const cleanedOption = option.replace(/^[A-Z][\)\.]\s*/i, "");
  const isCorrect = q.correctAnswerLetter === label;
  return (
    <li
      key={i}
      className={`text-gray-600 pl-2 flex items-baseline ${isCorrect ? "font-bold text-green-700" : ""}`}
    >
      <span className="inline-flex items-baseline">
        <strong>{label})&nbsp;</strong>
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            p: ({ children }) => <span>{children}</span>
          }}
        >
          {cleanedOption}
        </ReactMarkdown>
      </span>
      {isCorrect && <span className="ml-2 text-green-600 font-semibold">(Correct)</span>}
    </li>
  );
})}
          </ul>
        </div>
      )}

      <div className="border-t pt-3 mt-4 space-y-2">
        <div className="font-medium text-green-700 mb-4 pb-2 border-b border-green-100">
          <strong className="block mb-2 text-lg">Answer:</strong>
          <div className="pl-2 text-base leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {q.correctAnswer}
            </ReactMarkdown>
          </div>
        </div>
        {q.explanation && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-gray-700 text-base mt-2">
            <strong className="block mb-2 text-lg">Explanation:</strong>
            <div className="leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
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
  <main className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-4xl mx-auto px-4 space-y-8">
      
      {/* ...removed duplicate header and sign in/sign out button... */}

      {/* Your existing AdvancedQuestionForm - NO CHANGES */}
      <AdvancedQuestionForm onGenerate={handleGenerate} />

      {/* Your existing Results Section - NO CHANGES */}
      {(questions.length > 0 || output) && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Generated Questions</h2>
          
          {/* Formatted Questions */}
          {questions.length > 0 && (
  <div className="space-y-4">
    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
      ✅ Successfully generated {questions.length} questions
      {saveStatus === 'saving' && (
        <span className="ml-2 text-blue-600">• Saving...</span>
      )}
      {saveStatus === 'saved' && user && (
        <span className="ml-2 text-green-600">• Saved to My Questions</span>
      )}
      {saveStatus === 'saved' && !user && (
        <span className="ml-2 text-orange-600">• Questions generated! Sign in to save to personal library</span>
      )}
    </div>
    
    {/* NEW: Encourage sign-up for non-authenticated users */}
    {saveStatus === 'saved' && !user && (
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
        💡 <strong>Want to build your personal question library?</strong> 
        <button 
          onClick={() => setShowAuthModal(true)}
          className="ml-2 underline hover:no-underline font-medium"
        >
          Sign up for free
        </button> to save, organize, and manage your questions!
      </div>
    )}
    
    {/* Show save error if it occurs */}
    {saveStatus === 'error' && (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
        ⚠️ Questions generated successfully! {saveError && <span>Error details: {saveError}</span>}
      </div>
    )}
    
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

      {/* NEW: Authentication Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  </main>
 )

}
