// src/server/components/ExportPdfDocument.tsx
import React from 'react';
import { QuestionRecord } from '../../types/question';
import ReactMarkdown from 'react-markdown';


type Props = {
  questions: QuestionRecord[];
  exportType: "worksheet" | "answer-key";
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
  preferences,
}) => {
  const fontSize = preferences?.formatting?.fontSize || 12;
  const questionSpacing = preferences?.formatting?.questionSpacing || 20;

  return (
    <>
      {/* Print and screen styles for header/footer */}
      <style>
      {`
        @media print {
          @page {
            margin-top: 0.7in;    /* Increased to prevent bleeding */
            margin-bottom: 0.6in; /* Increased to prevent bleeding */
            margin-left: 0.1in;
            margin-right: 0.1in;
          }
        }    
      `}
      </style>
      {/* Body */}
      <div>
        {/* Questions */}
        {questions.map((question, index) => {
          const parsedOptions = parseOptions(question.options);
          const questionType = question.question_type || 'unknown';
          
          return (
            <div 
              key={question.id || index}
              style={{
                marginBottom: `${questionSpacing}px`,
                paddingBottom: '12px',
                borderBottom: index < questions.length - 1 ? '1px solid #f0f0f0' : 'none',
              }}
            >
              {/* Question Header */}
              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
                <div style={{
                  fontWeight: 'bold',
                  fontSize: `${fontSize}px`,
                  marginRight: '12px',
                  minWidth: '30px',
                  color: '#2c3e50',
                }}>
                  {index + 1}.
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{
                    lineHeight: 1.7,
                    marginBottom: '4px',
                    fontSize: `${fontSize}px`,
                  }}>
                    <ReactMarkdown>{question.question || ''}</ReactMarkdown>
                  </div>
                  
                  <span style={{
                    backgroundColor: '#e3f2fd',
                    color: '#1565c0',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: `${fontSize - 3}px`,
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}>
                    {questionType.replace(/-/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Multiple Choice Options */}
              {questionType === 'multiple-choice' && parsedOptions.length > 0 && (
                <div style={{ marginLeft: '42px', marginTop: '12px' }}>
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
                          <ReactMarkdown>{cleanedOption || option}</ReactMarkdown>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Instructions */}
              {questionType === 'multiple-choice' && (
                <div style={{
                  marginLeft: '42px',
                  marginTop: '12px',
                  backgroundColor: '#f9f9f9',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: `${fontSize}px`,
                  borderLeft: '3px solid #dddddd',
                }}>
                  <div style={{ fontStyle: 'italic', color: '#666666' }}>
                    <span style={{ fontWeight: 'bold' }}>Instructions:</span> Select the correct option.
                  </div>
                </div>
              )}

              {/* Other instruction types */}
              {questionType === 'fill-in-the-blank' && (
                <div style={{
                  marginLeft: '42px',
                  marginTop: '12px',
                  backgroundColor: '#f9f9f9',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: `${fontSize}px`,
                  borderLeft: '3px solid #dddddd',
                }}>
                  <div style={{ fontStyle: 'italic', color: '#666666' }}>
                    <span style={{ fontWeight: 'bold' }}>Instructions:</span> Fill in the blank above.
                  </div>
                </div>
              )}

              {/* Answer Key Section */}
              {exportType === "answer-key" && (
                <div style={{
                  marginLeft: '42px',
                  marginTop: '16px',
                  marginBottom: '12px',
                  padding: '12px 16px',
                  backgroundColor: '#f8fdf8',
                  borderRadius: '6px',
                  fontSize: `${fontSize}px`,
                  borderLeft: '4px solid #4caf50',
                }}>
                  <div style={{
                    color: '#2e7d32',
                    fontWeight: 600,
                    marginBottom: '10px',
                    fontSize: `${fontSize}px`,
                  }}>
                    <span style={{ fontWeight: 'bold' }}>Answer:</span> <ReactMarkdown>{formatAnswer(question.correct_answer || '', parsedOptions)}</ReactMarkdown>
                  </div>
                  
                  {question.explanation && (
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
                        <ReactMarkdown>{question.explanation}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
