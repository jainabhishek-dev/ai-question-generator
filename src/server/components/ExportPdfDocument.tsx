// src/server/components/ExportPdfDocument.tsx
import React from 'react';
import { QuestionRecord, PdfCustomization } from '../../types/question';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';


type Props = {
  questions: QuestionRecord[];
  exportType: "worksheet" | "answer-key" | "unified";
  customization?: PdfCustomization;
  // Legacy support
  preferences?: {
    formatting?: {
      fontSize?: number;
      questionSpacing?: number;
    };
  };
};

// Keep your existing utility functions
function parseOptions(options: string | string[] | null | undefined): string[] {
  if (!options) return [];
  if (Array.isArray(options)) return options;
  if (typeof options === 'string') {
    if (options.trim() === '[]') return [];
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      const cleanOptions = options
        .replace(/^\["|"\]$/g, '')
        .split('", "')
        .map(opt => opt.replace(/^"|"$/g, '').trim())
        .filter(opt => opt.length > 0);
      return cleanOptions;
    }
  }
  return [];
}

function processOption(option: string): { cleanedOption: string; showLabel: boolean } {
  if (!option || typeof option !== 'string') {
    return { cleanedOption: '', showLabel: true };
  }

  const cleanedOption = option.replace(/^[A-Za-z][\.\)]\s*/i, '').trim();  

  return {
    cleanedOption,
    showLabel: true
  };
}

function formatAnswer(answer: string, options: string[]): string {
  if (!answer) return '';
  
  const letterMatch = answer.match(/^([A-Z])[).]?\s*$/);
  if (letterMatch && options.length > 0) {
    const letterIndex = letterMatch[1].charCodeAt(0) - 65;
    if (letterIndex >= 0 && letterIndex < options.length) {
      const option = options[letterIndex];
  const { cleanedOption } = processOption(option);
      return `${letterMatch[1]}) ${cleanedOption}`;
    }
  }
  
  return answer.trim();
}

