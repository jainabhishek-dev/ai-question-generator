/**
 * JSON cleaning utilities for AI-generated responses
 */

/**
 * Cleans and normalizes JSON text from AI responses
 * Handles common AI output issues like code blocks, escape sequences, etc.
 */
export function cleanJsonText(text: string): string {
  let cleanText = text.trim();

  // Remove markdown code block wrappers (```json or ``` at start/end)
  cleanText = cleanText
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Remove leading/trailing quotes or backticks that might wrap the entire JSON
  cleanText = cleanText.replace(/^["'`]+|["'`]+$/g, '');
  
  // Handle various escape sequence issues
  // 1. Remove escaped newlines that break JSON structure
  cleanText = cleanText.replace(/\\\r?\n/g, '');
  
  // 2. Remove trailing backslashes at end of lines (common AI output issue)
  cleanText = cleanText.replace(/\\+$/gm, '');
  
  // 3. Fix common JSON escape issues while preserving valid ones
  // First, temporarily protect already-escaped sequences we want to keep
  const protectedSequences = new Map();
  let protectedIndex = 0;
  
  // Protect valid JSON escapes and LaTeX commands, INCLUDING \$ for currency
  // This includes LaTeX commands like \frac, \pi, \sum, etc.
  cleanText = cleanText.replace(/\\(["\\\/bfnrtu]|\$|[a-zA-Z]+(?:\{[^}]*\})?)/g, (match) => {
    const placeholder = `__PROTECTED_${protectedIndex++}__`;
    protectedSequences.set(placeholder, match);
    return placeholder;
  });
  
  // Now fix any remaining unescaped backslashes
  cleanText = cleanText.replace(/\\/g, '\\\\');
  
  // Restore protected sequences WITH PROPER JSON ESCAPING
  // LaTeX commands like \circ must become \\circ for valid JSON
  protectedSequences.forEach((original, placeholder) => {
    // Double the backslash for JSON parsing to avoid "Invalid escape sequence" errors
    const jsonEscaped = original.replace(/\\/g, '\\\\');
    cleanText = cleanText.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), jsonEscaped);
  });
  
  // 4. Smart currency escape handling
  // Only escape \$ when followed by digits (currency), preserve LaTeX commands
  // This prevents \$45 from becoming \\$45 which breaks rendering
  // Check if it's already properly escaped for JSON (\\$) and don't double-escape
  cleanText = cleanText.replace(/(?<!\\)\\\$(?=\d)/g, '\\\\$');
  
  // 5. Fix common array/object formatting issues
  // Handle trailing commas in arrays/objects
  cleanText = cleanText.replace(/,(\s*[}\]])/g, '$1');
  
  // 6. Ensure proper quote handling for string values
  // Fix unescaped quotes within string values (but not the ones that delimit strings)
  cleanText = cleanText.replace(/"([^"]*)"([^"]*)"([^"]*)"/g, (match, p1, p2, p3) => {
    // If this looks like it has unescaped quotes in the middle, fix them
    if (p2.includes('"')) {
      return `"${p1}${p2.replace(/"/g, '\\"')}${p3}"`;
    }
    return match;
  });

  return cleanText;
}