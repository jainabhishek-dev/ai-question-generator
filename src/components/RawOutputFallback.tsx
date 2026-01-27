import React, { useState, useEffect } from "react"
import { cleanJsonText } from '@/lib/jsonCleaner'

interface RawOutputFallbackProps {
  output: string
  onQuestionsRecovered?: (questions: unknown[]) => void
}

/**
 * Attempts aggressive recovery strategies for parsing failed AI responses
 * CRITICAL: Uses jsonCleaner first to fix LaTeX backslashes and JSON issues
 */
function attemptRecovery(text: string): unknown[] | null {
  // STEP 0: Clean the text FIRST using jsonCleaner
  // This fixes LaTeX commands like \circ, \sqrt, \frac which have invalid escape sequences
  const cleanedText = cleanJsonText(text);
  // Strategy 1: Direct parse of cleaned text
  try {
    const parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Strip all markdown code blocks from cleaned text
  try {
    const noMarkdown = cleanedText.replace(/```[a-z]*\n?/gi, '').trim();
    const parsed = JSON.parse(noMarkdown);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
  } catch {
    // Continue to next strategy
  }

  // Strategy 3: Extract JSON array with permissive regex
  try {
    const arrayMatches = cleanedText.match(/\[\s*\{[\s\S]*?\}\s*\]/g);
    if (arrayMatches) {
      for (const match of arrayMatches) {
        try {
          const parsed = JSON.parse(match);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {
          // Try next match
        }
      }
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 4: Extract JSON object with questions key
  try {
    const objMatch = cleanedText.match(/\{\s*["']questions["']\s*:\s*\[[\s\S]*?\]\s*\}/);
    if (objMatch) {
      const parsed = JSON.parse(objMatch[0]);
      if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 5: Unicode normalization + parse
  try {
    const normalized = cleanedText.normalize('NFKC');
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
  } catch {
    // Continue to next strategy
  }

  // Strategy 6: Find individual question objects and collect them
  try {
    const objectMatches = cleanedText.match(/\{[^{}]*"type"[^{}]*"question"[^{}]*\}/g);
    if (objectMatches && objectMatches.length > 0) {
      const questions: unknown[] = [];
      for (const match of objectMatches) {
        try {
          const parsed = JSON.parse(match);
          if (parsed && parsed.type && parsed.question) {
            questions.push(parsed);
          }
        } catch {
          // Skip invalid objects
        }
      }
      if (questions.length > 0) return questions;
    }
  } catch {
    // All recovery strategies failed
  }

  return null;
}

const RawOutputFallback: React.FC<RawOutputFallbackProps> = ({ output, onQuestionsRecovered }) => {
  const [isRecovering, setIsRecovering] = useState(true);
  const [recoveryStatus, setRecoveryStatus] = useState<'attempting' | 'success' | 'failed'>('attempting');
  const [recoveredCount, setRecoveredCount] = useState(0);

  useEffect(() => {
    // Automatically attempt recovery when component mounts
    const attemptAutoRecovery = async () => {
      setIsRecovering(true);
      setRecoveryStatus('attempting');
      
      // Small delay to show the attempting message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const recovered = attemptRecovery(output);
      
      if (recovered && recovered.length > 0) {
        setRecoveredCount(recovered.length);
        setRecoveryStatus('success');
        
        // Notify parent component if callback provided
        if (onQuestionsRecovered) {
          onQuestionsRecovered(recovered);
        }
      } else {
        setRecoveryStatus('failed');
      }
      
      setIsRecovering(false);
    };

    attemptAutoRecovery();
  }, [output, onQuestionsRecovered]);

  return (
    <div className="space-y-4">
      {/* Attempting Recovery Message */}
      {isRecovering && recoveryStatus === 'attempting' && (
        <div className="card p-4 sm:p-6 bg-blue-50/80 border-blue-200/50 text-blue-700 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <svg className="animate-spin w-5 h-5 text-blue-500 flex-shrink-0 dark:text-blue-300" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium text-sm sm:text-base">Attempting automatic recovery...</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {!isRecovering && recoveryStatus === 'success' && (
        <div className="card p-4 sm:p-6 bg-green-50/80 border-green-200/50 text-green-700 dark:bg-green-900/40 dark:border-green-700 dark:text-green-300">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-sm sm:text-base">
              Successfully recovered {recoveredCount} question{recoveredCount !== 1 ? 's' : ''}!
            </span>
          </div>
        </div>
      )}

      {/* Failed Message */}
      {!isRecovering && recoveryStatus === 'failed' && (
        <>
          <div className="card p-4 sm:p-6 bg-yellow-50/80 border-yellow-200/50 text-yellow-700 dark:bg-yellow-900/40 dark:border-yellow-700 dark:text-yellow-300">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="font-medium text-sm sm:text-base">Unable to parse AI response. See raw output below:</span>
            </div>
          </div>
          <div className="card p-4 sm:p-6 bg-white/90 border-white/50 dark:bg-gray-900/90 dark:border-gray-700/50">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center space-x-2 dark:text-gray-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>Raw AI Response</span>
            </h3>
            <pre className="whitespace-pre-wrap bg-gray-100 p-3 sm:p-4 rounded-xl text-xs sm:text-sm text-gray-800 border border-gray-200 overflow-auto max-h-96 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
              {output}
            </pre>
          </div>
        </>
      )}
    </div>
  )
}

export default RawOutputFallback