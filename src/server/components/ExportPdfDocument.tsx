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
    // Split into blocks and inline math
    const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/);
    return parts.map((part, i) => {
      if (part.startsWith("$$") && part.endsWith("$$")) {
        // Block math: display as block
        return <BlockMath key={i}>{part.slice(2, -2)}</BlockMath>;
      } else if (part.startsWith("$") && part.endsWith("$")) {
        // Inline math: render inline
        return <InlineMath key={i}>{part.slice(1, -1)}</InlineMath>;
      } else {
        // Inline markdown: render as span to avoid line breaks
        return <span key={i}><ReactMarkdown components={{p: 'span'}}>{part}</ReactMarkdown></span>;
      }
    });
  } catch (error) {
    console.error("LaTeX rendering error:", error);
    return <span><ReactMarkdown components={{p: 'span'}}>{text}</ReactMarkdown></span>;
  }
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
          body { font-family: 'Arial', sans-serif; margin: ${pageMargins}; font-size: ${fontSize}px; }
          h1 { text-align: center; margin-bottom: 32px; font-weight: bold; font-size: ${fontSize + 8}px; }
          .question { margin-bottom: ${questionSpacing}px; page-break-inside: avoid; }
          .options { margin-left: 24px; }
          .answer, .explanation { margin-left: 24px; color: #2d7a2d; }
          .footer { position: fixed; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 12px; color: #888; }
          .header { position: fixed; top: 0; left: 0; right: 0; text-align: center; font-size: ${fontSize + 8}px; font-weight: bold; color: #333; background: #fff; z-index: 10; padding-top: 20px; padding-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
          .branding-logo { display: block; margin: 0 auto 16px auto; max-height: 48px; }
          @media print {
            .header, .footer { position: fixed; background: #fff; }
            .header { top: 0; padding-top: 20px; padding-bottom: 16px; }
            .footer { bottom: 0; }
            body { margin-top: 80px; }
          }
        `}</style>
      </head>
      <body>
        {preferences?.formatting?.showHeaders && (
          <div className="header" role="banner">{brandingTitle}</div>
        )}
        {!preferences?.formatting?.showHeaders && (
          <h1>{brandingTitle}</h1>
        )}
        {brandingLogo && (
          <img src={brandingLogo} alt="Logo" className="branding-logo" aria-label="Branding logo" />
        )}
        <div style={{marginTop: preferences?.formatting?.showHeaders ? 80 : 0}}>
        {questions.map((q, idx) => (
          <div className="question" key={q.id || idx} role="group" aria-labelledby={`question-${idx}`}> 
            <div id={`question-${idx}`} style={{display: 'flex', alignItems: 'flex-start'}}>
              <b style={{marginRight: 6}}>{idx + 1}.</b>
              {/* Render question inline with number, no extra break */}
              <span>{memoizedRenderMarkdownWithLatex(q.question)}</span>
            </div>
            {q.options && q.options.length > 0 && (
              <div className="options">
                {q.options.map((opt, i) => {
                  // Remove leading label (e.g., 'A. ', 'B) ', etc.) from option text only if not already present
                  const label = String.fromCharCode(65 + i);
                  const labelRegex = new RegExp(`^${label}[\).]?\s*`);
                  let cleanedOpt = opt;
                  let showLabel = true;
                  if (labelRegex.test(opt)) {
                    cleanedOpt = opt.replace(labelRegex, "");
                    showLabel = false; // Option already has label, don't duplicate
                  }
                  return (
                    <div key={i} style={{display: 'flex', alignItems: 'flex-start'}}>
                      {showLabel && <b style={{marginRight: 6}}>{label})</b>}
                      <span>{memoizedRenderMarkdownWithLatex(cleanedOpt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {exportType === "answer-key" && (
              <>
                <div className="answer" style={{display: 'flex', alignItems: 'flex-start'}}>
                  <b style={{marginRight: 6}}>Answer:</b> <span>{memoizedRenderMarkdownWithLatex(q.correct_answer)}</span>
                </div>
                {q.explanation && (
                  <div className="explanation" style={{display: 'flex', alignItems: 'flex-start'}}>
                    <b style={{marginRight: 6}}>Explanation:</b> <span>{memoizedRenderMarkdownWithLatex(q.explanation)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        </div>
        {preferences?.formatting?.showFooters && (
          <div className="footer" role="contentinfo">Generated by AI Question Generator</div>
        )}
      </body>
    </html>
  );
};