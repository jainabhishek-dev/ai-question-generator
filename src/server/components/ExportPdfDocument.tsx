import React, { useMemo } from "react";
import { QuestionRecord } from "../../types/question";
import ReactMarkdown from "react-markdown";
import { BlockMath, InlineMath } from "react-katex";
// KaTeX CSS is injected via CDN link in <head> for SSR/PDF rendering

type Props = {
  questions: QuestionRecord[];
  exportType: "worksheet" | "answer-key";
  preferences?: {
    formatting?: {
      fontSize?: number;
      showHeaders?: boolean;
      showFooters?: boolean;
      pageMargins?: string;
      questionSpacing?: number;
    };
    branding?: {
      title?: string;
      logo?: string;
    };
  };
};

function renderMarkdownWithLatex(text: string) {
  if (!text || typeof text !== "string") {
    return <span>No content</span>;
  }
  try {
    // Enhanced LaTeX parsing - Fixed regex for better math detection
    const parts = text.split(/(\$\$[^$]*\$\$|\$[^$]+\$|\\\[[^\]]*\\\]|\\\([^)]*\\\))/g);
    return (
      <>
        {parts.map((part, i) => {
          // Block math patterns
          if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
            const mathContent = part.slice(2, -2).trim();
            return mathContent ? <BlockMath key={i}>{mathContent}</BlockMath> : <span key={i}>{part}</span>;
          } else if (part.startsWith("\\[") && part.endsWith("\\]") && part.length > 4) {
            const mathContent = part.slice(2, -2).trim();
            return mathContent ? <BlockMath key={i}>{mathContent}</BlockMath> : <span key={i}>{part}</span>;
          }
          // Inline math patterns
          else if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
            const mathContent = part.slice(1, -1).trim();
            return mathContent ? <InlineMath key={i}>{mathContent}</InlineMath> : <span key={i}>{part}</span>;
          } else if (part.startsWith("\\(") && part.endsWith("\\)") && part.length > 4) {
            const mathContent = part.slice(2, -2).trim();
            return mathContent ? <InlineMath key={i}>{mathContent}</InlineMath> : <span key={i}>{part}</span>;
          }
          // Regular markdown content
          else if (part.trim()) {
            return (
              <span key={i}>
                <ReactMarkdown 
                  components={{
                    p: ({ children }) => <span>{children}</span>,
                    strong: ({ children }) => <strong>{children}</strong>,
                    em: ({ children }) => <em>{children}</em>,
                    code: ({ children }) => <code style={{ backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '3px' }}>{children}</code>
                  }}
                >
                  {part}
                </ReactMarkdown>
              </span>
            );
          } else {
            return <span key={i}>{part}</span>;
          }
        })}
      </>
    );
  } catch (error) {
    console.error("LaTeX rendering error:", error);
    return (
      <span>
        <ReactMarkdown components={{ p: ({ children }) => <span>{children}</span> }}>
          {text}
        </ReactMarkdown>
      </span>
    );
  }
}

// Utility function to parse options from JSON string or return as-is if already array
function parseOptions(options: string | string[] | null | undefined): string[] {
  if (!options) return [];
  if (Array.isArray(options)) {
    return options;
  }
  if (typeof options === 'string') {
    // Handle empty array string
    if (options.trim() === '[]') return [];
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Error parsing options:", error);
      // Fallback: try to split by common patterns
      const cleanOptions = options
        .replace(/^\["|"\]$/g, '') // Remove outer brackets and quotes
        .split('", "')
        .map(opt => opt.replace(/^"|"$/g, '').trim())
        .filter(opt => opt.length > 0);
      return cleanOptions;
    }
  }
  return [];
}

// Utility function to clean option labels and determine if we should show them
function processOption(option: string, index: number): { cleanedOption: string; showLabel: boolean } {
  if (!option || typeof option !== 'string') {
    return { cleanedOption: '', showLabel: true };
  }
  
  const label = String.fromCharCode(65 + index); // A, B, C, D...
  
  // More comprehensive regex to catch various label formats
  const labelPatterns = [
    new RegExp(`^${label}\\)\\s*`, 'i'),     // A) format (double backslash for parenthesis)
    new RegExp(`^${label}\\.\\s*`, 'i'),     // A. format (double backslash for space)
    new RegExp(`^${label}\\s+`, 'i'),        // A format (with space, double backslash)
    new RegExp(`^\\(${label}\\)\\s*`, 'i'),  // (A) format, double backslash for parentheses and space
  ];
  
  for (const pattern of labelPatterns) {
    if (pattern.test(option)) {
      return {
        cleanedOption: option.replace(pattern, '').trim(),
        showLabel: false
      };
    }
  }
  
  return {
    cleanedOption: option.trim(),
    showLabel: true
  };
}