export const ExportPdfDocument: React.FC<Props> = ({
  questions,
  exportType,
  customization,
  preferences,
}) => {
  // Use customization settings or fallback to legacy preferences
  const customFormatting = customization?.formatting;
  const legacyFormatting = preferences?.formatting;
  
  const fontSize = customFormatting?.fontSize || legacyFormatting?.fontSize || 12;
  const questionSpacing = customFormatting?.questionSpacing || legacyFormatting?.questionSpacing || 20;
  const margins = customFormatting?.margins || { top: 1.5, right: 0.75, bottom: 1.5, left: 0.75 };
  
  // Content options
  const includeQuestionText = customization?.includeQuestionText ?? true;
  const includeOptions = customization?.includeOptions ?? true;
  const includeCorrectAnswer = customization?.includeCorrectAnswer ?? (exportType === 'answer-key');
  const includeExplanation = customization?.includeExplanation ?? (exportType === 'answer-key');
  const showQuestionNumbers = customization?.showQuestionNumbers ?? true;
  const showQuestionTypes = customization?.showQuestionTypes ?? true;
  const showSubjectBadges = customization?.showSubjectBadges ?? false;
  const includeCommonInstructions = customization?.includeCommonInstructions ?? false;
  const commonInstructionsText = customization?.commonInstructionsText || '';
  
  // Legacy support
  const showInstructions = customization?.showInstructions ?? false;
  const highlightAnswers = customization?.highlightAnswers ?? includeCorrectAnswer;
  
  // Student fields
  const studentFields = customization?.studentFields;
  const showStudentInfo = customFormatting?.showStudentInfo && studentFields;
  
  // Header configuration
  const showHeader = customFormatting?.showHeader ?? true;
  const headerText = customFormatting?.headerText || (
    exportType === 'worksheet' ? 'Worksheet' : 
    exportType === 'answer-key' ? 'Answer Key' : 
    'Question Set'
  );

  return (
    <>
      {/* Print and screen styles for header/footer */}
      <style>
      {`
        @media print {
          @page {
            margin: 0.3in;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          /* Test border - positioned to be fully visible */
          .page-border {
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            bottom: 10px;
            border: 3px solid #000;
            pointer-events: none;
            z-index: 1000;
          }
          
          .pdf-content {
            background: #fff;
            margin: 13px 13px 13px 13px;
            padding: 15px 15px;
            min-height: calc(100vh - 56px);
            position: relative;
            box-sizing: border-box;
          }
          

          
          .page-watermark {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 80px;
            font-weight: bold;
            color: #e0e0e0;
            opacity: 0.3;
            transform: rotate(-45deg);
            z-index: 999;
            pointer-events: none;
            white-space: nowrap;
            user-select: none;
          }
          
          .content-layer {
            position: relative;
            z-index: 10;
            background: rgba(255, 255, 255, 0.9);
          }
          

          
          .first-page-spacing {
            margin-top: -12px;
          }
          
          .compact-header {
            margin-bottom: 8px;
            padding-bottom: 8px;
          }
          
          .compact-section {
            margin-bottom: 12px;
          }
          
          .question-text {
            page-break-after: avoid;
            break-after: avoid;
          }
          
          .question-options {
            page-break-before: avoid;
            page-break-after: avoid;
            break-before: avoid;
            break-after: avoid;
          }
          
          .answer-section {
            page-break-before: avoid;
            break-before: avoid;
          }
          
          /* Table styles for ReactMarkdown */
          table {
            width: auto;
            border-collapse: collapse;
            margin: 1.5em 0;
            font-size: 1em;
          }
          th,
          td {
            border: 1px solid #d1d5db;
            padding: 0.5em 1em;
            text-align: left;
          }
          th {
            background: #f3f4f6;
            font-weight: 600;
          }
          tr:nth-child(even) td {
            background: #f9fafb;
          }
        }
        
        /* Test border - positioned to be fully visible */
        .page-border {
          position: fixed;
          top: 10px;
          left: 10px;
          right: 10px;
          bottom: 10px;
          border: 3px solid #000;
          pointer-events: none;
          z-index: 1000;
        }
        
        .pdf-content {
          background: #fff;
          margin: 13px 13px 13px 13px;
          padding: 15px 15px;
          min-height: calc(100vh - 56px);
          position: relative;
          box-sizing: border-box;
        }
        
        table {
          width: auto;
          max-width: calc(100% - 20px); /* Ensure tables don't exceed container */
          word-break: break-word;
        }

        
        .page-watermark {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 80px;
          font-weight: bold;
          color: #e0e0e0;
          opacity: 0.3;
          transform: rotate(-45deg);
          z-index: 999;
          pointer-events: none;
          white-space: nowrap;
          user-select: none;
        }
        
        .content-layer {
          position: relative;
          z-index: 10;
          background: rgba(255, 255, 255, 0.85);
        }
        
        /* Table styles for ReactMarkdown - Screen version */
        table {
          width: auto;
          border-collapse: collapse;
          margin: 1.5em 0;
          font-size: 1em;
        }
        th,
        td {
          border: 1px solid #d1d5db;
          padding: 0.5em 1em;
          text-align: left;
        }
        th {
          background: #f3f4f6;
          font-weight: 600;
        }
        tr:nth-child(even) td {
          background: #f9fafb;
        }

      `}
      </style>
      {/* STEP 1: Border First - Simple fixed border */}
      <div className="page-border"></div>
      
      {/* STEP 2: Content inside border */}
      <div className="pdf-content">
        {/* Visible Watermark - Appears on all pages */}
        <div className="page-watermark">
          © 2025 instaku.com
        </div>
        
        {/* Visible Watermark - Appears on all pages */}
        <div className="page-watermark">
          © 2025 instaku.com
        </div>
        
          {/* Header */}
          {showHeader && (
          <div className="compact-header" style={{
            textAlign: 'center',
            fontSize: `${fontSize + 4}px`,
            fontWeight: 'bold',
            marginBottom: '8px',
            paddingBottom: '8px',
            borderBottom: '2px solid #000',
            color: '#000'
          }}>
            {headerText}
          </div>
        )}

        {/* Student Information Section */}
        {showStudentInfo && studentFields && (
          <div className="first-page-spacing compact-section" style={{
            marginBottom: '12px',
            padding: '12px',
            border: '2px solid #000',
            backgroundColor: '#fff',
            textAlign: customFormatting?.studentInfoPosition === 'top-center' ? 'center' : 
                      customFormatting?.studentInfoPosition === 'top-right' ? 'right' : 'left'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              fontSize: `${fontSize}px`
            }}>
              {Object.entries(studentFields).map(([key, field]) => 
                field.enabled && (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 'bold', minWidth: '90px', color: '#000', fontSize: `${fontSize - 1}px` }}>{field.label}:</span>
                    <div style={{
                      flex: 1,
                      borderBottom: '1.5px solid #000',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '4px'
                    }}>
                      {field.defaultValue && (
                        <span style={{ fontSize: `${fontSize - 1}px`, color: '#333' }}>
                          {field.defaultValue}
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Common Instructions */}
        {includeCommonInstructions && commonInstructionsText && (
          <div className="compact-section" style={{
            marginBottom: '12px',
            padding: '12px',
            border: '2px solid #000',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{
              fontSize: `${fontSize + 1}px`,
              fontWeight: 'bold',
              marginBottom: '6px',
              color: '#000'
            }}>
              Instructions
            </h3>
            <p style={{
              fontSize: `${fontSize}px`,
              color: '#000',
              margin: 0,
              lineHeight: 1.5
            }}>
              {commonInstructionsText}
            </p>
          </div>
        )}

        {/* Questions */}
        {questions.map((question, index) => {
          const parsedOptions = parseOptions(question.options);
          const questionType = question.question_type || 'unknown';
          
          return (
            <React.Fragment key={question.id || index}>
              {/* Question Header and Text Section */}
              <div 
                className="question-text"
                style={{
                  marginBottom: '4px',
                  padding: '12px',
                  backgroundColor: '#fff'
                }}
              >
                {/* Question Header */}
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
                  {showQuestionNumbers && (
                    <div style={{
                      fontWeight: 'bold',
                      fontSize: `${fontSize + 2}px`,
                      marginRight: '12px',
                      minWidth: '35px',
                      color: '#000',
                    }}>
                      {index + 1}.
                    </div>
                  )}
                  
                  <div style={{ flex: 1 }}>
                    {includeQuestionText && (
                      <div style={{
                        lineHeight: 1.6,
                        marginBottom: (showQuestionTypes || showSubjectBadges) ? '8px' : '0',
                        fontSize: `${fontSize}px`,
                        color: '#000',
                        fontWeight: '500'
                      }}>
                        <ReactMarkdown remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}>{question.question || ''}</ReactMarkdown>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {showQuestionTypes && (
                        <span style={{
                          backgroundColor: '#f0f0f0',
                          color: '#333',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: `${fontSize - 2}px`,
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          border: '1px solid #ccc'
                        }}>
                          {questionType.replace(/-/g, ' ')}
                        </span>
                      )}
                      
                      {showSubjectBadges && question.subject && (
                        <span style={{
                          backgroundColor: '#e3f2fd',
                          color: '#1565c0',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: `${fontSize - 2}px`,
                          fontWeight: 'bold',
                          border: '1px solid #1565c0'
                        }}>
                          {question.subject}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Options Section (separate for page breaking) */}
              {includeOptions && questionType === 'multiple-choice' && parsedOptions.length > 0 && (
                <div 
                  className="question-options"
                  style={{
                    marginBottom: '4px',
                    padding: '12px',
                    paddingTop: '8px',
                    backgroundColor: '#fff'
                  }}
                >
                  <div style={{ marginLeft: showQuestionNumbers ? '47px' : '0' }}>
                    {parsedOptions.map((option, optIndex) => {
                      const { cleanedOption, showLabel } = processOption(option);
                      const label = String.fromCharCode(65 + optIndex) + '.';
                      
                      return (
                        <div 
                          key={optIndex} 
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            marginBottom: '8px',
                            fontSize: `${fontSize}px`,
                            lineHeight: 1.6,
                          }}
                        >
                          {showLabel && (
                            <div style={{
                              fontWeight: 600,
                              marginRight: '10px',
                              minWidth: '26px',
                              fontSize: `${fontSize}px`,
                              color: '#1976d2',
                            }}>
                              {label}
                            </div>
                          )}
                          <div style={{ flex: 1, paddingRight: '10px' }}>
                            <ReactMarkdown remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}>{cleanedOption || option}</ReactMarkdown>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Answer Section (separate for page breaking) */}
              {includeCorrectAnswer && (
                <div 
                  className="answer-section"
                  style={{
                    marginBottom: `${questionSpacing}px`,
                    padding: '12px',
                    backgroundColor: highlightAnswers ? '#f8fdf8' : '#f5f5f5'
                  }}
                >
                  <div style={{ marginLeft: showQuestionNumbers ? '47px' : '0' }}>
                    <div style={{
                      color: highlightAnswers ? '#2e7d32' : '#000',
                      fontWeight: 600,
                      marginBottom: includeExplanation && question.explanation ? '10px' : '0',
                      fontSize: `${fontSize}px`,
                    }}>
                      <span style={{ fontWeight: 'bold' }}>Answer:</span> <ReactMarkdown remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}>{formatAnswer(question.correct_answer || '', parsedOptions)}</ReactMarkdown>
                    </div>
                    
                    {includeExplanation && question.explanation && (
                      <div>
                        <div style={{
                          fontWeight: 'bold',
                          color: '#424242',
                          marginTop: '8px',
                          fontSize: `${fontSize}px`,
                          marginBottom: '4px',
                        }}>
                          Explanation:
                        </div>
                        <div style={{
                          color: '#424242',
                          fontSize: `${fontSize}px`,
                          lineHeight: 1.6,
                        }}>
                          <ReactMarkdown remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}>{question.explanation}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Single section for questions without answers */}
              {!includeCorrectAnswer && (
                <div style={{
                  marginBottom: `${questionSpacing}px`,
                  padding: '12px',
                  paddingTop: '8px',
                  backgroundColor: '#fff'
                }}>
                  {/* Empty space for answers */}
                  <div style={{ height: '40px' }}></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
};
