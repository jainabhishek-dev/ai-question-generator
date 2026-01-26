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
  
  // Storage for all protected content types
  const imageExpressions: Array<{placeholder: string, original: string}> = [];
  const mathExpressions: Array<{placeholder: string, original: string}> = [];
  const displayMathExpressions: Array<{placeholder: string, original: string}> = [];
  const tableBlocks: Array<{placeholder: string, original: string}> = [];
  
  let imageCounter = 0;
  let mathCounter = 0;
  let displayMathCounter = 0;
  let tableCounter = 0;
  
  // STEP 1: Protect image placeholders FIRST (preserve literal content unchanged)
  // Image descriptions should never be modified, even if they contain $ symbols
  result = result.replace(/\[IMG:[^\]]+\]/g, (match) => {
    const placeholder = `__IMAGE_${imageCounter++}__`;
    imageExpressions.push({ placeholder, original: match });
    return placeholder;
  });
  
  // STEP 2: Protect display math expressions ($$...$$) FIRST
  // Note: $ symbol is now exclusively for math (currency uses ₹)
  result = result.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    const placeholder = `__DISPLAY_MATH_${displayMathCounter++}__`;
    displayMathExpressions.push({ placeholder, original: match });
    return placeholder;
  });
  
  // STEP 3: Protect markdown tables early to prevent corruption of content inside
  result = result.replace(/^(\s*\|.*\|.*\n)(\s*\|[-:\s|]*\|.*\n)?(\s*\|.*\|.*\n)*/gm, (match) => {
    const lines = match.trim().split('\n').filter(line => line.includes('|'));
    if (lines.length >= 2) {
      const placeholder = `__TABLE_BLOCK_${tableCounter++}__`;
      tableBlocks.push({ placeholder, original: match });
      return placeholder;
    }
    return match;
  });
  
  // STEP 4: Protect ALL inline math expressions $...$ ($ is now math-only, no currency ambiguity)
  // Since AI uses ₹ for currency, all $ symbols are mathematical
  result = result.replace(/\$([^$]+)\$/g, (match) => {
    const placeholder = `__MATH_EXPR_${mathCounter++}__`;
    mathExpressions.push({ placeholder, original: match });
    return placeholder;
  });

  
  // STEP 5: Currency handling - AI uses ₹ for currency, so no conversion needed
  // The ₹ symbol will pass through unchanged as it's not $ (math-only)
  
  // STEP 6: Handle line breaks and formatting
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
  
  // STEP 7: Fix ONLY unambiguous concatenation errors (conservative approach)
  // Avoid false positives on valid compound words by targeting clear error patterns
  
  // Fix sentence boundaries: period/question/exclamation followed by capital letter
  result = result.replace(/([.!?])([A-Z])/g, '$1 $2');
  
  // Fix number boundaries: digit followed by capital letter
  result = result.replace(/(\d)([A-Z])/g, '$1 $2');
  
  // Fix punctuation boundaries: comma/semicolon/colon followed by capital letter
  result = result.replace(/([,;:])([A-Z])/g, '$1 $2');

  // STEP 8: Fix spacing issues more carefully (but don't break math)
  result = result
    // Add space after commas if missing (but not in HTML entities)
    .replace(/,(?=[a-zA-Z](?!#36;))/g, ', ')
    // Fix apostrophe concatenations (generic pattern)
    .replace(/([a-z])'s([a-z])/gi, '$1\'s $2')
    // Add space before capital letters that follow lowercase (but preserve math variables)
    .replace(/([a-z])([A-Z])(?![a-zA-Z]*\$)/g, '$1 $2')
    // DON'T add spaces in mathematical expressions or currency
  

  
  // STEP 9: Fix line breaks for ReactMarkdown
  // ReactMarkdown needs either double newlines for paragraphs or two spaces + newline for line breaks
  // BUT: Preserve markdown table structure (table rows need single newlines between them)
  
  // Protect markdown table rows (lines starting with |) - preserve their single newlines
  const tableRowPattern = /\|[^\n]+\|\n(?=\|)/g;
  const protectedTableNewlines: Array<{ placeholder: string; original: string }> = [];
  result = result.replace(tableRowPattern, (match) => {
    const placeholder = `__TABLE_ROW_${protectedTableNewlines.length}__`;
    protectedTableNewlines.push({ placeholder, original: match });
    return placeholder;
  });
  
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
  
  // Restore protected table rows with their original single newlines
  protectedTableNewlines.forEach(({ placeholder, original }) => {
    result = result.replace(placeholder, original);
  });
  
  // STEP 10: Restore all protected content in reverse order of protection
  
  // First restore display math
  displayMathExpressions.forEach(({ placeholder, original }) => {
    result = result.replace(placeholder, original);
  });
  
  // Then restore inline math expressions
  mathExpressions.forEach(({ placeholder, original }) => {
    result = result.replace(placeholder, original);
  });
  
  // Restore table blocks
  tableBlocks.forEach(({ placeholder, original }) => {
    result = result.replace(placeholder, original);
  });
  
  // Finally restore image placeholders LAST (preserve literal content)
  imageExpressions.forEach(({ placeholder, original }) => {
    result = result.replace(placeholder, original);
  });
  
  return result;
}