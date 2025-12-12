/**
 * Text cleaning and formatting utilities for AI-generated content
 */

/**
 * Smart currency and text formatting for display
 * Handles currency symbols, math equations, line breaks, and ReactMarkdown compatibility
 */
export function escapeCurrencyDollarsSmart(str: string): string {
  if (!str || typeof str !== 'string') return str || '';
  
  let result = str;
  
  // 1) FIRST: Protect ALL math expressions (including those with currency like $18 + x = 45$)
  // This must happen BEFORE currency conversion to keep math equations intact
  const mathExpressions: Array<{placeholder: string, original: string}> = [];
  let mathCounter = 0;
  
  // 1.5) ALSO: Protect markdown tables before any processing
  // Tables need consecutive rows - blank lines break table structure
  const tableBlocks: Array<{placeholder: string, original: string}> = [];
  let tableCounter = 0;
  

  
  // Protect simple numbers in math delimiters like $103$, $97$, $45$
  // This must come FIRST to catch simple mathematical numbers before complex expressions
  result = result.replace(/\$(\d+)\$/g, (match) => {
    const placeholder = `__MATH_EXPR_${mathCounter++}__`;
    mathExpressions.push({ placeholder, original: match });
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
    return placeholder;
  });
  
  // Protect display math expressions $$...$$
  result = result.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    const placeholder = `__MATH_EXPR_${mathCounter++}__`;
    mathExpressions.push({ placeholder, original: match });
    return placeholder;
  });
  
  // Protect markdown table blocks (consecutive lines with pipes)
  // Match table structures: header row + separator + data rows
  // This regex captures complete table blocks including alignment separators like |:---|---:|
  result = result.replace(/^(\s*\|.*\|.*\n)(\s*\|[-:\s|]*\|.*\n)?(\s*\|.*\|.*\n)*/gm, (match) => {
    // Only protect if it looks like a proper table (has at least 2 rows with pipes)
    const lines = match.trim().split('\n').filter(line => line.includes('|'));
    if (lines.length >= 2) {
      const placeholder = `__TABLE_BLOCK_${tableCounter++}__`;
      tableBlocks.push({ placeholder, original: match });
      return placeholder;
    }
    return match; // Return unchanged if not a proper table
  });

  
  // 2) NOW convert remaining currency symbols to HTML entities
  // Math expressions are protected, so this won't break equations like $18 + x = 45$
  result = result
    // Handle all currency variations now that math is protected
    .replace(/\\\\\$(\d)/g, '&#36;$1')  // \\$1.23 -> &#36;1.23
    .replace(/\\\$(\d)/g, '&#36;$1')    // \$1.23 -> &#36;1.23  
    .replace(/\$(\d)/g, '&#36;$1');     // $1.23 -> &#36;1.23
  
  // 3) Add missing currency symbols where numbers should be currency
  // Look for patterns like "costs 12.00" and convert to "costs &#36;12.00"
  result = result.replace(/\b(cost|costs|price|spent|total|bill|pay|paid)\s+(\d+\.\d{2})\b/gi, '$1 &#36;$2');
  

  
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
  result = result
    // Add space after commas if missing (but not in HTML entities)
    .replace(/,(?=[a-zA-Z](?!#36;))/g, ', ')
    // Fix apostrophe concatenations (generic pattern)
    .replace(/([a-z])'s([a-z])/gi, '$1\'s $2')
    // Add space before capital letters that follow lowercase (but preserve math variables)
    .replace(/([a-z])([A-Z])(?![a-zA-Z]*\$)/g, '$1 $2')
    // DON'T add spaces in mathematical expressions or currency
  

  
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
    result = result.replace(placeholder, original);
  });
  
  // 8) Restore protected table blocks unchanged
  tableBlocks.forEach(({ placeholder, original }) => {
    result = result.replace(placeholder, original);
  });
  
  return result;
}