// Utility function to format answers consistently
function formatAnswer(answer: string, options: string[]): string {
  if (!answer) return '';
  
  // If it's just a letter (A, B, C, D), try to find the full option
  const letterMatch = answer.match(/^([A-Z])[).]?\s*$/);
  if (letterMatch && options.length > 0) {
    const letterIndex = letterMatch[1].charCodeAt(0) - 65; // A=0, B=1, etc.
    if (letterIndex >= 0 && letterIndex < options.length) {
      const option = options[letterIndex];
      const { cleanedOption } = processOption(option, letterIndex);
      return `${letterMatch[1]}) ${cleanedOption}`;
    }
  }
  
  return answer.trim();
}

export const ExportPdfDocument: React.FC<Props> = ({
  questions,
  exportType,
  preferences,
}) => {
  const fontSize = preferences?.formatting?.fontSize || 14;
  const pageMargins = preferences?.formatting?.pageMargins || "40px";
  const questionSpacing = preferences?.formatting?.questionSpacing || 24;
  const brandingTitle = preferences?.branding?.title || (exportType === "worksheet" ? "Worksheet" : "Answer Key");
  const brandingLogo = preferences?.branding?.logo;
  const showHeaders = preferences?.formatting?.showHeaders ?? true;
  const showFooters = preferences?.formatting?.showFooters ?? true;

  // Calculate proper spacing to avoid overlap
  const baseMargin = parseInt(pageMargins.replace('px', ''));
  const headerHeight = showHeaders ? 60 : 0;
  const footerHeight = showFooters ? 40 : 0;

  // Memoize the rendering function for performance
  const memoizedRenderMarkdownWithLatex = useMemo(() => renderMarkdownWithLatex, []);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>{brandingTitle}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
        <style>{`
          * {
            box-sizing: border-box;
          }
          @page {
            margin: ${baseMargin}px;
            margin-top: ${baseMargin + headerHeight}px;
            margin-bottom: ${baseMargin + footerHeight}px;
          }
          @page:first {
            margin-top: ${baseMargin}px;
          }
          body { 
            font-family: 'Arial', sans-serif; 
            margin: 0;
            padding: 0;
            font-size: ${fontSize}px; 
            line-height: 1.6;
            color: #333;
            background: white;
          }
          .page-content {
            margin: 0;
            padding: 20px 0;
            min-height: calc(100vh - ${headerHeight + footerHeight}px);
          }
          h1 { 
            text-align: center; 
            margin: 0 0 32px 0; 
            font-weight: bold; 
            font-size: ${fontSize + 8}px; 
            color: #2c3e50;
            page-break-after: avoid;
          }
          .question { 
            margin-bottom: ${questionSpacing}px; 
            padding: 12px 0;
            border-bottom: 1px solid #f0f0f0;
          }
          .question:last-child {
            border-bottom: none;
            margin-bottom: 20px;
          }
          .question-content {
            margin-bottom: 12px;
          }
          .question-header {
            display: flex;
            align-items: flex-start;
            margin-bottom: 8px;
          }
          .question-number {
            font-weight: bold;
            font-size: ${fontSize + 2}px;
            margin-right: 12px;
            min-width: 30px;
            flex-shrink: 0;
            color: #2c3e50;
          }
          .question-text {
            flex: 1;
            line-height: 1.7;
          }
          .question-type-badge {
            display: inline-block;
            background-color: #e3f2fd;
            color: #1565c0;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: ${fontSize - 3}px;
            font-weight: 500;
            margin-left: 12px;
            text-transform: capitalize;
          }
          .options { 
            margin-left: 42px; 
            margin-top: 12px;
          }
          .option-item {
            margin-bottom: 8px;
            display: flex;
            align-items: flex-start;
            line-height: 1.6;
          }
          .option-label {
            font-weight: 600;
            margin-right: 10px;
            min-width: 26px;
            flex-shrink: 0;
            color: #1976d2;
          }
          .option-content {
            flex: 1;
            padding-right: 10px;
          }
          .instruction-text {
            margin-left: 42px;
            margin-top: 12px;
            font-style: italic;
            color: #666;
            background-color: #f9f9f9;
            padding: 8px 12px;
            border-radius: 4px;
            border-left: 3px solid #ddd;
          }
          .answer-section { 
            margin-left: 42px; 
            margin-top: 16px;
            margin-bottom: 12px;
            padding: 12px 16px;
            background-color: #f8fdf8;
            border: 1px solid #e8f5e8;
            border-left: 4px solid #4caf50;
            border-radius: 0 6px 6px 0;
          }
          .answer-section .answer { 
            color: #2e7d32; 
            font-weight: 600;
            margin-bottom: 10px;
            font-size: ${fontSize}px;
          }
          .answer-section .explanation { 
            color: #424242;
            font-size: ${fontSize - 1}px;
            line-height: 1.6;
            margin-top: 8px;
          }
          .header { 
            text-align: center; 
            font-size: ${fontSize + 6}px; 
            font-weight: bold; 
            color: #1a237e; 
            padding: 12px 0;
            border-bottom: 2px solid #e8eaf6;
          }
          .footer { 
            text-align: center; 
            font-size: 11px; 
            color: #757575; 
            padding: 8px 0;
            border-top: 1px solid #e0e0e0;
          }
          .branding-logo { 
            display: block; 
            margin: 0 auto 20px auto; 
            max-height: 60px; 
            max-width: 250px;
          }
          /* Alternative positioning for PDF generation */
          @media print {
            @page {
              margin: ${baseMargin}px;
              margin-top: ${baseMargin + headerHeight}px;
              margin-bottom: ${baseMargin + footerHeight}px;
            }
            @page:first {
              margin-top: ${baseMargin}px;
            }
            .header {
              position: fixed;
              top: ${baseMargin}px;
              left: ${baseMargin}px;
              right: ${baseMargin}px;
              height: ${headerHeight}px;
              background: white;
              z-index: 1000;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .footer {
              position: fixed;
              bottom: ${baseMargin}px;
              left: ${baseMargin}px;
              right: ${baseMargin}px;
              height: ${footerHeight}px;
              background: white;
              z-index: 1000;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .page-content {
              margin-top: ${headerHeight}px;
              margin-bottom: ${footerHeight}px;
              padding: 20px 0;
            }
            .question {
              /* allow splitting across pages */
            }
            .answer-section {
              /* allow breaking across pages for long explanations */
            }
          }
          /* Enhanced KaTeX styling */
          .katex { 
            font-size: inherit !important; 
            line-height: 1.4 !important;
          }
          .katex-display { 
            margin: 12px 0 !important; 
            text-align: center !important;
          }
          .katex .base {
            display: inline-block;
          }
          /* Markdown content styling enhancements */
          strong { 
            font-weight: 600; 
            color: #1a1a1a;
          }
          em { 
            font-style: italic; 
            color: #444;
          }
          code { 
            background-color: #f5f7fa; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: ${fontSize - 1}px;
            border: 1px solid #e1e8ed;
          }
          /* Ensure proper spacing */
          .question-text p {
            margin: 0 0 8px 0;
          }
          .question-text p:last-child {
            margin-bottom: 0;
          }
        `}</style>
      </head>
      <body>
        {showHeaders && (
          <div className="header" role="banner">
            {brandingTitle}
          </div>
        )}
        <div className="page-content">
          {!showHeaders && (
            <>
              {brandingLogo && (
                <img src={brandingLogo} alt="Logo" className="branding-logo" aria-label="Branding logo" />
              )}
              <h1>{brandingTitle}</h1>
            </>
          )}
          {questions.map((q, idx) => {
            // Parse options from JSON string or use as-is if already array
            const parsedOptions = parseOptions(q.options);
            const questionType = q.question_type || 'unknown';
            return (
              <div className="question" key={q.id || idx} role="group" aria-labelledby={`question-${idx}`}> 
                <div id={`question-${idx}`} className="question-content">
                  <div className="question-header">
                    <div className="question-number">{idx + 1}.</div>
                    <div className="question-text">
                      {memoizedRenderMarkdownWithLatex(q.question)}
                      <span className="question-type-badge">{questionType.replace(/-/g, ' ')}</span>
                    </div>
                  </div>
                </div>
                {/* Multiple Choice Options */}
                {questionType === 'multiple-choice' && parsedOptions.length > 0 && (
                  <div className="options">
                    {parsedOptions.map((opt, i) => {
                      const { cleanedOption, showLabel } = processOption(opt, i);
                      const label = String.fromCharCode(65 + i);
                      return (
                        <div key={i} className="option-item">
                          {showLabel && <div className="option-label">{label})</div>}
                          <div className="option-content">
                            {memoizedRenderMarkdownWithLatex(cleanedOption || opt)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Instructions for Multiple Choice */}
                {questionType === 'multiple-choice' && (
                  <div className="instruction-text">
                    <strong>Instructions:</strong> Select the correct option.
                  </div>
                )}
                {/* Fill in the Blank */}
                {questionType === 'fill-in-the-blank' && (
                  <div className="instruction-text">
                    <strong>Instructions:</strong> Fill in the blank above.
                  </div>
                )}
                {/* Short Answer */}
                {questionType === 'short-answer' && (
                  <div className="instruction-text">
                    <strong>Instructions:</strong> Provide a short answer (2-3 sentences).
                  </div>
                )}
                {/* Long Answer */}
                {questionType === 'long-answer' && (
                  <div className="instruction-text">
                    <strong>Instructions:</strong> Provide a detailed answer with explanation.
                  </div>
                )}
                {/* Answer Key Section */}
                {exportType === "answer-key" && (
                  <div className="answer-section">
                    <div className="answer">
                      <strong>Answer:</strong> {memoizedRenderMarkdownWithLatex(
                        formatAnswer(q.correct_answer || '', parsedOptions)
                      )}
                    </div>
                    {q.explanation && (
                      <div className="explanation">
                        <strong>Explanation:</strong> {memoizedRenderMarkdownWithLatex(q.explanation)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {showFooters && (
          <div className="footer" role="contentinfo">
            Generated by AI Question Generator
          </div>
        )}
      </body>
    </html>
  );
};
