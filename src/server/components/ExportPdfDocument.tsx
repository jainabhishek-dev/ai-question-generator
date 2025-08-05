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
    // Enhanced LaTeX parsing to handle both $...$ and $$...$$ patterns
    // Also handles \[...\] and \(...\) patterns for compatibility
    const parts = text.split(/(\$\$[^$]*\$\$|\$[^$]*\$|\\\[[^\]]*\\\]|\\\([^)]*\\\))/g);
    
    return parts.map((part, i) => {
      // Block math patterns
      if (part.startsWith("$$") && part.endsWith("$$")) {
        return <BlockMath key={i}>{part.slice(2, -2)}</BlockMath>;
      } else if (part.startsWith("\\[") && part.endsWith("\\]")) {
        return <BlockMath key={i}>{part.slice(2, -2)}</BlockMath>;
      }
      // Inline math patterns
      else if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
        return <InlineMath key={i}>{part.slice(1, -1)}</InlineMath>;
      } else if (part.startsWith("\\(") && part.endsWith("\\)")) {
        return <InlineMath key={i}>{part.slice(2, -2)}</InlineMath>;
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
    });
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
function parseOptions(options: string[] | null | undefined): string[] {
  if (!options) return [];
  if (Array.isArray(options)) return options;
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
  const questionSpacing = preferences?.formatting?.questionSpacing || 32;
  const brandingTitle = preferences?.branding?.title || (exportType === "worksheet" ? "Worksheet" : "Answer Key");
  const brandingLogo = preferences?.branding?.logo;

  // Memoize the rendering function for performance
  const memoizedRenderMarkdownWithLatex = useMemo(() => renderMarkdownWithLatex, []);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>{brandingTitle}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
        <style>{`
          body { 
            font-family: 'Arial', sans-serif; 
            margin: ${pageMargins}; 
            font-size: ${fontSize}px; 
            line-height: 1.6;
            color: #333;
            margin-top: 140px;
            margin-bottom: 100px;
          }
          h1 { 
            text-align: center; 
            margin-bottom: 32px; 
            font-weight: bold; 
            font-size: ${fontSize + 8}px; 
            color: #2c3e50;
          }
          .question { 
            margin-bottom: ${questionSpacing}px; 
            page-break-inside: avoid; 
            padding: 8px 0;
          }
          .question-content {
            margin-bottom: 12px;
          }
          .options { 
            margin-left: 24px; 
            margin-top: 8px;
          }
          .option-item {
            margin-bottom: 6px;
            display: flex;
            align-items: flex-start;
          }
          .option-label {
            font-weight: bold;
            margin-right: 8px;
            min-width: 24px;
            flex-shrink: 0;
          }
          .option-content {
            flex: 1;
          }
          .fill-blank {
            margin-left: 24px;
            margin-top: 8px;
            font-style: italic;
            color: #666;
          }
          .answer-section { 
            margin-left: 24px; 
            margin-top: 12px;
            padding: 8px 12px;
            background-color: #f8f9fa;
            border-left: 4px solid #28a745;
            border-radius: 0 4px 4px 0;
          }
          .answer-section .answer { 
            color: #28a745; 
            font-weight: bold;
            margin-bottom: 8px;
          }
          .answer-section .explanation { 
            color: #495057;
            font-size: ${fontSize - 1}px;
            line-height: 1.5;
          }
          .question-type-badge {
            display: inline-block;
            background-color: #e9ecef;
            color: #495057;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: ${fontSize - 2}px;
            font-weight: 500;
            margin-left: 8px;
          }
          .footer { 
            position: fixed; 
            bottom: 20px; 
            left: 0; 
            right: 0; 
            text-align: center; 
            font-size: 12px; 
            color: #888; 
            border-top: 1px solid #eee;
            padding-top: 10px;
            background: white;
          }
          .header { 
            position: fixed; 
            top: 0; 
            left: 0; 
            right: 0; 
            text-align: center; 
            font-size: ${fontSize + 8}px; 
            font-weight: bold; 
            color: #2c3e50; 
            background: #fff; 
            z-index: 10; 
            padding: 20px 0 16px 0; 
            border-bottom: 2px solid #e9ecef;
          }
          .branding-logo { 
            display: block; 
            margin: 0 auto 16px auto; 
            max-height: 48px; 
            max-width: 200px;
          }
          @media print {
            .header, .footer { 
              position: fixed; 
              background: #fff; 
            }
            .header { 
              top: 0; 
              padding: 20px 0 16px 0; 
            }
            .footer { 
              bottom: 0; 
            }
            body { 
              margin-top: 140px; 
              margin-bottom: 100px;
            }
            .question {
              break-inside: avoid;
            }
          }
          /* KaTeX styling adjustments */
          .katex { font-size: inherit !important; }
          .katex-display { margin: 8px 0 !important; }
          
          /* Markdown content styling */
          strong { font-weight: 600; }
          em { font-style: italic; }
          code { 
            background-color: #f8f9fa; 
            padding: 1px 4px; 
            border-radius: 3px; 
            font-family: 'Courier New', monospace;
            font-size: ${fontSize - 1}px;
          }
        `}</style>
      </head>
      <body>
        {preferences?.formatting?.showHeaders && (
          <div className="header" role="banner">
            {brandingLogo && (
              <img src={brandingLogo} alt="Logo" className="branding-logo" aria-label="Branding logo" />
            )}
            {brandingTitle}
          </div>
        )}
        {!preferences?.formatting?.showHeaders && (
          <>
            {brandingLogo && (
              <img src={brandingLogo} alt="Logo" className="branding-logo" aria-label="Branding logo" />
            )}
            <h1>{brandingTitle}</h1>
          </>
        )}
        
        <div>
          {questions.map((q, idx) => {
            // Parse options from JSON string or use as-is if already array
            const parsedOptions = parseOptions(q.options);
            const questionType = q.question_type || 'unknown';
            
            return (
              <div className="question" key={q.id || idx} role="group" aria-labelledby={`question-${idx}`}> 
                <div id={`question-${idx}`} className="question-content">
                  <div style={{display: 'flex', alignItems: 'flex-start'}}>
                    <strong style={{marginRight: 8, fontSize: `${fontSize + 1}px`}}>{idx + 1}.</strong>
                    <div style={{flex: 1}}>
                      <span>{memoizedRenderMarkdownWithLatex(q.question)}</span>
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
                          {showLabel && <span className="option-label">{label})</span>}
                          <div className="option-content">
                            {memoizedRenderMarkdownWithLatex(cleanedOption || opt)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Fill in the Blank */}
                {questionType === 'fill-in-the-blank' && (
                  <div className="fill-blank">
                    <em>Fill in the blank above.</em>
                  </div>
                )}

                {/* Short Answer */}
                {questionType === 'short-answer' && (
                  <div className="fill-blank">
                    <em>Provide a short answer.</em>
                  </div>
                )}

                {/* Long Answer */}
                {questionType === 'long-answer' && (
                  <div className="fill-blank">
                    <em>Provide a detailed answer.</em>
                  </div>
                )}

                {/* Answer Key Section */}
                {exportType === "answer-key" && (
                  <div className="answer-section">
                    <div className="answer">
                      <strong>Answer: </strong>
                      <span>{memoizedRenderMarkdownWithLatex(
                        formatAnswer(q.correct_answer || '', parsedOptions)
                      )}</span>
                    </div>
                    {(q.explanation) && (
                      <div className="explanation">
                        <strong>Explanation: </strong>
                        <span>{memoizedRenderMarkdownWithLatex(q.explanation)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {preferences?.formatting?.showFooters && (
          <div className="footer" role="contentinfo">
            Generated by AI Question Generator
          </div>
        )}
      </body>
    </html>
  );
};
