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
  // Image-related properties
  imagePrompts?: Array<{
    placeholder: string;
    prompt: string;
    purpose: string;
    accuracy?: string;
    style?: string;
  }>;
  hasImages?: boolean;
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
  // Image-related properties from AI response
  imagePrompts?: unknown;
  images?: unknown;
  hasImages?: boolean;
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
 * Extracts image placeholders from question text
 * Supports [IMG: description], [IMAGE: description] and legacy formats
 */
export function extractImagePlaceholders(text: string): Array<{
  placeholder: string;
  description: string;
  fullMatch: string;
}> {
  const placeholders: Array<{
    placeholder: string;
    description: string;
    fullMatch: string;
  }> = [];

  // Pattern 1: [IMG: description] (new preferred format)
  const imgPattern = /\[IMG:\s*([^\]]+)\]/gi;
  let match;
  while ((match = imgPattern.exec(text)) !== null) {
    placeholders.push({
      placeholder: `IMG_${placeholders.length + 1}`,
      description: match[1].trim(),
      fullMatch: match[0]
    });
  }

  // Pattern 2: [IMAGE: description] (backward compatibility)
  const imagePattern = /\[IMAGE:\s*([^\]]+)\]/gi;
  while ((match = imagePattern.exec(text)) !== null) {
    placeholders.push({
      placeholder: `IMAGE_${placeholders.length + 1}`,
      description: match[1].trim(),
      fullMatch: match[0]
    });
  }

  // Pattern 3: [IMAGE_PLACEHOLDER_N] (legacy format)
  const placeholderPattern = /\[IMAGE_PLACEHOLDER_(\d+)\]/gi;
  while ((match = placeholderPattern.exec(text)) !== null) {
    placeholders.push({
      placeholder: `IMAGE_PLACEHOLDER_${match[1]}`,
      description: `Image placeholder ${match[1]}`,
      fullMatch: match[0]
    });
  }

  return placeholders;
}

/**
 * Replaces image placeholders in text with temporary display elements
 */
export function replaceImagePlaceholders(
  text: string, 
  replacement: string = "[Image Placeholder]"
): string {
  return text
    .replace(/\[IMG:\s*[^\]]+\]/gi, replacement)           // New [IMG: format
    .replace(/\[IMAGE:\s*[^\]]+\]/gi, replacement)         // Backward compatibility
    .replace(/\[IMAGE_PLACEHOLDER_\d+\]/gi, replacement);  // Legacy format
}

/**
 * Extracts image prompts from entire question object with automatic placement detection
 */
export function extractImagePromptsFromQuestion(question: RawQuestionData): Array<{
  placeholder: string;
  prompt: string;
  purpose: string;
  placement: string;
  accuracy?: string;
  style?: string;
}> {
  const imagePrompts: Array<{
    placeholder: string;
    prompt: string;
    purpose: string;
    placement: string;
    accuracy?: string;
    style?: string;
  }> = [];

  // Define fields to search with their corresponding placement values
  const fieldsToSearch = [
    { content: question.question || '', placement: 'question' },
    { content: question.explanation || '', placement: 'explanation' }
  ];

  // Add options if they exist
  if (Array.isArray(question.options)) {
    question.options.forEach((option, index) => {
      const optionText = typeof option === 'string' ? option : 
                        typeof option === 'object' && option && 'text' in option ? (option as OptionWithText).text : 
                        String(option);
      fieldsToSearch.push({
        content: optionText,
        placement: `option_${String.fromCharCode(97 + index)}` // a, b, c, d
      });
    });
  }

  // Extract placeholders from each field
  fieldsToSearch.forEach(field => {
    const placeholders = extractImagePlaceholders(field.content);
    placeholders.forEach((placeholder, index) => {
      imagePrompts.push({
        placeholder: `${field.placement}_img_${index + 1}`,
        prompt: placeholder.description,
        purpose: `Educational image for ${field.placement}`,
        placement: field.placement,
        style: 'educational_diagram'
      });
    });
  });

  return imagePrompts;
}

