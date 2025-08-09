// src/server/components/ExportPdfDocument.tsx
import React from 'react';
import { QuestionRecord } from '../../types/question';

type Props = {
  questions: QuestionRecord[];
  exportType: "worksheet" | "answer-key";
  preferences?: {
    formatting?: {
      fontSize?: number;
      showHeaders?: boolean;
      showFooters?: boolean;
      questionSpacing?: number;
    };
    branding?: {
      title?: string;
      logo?: string;
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
    } catch (error) {
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

function processOption(option: string, index: number): { cleanedOption: string; showLabel: boolean } {
  if (!option || typeof option !== 'string') {
    return { cleanedOption: '', showLabel: true };
  }
  
  const label = String.fromCharCode(65 + index);
  const labelPatterns = [
    new RegExp(`^${label}\\)\\s*`, 'i'),
    new RegExp(`^${label}\\.\\s*`, 'i'),
    new RegExp(`^${label}\\s+`, 'i'),
    new RegExp(`^\\(${label}\\)\\s*`, 'i'),
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

function formatAnswer(answer: string, options: string[]): string {
  if (!answer) return '';
  
  const letterMatch = answer.match(/^([A-Z])[).]?\s*$/);
  if (letterMatch && options.length > 0) {
    const letterIndex = letterMatch[1].charCodeAt(0) - 65;
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
  const questionSpacing = preferences?.formatting?.questionSpacing || 24;
  const brandingTitle = preferences?.branding?.title || (exportType === "worksheet" ? "Worksheet" : "Answer Key");
  const showHeaders = preferences?.formatting?.showHeaders ?? true;
  const showFooters = preferences?.formatting?.showFooters ?? true;

  return (
    <div style={{
      fontFamily: 'Times New Roman, serif',
      fontSize: `${fontSize}px`,
      lineHeight: 1.6,
      color: '#333333',
      backgroundColor: '#ffffff',
      padding: '40px',
      minHeight: '100vh',
    }}>
      {/* Header */}
      {showHeaders && (
        <div style={{
          textAlign: 'center',
          fontSize: `${fontSize + 6}px`,
          fontWeight: 'bold',
          color: '#1a237e',
          paddingBottom: '12px',
          borderBottom: '2px solid #e8eaf6',
          marginBottom: '32px',
        }}>
          {brandingTitle}
        </div>
      )}

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
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{
                fontWeight: 'bold',
                fontSize: `${fontSize + 2}px`,
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
                }}>
                  {question.question || ''}
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
                  const { cleanedOption, showLabel } = processOption(option, optIndex);
                  const label = String.fromCharCode(65 + optIndex);
                  
                  return (
                    <div 
                      key={optIndex} 
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        marginBottom: '8px',
                        lineHeight: 1.6,
                      }}
                    >
                      {showLabel && (
                        <div style={{
                          fontWeight: 600,
                          marginRight: '10px',
                          minWidth: '26px',
                          color: '#1976d2',
                        }}>
                          {label})
                        </div>
                      )}
                      <div style={{ flex: 1, paddingRight: '10px' }}>
                        {cleanedOption || option}
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
                borderLeft: '4px solid #4caf50',
              }}>
                <div style={{
                  color: '#2e7d32',
                  fontWeight: 600,
                  marginBottom: '10px',
                  fontSize: `${fontSize}px`,
                }}>
                  <span style={{ fontWeight: 'bold' }}>Answer:</span> {formatAnswer(question.correct_answer || '', parsedOptions)}
                </div>
                
                {question.explanation && (
                  <div>
                    <div style={{
                      fontWeight: 'bold',
                      color: '#424242',
                      marginTop: '8px',
                      marginBottom: '4px',
                    }}>
                      Explanation:
                    </div>
                    <div style={{
                      color: '#424242',
                      fontSize: `${fontSize - 1}px`,
                      lineHeight: 1.6,
                    }}>
                      {question.explanation}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Footer */}
      {showFooters && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '40px',
          right: '40px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#757575',
          paddingTop: '8px',
          borderTop: '1px solid #e0e0e0',
        }}>
          Generated by AI Question Generator
        </div>
      )}
    </div>
  );
};
