/**
 * Text cleaning and formatting utilities for AI-generated content
 */

/**
 * Smart currency and text formatting for display
 * Handles currency symbols, math equations, line breaks, and ReactMarkdown compatibility
 */
export function escapeCurrencyDollarsSmart(str: string): string {
  if (!str || typeof str !== 'string') return str || '';
  
  console.log('=== TEXT CLEANER INPUT ===', JSON.stringify(str));
  
  let result = str;
  
  // 1) FIRST: Protect ALL math expressions (including those with currency like $18 + x = 45$)
  // This must happen BEFORE currency conversion to keep math equations intact
  const mathExpressions: Array<{placeholder: string, original: string}> = [];
  let mathCounter = 0;
  
  console.log('=== BEFORE MATH PROTECTION ===', JSON.stringify(result));
  
  // Protect simple numbers in math delimiters like $103$, $97$, $45$
  // This must come FIRST to catch simple mathematical numbers before complex expressions
  result = result.replace(/\$(\d+)\$/g, (match) => {
    const placeholder = `__MATH_EXPR_${mathCounter++}__`;
    mathExpressions.push({ placeholder, original: match });
    console.log(`=== PROTECTING SIMPLE MATH NUMBER: ${match} -> ${placeholder} ===`);
    return placeholder;
  });
  
  // Protect ALL complex math expressions (including those with operators like $18 + x = 45$)
  // Look for content between $ that contains:
  // - Variables like x, y, p
  // - Operators =, +, -, *, /, ^  
  // - Numbers followed by operators (like 18 + x)
  // - Variables followed by operators (like x = 5)
  // - LaTeX commands like \frac
  result = result.replace(/\$([^$]*(?:[a-zA-Z=+\-*/^\\]|\\[a-zA-Z]+|\d+\s*[+\-*/^=]|[+\-*/^=]\s*\d+)[^$]*)\$/g, (match) => {
    const placeholder = `__MATH_EXPR_${mathCounter++}__`;
    mathExpressions.push({ placeholder, original: match });
    console.log(`=== PROTECTING COMPLEX MATH: ${match} -> ${placeholder} ===`);
    return placeholder;
  });
  
  // Protect display math expressions $$...$$
  result = result.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    const placeholder = `__MATH_EXPR_${mathCounter++}__`;
    mathExpressions.push({ placeholder, original: match });
    return placeholder;
  });
  
  console.log('=== AFTER PROTECTING MATH ===', JSON.stringify(result));
  console.log('=== PROTECTED MATH EXPRESSIONS ===', mathExpressions);
  
  // 2) NOW convert remaining currency symbols to HTML entities
  // Math expressions are protected, so this won't break equations like $18 + x = 45$
  console.log('=== BEFORE CURRENCY CONVERSION ===', JSON.stringify(result));
  
  result = result
    // Handle all currency variations now that math is protected
    .replace(/\\\\\$(\d)/g, '&#36;$1')  // \\$1.23 -> &#36;1.23
    .replace(/\\\$(\d)/g, '&#36;$1')    // \$1.23 -> &#36;1.23  
    .replace(/\$(\d)/g, '&#36;$1');     // $1.23 -> &#36;1.23
  
  console.log('=== AFTER CURRENCY CONVERSION ===', JSON.stringify(result));
  
  // 3) Add missing currency symbols where numbers should be currency
  // Look for patterns like "costs 12.00" and convert to "costs &#36;12.00"
  result = result.replace(/\b(cost|costs|price|spent|total|bill|pay|paid)\s+(\d+\.\d{2})\b/gi, '$1 &#36;$2');
  
  console.log('=== AFTER CURRENCY TO HTML ENTITY CONVERSION ===', JSON.stringify(result));
  
  // 4) Handle line breaks and formatting
  result = result
    // Convert \n to proper line breaks for display
    .replace(/\\n/g, '\n')
    // Handle bullet points and lists (do this AFTER line break conversion)
    .replace(/^\s*[-*]\s+/gm, '• ')
    // Clean up excessive whitespace but preserve paragraph breaks
    .replace(/\n{3,}/g, '\n\n')
    // Clean up line breaks but preserve necessary spaces
    .replace(/\n+/g, '\n')
    // Clean up multiple spaces (but be more conservative)
    .replace(/[ \t]{3,}/g, ' ')
    .trim();
  
  // 5) Fix spacing issues more carefully (but don't break currency or math)
  console.log('=== BEFORE SPACING FIX ===', JSON.stringify(result));
  
  result = result
    // Add space after commas if missing (but not in HTML entities)
    .replace(/,(?=[a-zA-Z](?!#36;))/g, ', ')
    // Fix apostrophe concatenations (generic pattern)
    .replace(/([a-z])'s([a-z])/gi, '$1\'s $2')
    // Add space before capital letters that follow lowercase (but preserve math variables)
    .replace(/([a-z])([A-Z])(?![a-zA-Z]*\$)/g, '$1 $2')
    // DON'T add spaces in mathematical expressions or currency
  
  console.log('=== AFTER SPACING FIX ===', JSON.stringify(result));
  
  // 6) Fix line breaks for ReactMarkdown
  // ReactMarkdown needs either double newlines for paragraphs or two spaces + newline for line breaks
  // Convert single newlines to double newlines for proper paragraph breaks
  result = result
    // First, protect existing double newlines
    .replace(/\n\n/g, '__DOUBLE_NEWLINE__')
    // Convert single newlines to double newlines (paragraph breaks)
    .replace(/\n/g, '\n\n')
    // Restore protected double newlines (now they become quadruple, which is fine)
    .replace(/__DOUBLE_NEWLINE__/g, '\n\n')
    // Clean up excessive newlines (more than 2)
    .replace(/\n{3,}/g, '\n\n');
  
  // 7) Restore protected math expressions
  mathExpressions.forEach(({ placeholder, original }) => {
    console.log(`=== RESTORING: ${placeholder} -> ${original} ===`);
    result = result.replace(placeholder, original);
  });
  
  console.log('=== AFTER RESTORING MATH ===', JSON.stringify(result));
  console.log('=== TEXT CLEANER OUTPUT ===', JSON.stringify(result));
  
  return result;
}