/**
 * Validates that image prompts match placeholders in question text
 */
export function validateImagePrompts(question: Question): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!question.hasImages && (!question.imagePrompts || question.imagePrompts.length === 0)) {
    return { isValid: true, issues: [], suggestions: [] };
  }

  const textPlaceholders = extractImagePlaceholders(question.question);
  const imagePrompts = question.imagePrompts || [];

  // Check if number of placeholders matches number of prompts
  if (textPlaceholders.length !== imagePrompts.length) {
    issues.push(`Mismatch: ${textPlaceholders.length} placeholders in text, ${imagePrompts.length} image prompts provided`);
    
    if (textPlaceholders.length > imagePrompts.length) {
      suggestions.push('Generate more image prompts to match placeholders in question text');
    } else {
      suggestions.push('Reduce number of image prompts or add more placeholders to question text');
    }
  }

  // Check if all placeholders have corresponding prompts
  textPlaceholders.forEach((placeholder, index) => {
    const matchingPrompt = imagePrompts.find(p => 
      p.placeholder === placeholder.placeholder ||
      p.placeholder === `IMAGE_${index + 1}`
    );

    if (!matchingPrompt) {
      issues.push(`No image prompt found for placeholder: ${placeholder.fullMatch}`);
      suggestions.push(`Add image prompt for: ${placeholder.description}`);
    }
  });

  // Check prompt quality
  imagePrompts.forEach(prompt => {
    if (prompt.prompt.length < 20) {
      issues.push(`Image prompt too short: "${prompt.prompt}"`);
      suggestions.push('Expand image prompts with more descriptive details');
    }

    if (!prompt.purpose) {
      issues.push(`Missing purpose for image prompt: ${prompt.placeholder}`);
      suggestions.push('Add purpose description for all image prompts');
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
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

      // Process image prompts - auto-extract from question content with placement detection
      let imagePrompts: Array<{
        placeholder: string;
        prompt: string;
        purpose: string;
        accuracy?: string;
        style?: string;
      }> = [];

      // First try auto-extraction from question content (new method)
      const autoExtractedPrompts = extractImagePromptsFromQuestion(q);
      if (autoExtractedPrompts.length > 0) {
        imagePrompts = autoExtractedPrompts.map(img => ({
          placeholder: img.placeholder,
          prompt: escapeCurrencyDollarsSmart(img.prompt),
          purpose: img.purpose,
          accuracy: img.accuracy,
          style: img.style || 'educational_diagram'
        }));
      }
      // Fallback to explicit imagePrompts if provided by AI (backward compatibility)
      else if (q.imagePrompts && Array.isArray(q.imagePrompts)) {
        imagePrompts = q.imagePrompts
          .filter(img => img && typeof img === 'object')
          .map(img => ({
            placeholder: String(img.placeholder || ''),
            prompt: escapeCurrencyDollarsSmart(String(img.prompt || '')),
            purpose: String(img.purpose || ''),
            accuracy: img.accuracy ? String(img.accuracy) : undefined,
            style: img.style ? String(img.style) : undefined
          }))
          .filter(img => img.placeholder && img.prompt);
      }

      // Check if question text contains image placeholders (any format)
      const questionText = [q.question, q.explanation, ...(options || [])].join(' ');
      const hasImagePlaceholders = /\[(IMG|IMAGE):\s*[^\]]+\]/i.test(questionText);
      const hasImages = imagePrompts.length > 0 || hasImagePlaceholders || q.hasImages === true;

      const processedQuestion: Question = {
        type: q.type || "unknown",
        question: escapeCurrencyDollarsSmart(q.question || q.prompt || ""),
        options: options.map(escapeCurrencyDollarsSmart),
        correctAnswer: escapeCurrencyDollarsSmart(correctAnswer),
        correctAnswerLetter,
        explanation: escapeCurrencyDollarsSmart(q.explanation || ""),
        imagePrompts: imagePrompts.length > 0 ? imagePrompts : undefined,
        hasImages
      };
      
      return processedQuestion;
    });
}