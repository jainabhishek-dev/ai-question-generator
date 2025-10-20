import { cleanJsonText } from './jsonCleaner';
import { escapeCurrencyDollarsSmart } from './textCleaner';

export interface Question {
  id?: number;
  type: string;
  question: string;
  prompt?: string;
  options?: string[];
  choices?: string[];
  correctAnswer: string;
  correctAnswerLetter?: string;
  answer?: string;
  explanation?: string;
}

// Interface for raw parsed question data from AI
interface RawQuestionData {
  type?: string;
  question?: string;
  prompt?: string;
  options?: unknown;
  choices?: unknown;
  correctAnswer?: unknown;
  answer?: string;
  explanation?: string;
}

// Interface for option objects that might have a text property
interface OptionWithText {
  text: string;
}

/**
 * Parses AI-generated text into structured Question objects
 * Handles various formats and edge cases in AI responses
 */
export function parseQuestions(text: string): Question[] {
  const cleanText = cleanJsonText(text);

  try {
    const parsed = JSON.parse(cleanText);

    // If the parsed result is an object with a 'questions' array, return that array
    if (!Array.isArray(parsed) && parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions;
    }
    // If it's a single question object, wrap in array
    if (!Array.isArray(parsed) && parsed.type && parsed.question) {
      return [parsed];
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Last resort: try to extract JSON from the text using regex
    try {
      const jsonMatch = cleanText.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (jsonMatch) {
        const extractedJson = jsonMatch[1];
        const fallbackParsed = JSON.parse(extractedJson);
        
        if (Array.isArray(fallbackParsed)) {
          return fallbackParsed;
        } else if (fallbackParsed.questions && Array.isArray(fallbackParsed.questions)) {
          return fallbackParsed.questions;
        } else if (fallbackParsed.type && fallbackParsed.question) {
          return [fallbackParsed];
        }
      }
    } catch {
      // Silent fallback failure
    }
    
    return [];
  }
}

/**
 * Processes and normalizes parsed questions for display
 * Handles various option formats, answer formats, and applies text cleaning
 */
export function processQuestions(parsedQuestions: RawQuestionData[]): Question[] {
  return parsedQuestions
    .filter(q => q && (q.question || q.prompt || q.correctAnswer || q.answer))
    .map(q => {
      let options: string[] = [];
      // Only normalize options for multiple-choice
      if (q.type === "multiple-choice") {
        let rawOptions = q.options || q.choices || [];
        if (rawOptions && typeof rawOptions === "object" && !Array.isArray(rawOptions)) {
          rawOptions = Object.keys(rawOptions)
            .sort()
            .map(key => ((rawOptions as Record<string, string>))[key]);
        }
        if (Array.isArray(rawOptions)) {
          options = rawOptions.map(opt => {
            if (typeof opt === "string" || typeof opt === "number") return String(opt);
            // If option is an object with a 'text' property, use that
            if (opt && typeof opt === "object" && Object.prototype.hasOwnProperty.call(opt, "text")) {
              return String((opt as OptionWithText).text);
            }
            // Otherwise, try JSON.stringify as last resort
            return typeof opt !== "undefined" ? JSON.stringify(opt) : "";
          });
        }
      }

      let correctAnswer = "";
      let correctAnswerLetter = "";

      // Handle various correctAnswer formats
      if (Array.isArray(q.correctAnswer)) {
        // Join array elements with proper formatting
        correctAnswer = q.correctAnswer
          .filter((item: unknown) => item && typeof item === 'string')
          .map((item: unknown) => String(item).trim())
          .join('\n');
      } else if (typeof q.correctAnswer === "string") {
        correctAnswer = q.correctAnswer.trim();
        const match = q.correctAnswer.match(/^[A-Z]/i);
        correctAnswerLetter = match ? match[0].toUpperCase() : "";
      } else if (typeof q.answer === "string") {
        correctAnswer = q.answer.trim();
      } else if (q.correctAnswer && typeof q.correctAnswer === 'object') {
        // Handle object format (sometimes AI returns objects)
        correctAnswer = JSON.stringify(q.correctAnswer);
      }

      const processedQuestion: Question = {
        type: q.type || "unknown",
        question: escapeCurrencyDollarsSmart(q.question || q.prompt || ""),
        options: options.map(escapeCurrencyDollarsSmart),
        correctAnswer: escapeCurrencyDollarsSmart(correctAnswer),
        correctAnswerLetter,
        explanation: escapeCurrencyDollarsSmart(q.explanation || "")
      };
      
      return processedQuestion;
    });
}