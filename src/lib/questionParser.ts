import { cleanJsonText } from './jsonCleaner';
import { escapeCurrencyDollarsSmart } from './textCleaner';

/**
 * Cleans up double-backslashed LaTeX commands from legacy data
 * Fixes issues where LaTeX like \\left becomes \left for proper KaTeX rendering
 * @param text - Text content that may contain over-escaped LaTeX
 * @returns Text with properly escaped LaTeX commands
 */
export function cleanLatexBackslashes(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  
  // Fix double-backslashed LaTeX commands within math delimiters
  // Pattern: Find $...$ or $$...$$ blocks and fix double backslashes within them
  
  // Fix inline math $...$
  text = text.replace(/\$([^$]+)\$/g, (match, mathContent) => {
    // Replace double backslashes with single backslashes for LaTeX commands
    const fixed = mathContent.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
    return `$${fixed}$`;
  });
  
  // Fix display math $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, mathContent) => {
    // Replace double backslashes with single backslashes for LaTeX commands
    const fixed = mathContent.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
    return `$$${fixed}$$`;
  });
  
  return text;
}

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
 * Normalizes parsed result to Question array format
 */
function normalizeParseResult(parsed: unknown): Question[] | null {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    // Check for questions array property
    if (obj.questions && Array.isArray(obj.questions)) {
      return obj.questions;
    }
    // Check if single question object
    if (obj.type && obj.question) {
      return [obj as unknown as Question];
    }
  }
  return null;
}

/**
 * Parses AI-generated text into structured Question objects
 * Uses 8 sequential parsing strategies for bulletproof parsing
 */
export function parseQuestions(text: string): Question[] {
  const cleanText = cleanJsonText(text);
  console.log('🧹 CLEANED TEXT (after jsonCleaner):', cleanText)

  // Strategy 1: Direct parse of cleaned text
  try {
    const parsed = JSON.parse(cleanText);
    const normalized = normalizeParseResult(parsed);
    if (normalized) return normalized;
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Trim all leading/trailing whitespace and parse
  try {
    const trimmed = cleanText.replace(/^\s+|\s+$/g, '');
    const parsed = JSON.parse(trimmed);
    const normalized = normalizeParseResult(parsed);
    if (normalized) return normalized;
  } catch {
    // Continue to next strategy
  }

  // Strategy 3: Strip markdown code fences more aggressively
  try {
    const noMarkdown = cleanText
      .replace(/^\s*```[a-z]*\s*/gi, '')
      .replace(/\s*```\s*$/gi, '')
      .trim();
    const parsed = JSON.parse(noMarkdown);
    const normalized = normalizeParseResult(parsed);
    if (normalized) return normalized;
  } catch {
    // Continue to next strategy
  }

  // Strategy 4: Extract JSON array with permissive regex
  try {
    const arrayMatch = cleanText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (arrayMatch) {
      const parsed = JSON.parse(arrayMatch[0]);
      const normalized = normalizeParseResult(parsed);
      if (normalized) return normalized;
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 5: Extract JSON object with questions key
  try {
    const objMatch = cleanText.match(/\{\s*["']questions["']\s*:[\s\S]*\}/);
    if (objMatch) {
      const parsed = JSON.parse(objMatch[0]);
      const normalized = normalizeParseResult(parsed);
      if (normalized) return normalized;
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 6: Unicode normalize and parse
  try {
    const normalized = cleanText.normalize('NFKC');
    const parsed = JSON.parse(normalized);
    const result = normalizeParseResult(parsed);
    if (result) return result;
  } catch {
    // Continue to next strategy
  }

  // Strategy 7: Remove control characters and parse
  try {
    // eslint-disable-next-line no-control-regex
    const noControl = cleanText.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    const parsed = JSON.parse(noControl);
    const normalized = normalizeParseResult(parsed);
    if (normalized) return normalized;
  } catch {
    // Continue to next strategy
  }

  // Strategy 8: Aggressive extraction - find any JSON-like structure
  try {
    const matches = cleanText.match(/\{[\s\S]*?\}/g);
    if (matches) {
      for (const match of matches) {
        try {
          const parsed = JSON.parse(match);
          if (parsed && typeof parsed === 'object' && parsed.type && parsed.question) {
            // Found at least one valid question, collect all similar objects
            const questions: Question[] = [];
            for (const m of matches) {
              try {
                const p = JSON.parse(m);
                if (p && typeof p === 'object' && p.type && p.question) {
                  questions.push(p as Question);
                }
              } catch {
                // Skip invalid objects
              }
            }
            if (questions.length > 0) return questions;
          }
        } catch {
          // Continue to next match
        }
      }
    }
  } catch {
    // Final strategy failed
  }

  // All strategies failed - log error for debugging
  console.error('[QuestionParser] All parsing strategies failed. First 300 chars:', cleanText.substring(0, 300));
  return [];
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
      const combinedText = [q.question, q.explanation, ...(options || [])].join(' ');
      const hasImagePlaceholders = /\[(IMG|IMAGE):\s*[^\]]+\]/i.test(combinedText);
      const hasImages = imagePrompts.length > 0 || hasImagePlaceholders || q.hasImages === true;

      // Apply text cleaning and LaTeX cleanup (for legacy data with double backslashes)
      const questionText = escapeCurrencyDollarsSmart(q.question || q.prompt || "");
      const explanationText = escapeCurrencyDollarsSmart(q.explanation || "");
      const answerText = escapeCurrencyDollarsSmart(correctAnswer);
      
      const processedQuestion: Question = {
        type: q.type || "unknown",
        question: cleanLatexBackslashes(questionText),
        options: options.map(opt => cleanLatexBackslashes(escapeCurrencyDollarsSmart(opt))),
        correctAnswer: cleanLatexBackslashes(answerText),
        correctAnswerLetter,
        explanation: cleanLatexBackslashes(explanationText),
        imagePrompts: imagePrompts.length > 0 ? imagePrompts : undefined,
        hasImages
      };
      
      return processedQuestion;
    });
}