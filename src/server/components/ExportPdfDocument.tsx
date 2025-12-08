// src/server/components/ExportPdfDocument.tsx
import React from 'react';
import { QuestionRecord, PdfCustomization, GeneratedImage } from '../../types/question';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { generatePdfStyles } from '../../constants/pdfStyles';
import { PDF_DEFAULTS } from '../../constants/pdfDefaults';
import { extractImagePlaceholders } from '../../lib/questionParser';

// Preprocess content to replace image placeholders with markdown images
function preprocessContentWithImages(content: string, questionImages: GeneratedImage[] = []): string {
  let processedContent = content;
  
  // Extract placeholders from content
  const placeholders = extractImagePlaceholders(content);
  
  placeholders.forEach((placeholder) => {
    // Find matching image by description or alt text
    const matchingImage = questionImages.find(img => 
      img.is_selected && (
        img.alt_text?.toLowerCase().includes(placeholder.description.toLowerCase()) ||
        img.prompt_used.toLowerCase().includes(placeholder.description.toLowerCase())
      )
    );
    
    if (matchingImage) {
      // Replace placeholder with markdown image
      const imageMarkdown = `![${placeholder.description}](${matchingImage.image_url} "${placeholder.description}")`;
      processedContent = processedContent.replace(placeholder.placeholder, imageMarkdown);
    } else {
      // Replace with placeholder text that will be handled by the paragraph component
      processedContent = processedContent.replace(placeholder.placeholder, `[IMAGE_PLACEHOLDER:${placeholder.description}]`);
    }
  });
  
  return processedContent;
}

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
  // Image support
  questionImages?: { [questionId: string]: GeneratedImage[] };
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

// Helper function to render educational images in PDF
function renderEducationalImage(imageUrl: string, altText: string, maxWidth: number = 400): React.ReactElement {
  return (
    <div style={{
      margin: '12px 0',
      textAlign: 'center',
      pageBreakInside: 'avoid'
    }}>
      <img 
        src={imageUrl}
        alt={altText}
        style={{
          maxWidth: `${maxWidth}px`,
          maxHeight: '300px',
          width: 'auto',
          height: 'auto',
          border: '1px solid #ddd',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      />
      {altText && (
        <div style={{
          fontSize: '11px',
          color: '#666',
          marginTop: '4px',
          fontStyle: 'italic'
        }}>
          {altText}
        </div>
      )}
    </div>
  );
}

// Custom ReactMarkdown components for handling images in PDF
function createPdfMarkdownComponents() {
  return {
    p: ({ children, ...props }: React.ComponentProps<'p'>) => {
      const content = children?.toString() || '';
      
      // Check if this paragraph contains our processed image placeholder
      const placeholderMatch = content.match(/\[IMAGE_PLACEHOLDER:([^\]]+)\]/);
      
      if (placeholderMatch) {
        const description = placeholderMatch[1];
        
        // Show placeholder text for missing images
        return (
          <div style={{
            margin: '12px 0',
            padding: '20px',
            border: '2px dashed #ccc',
            borderRadius: '4px',
            textAlign: 'center',
            color: '#666',
            fontSize: '12px',
            backgroundColor: '#f9f9f9'
          }}>
            📷 Educational Image
            <br />
            <small>{description}</small>
          </div>
        );
      }
      
      return <p {...props} style={{ margin: '0 0 8px 0', lineHeight: 1.5 }}>{children}</p>;
    },
    
    // Handle other markdown elements that might contain images
    img: ({ src, alt }: React.ComponentProps<'img'>) => {
      if (src && typeof src === 'string') {
        return renderEducationalImage(src, alt || 'Educational image');
      }
      return null;
    }
  };
}

export const ExportPdfDocument: React.FC<Props> = ({
  questions,
  exportType,
  customization,
  preferences,
  questionImages = {},
}) => {
  // Use customization settings or fallback to legacy preferences
  const customFormatting = customization?.formatting;
  const legacyFormatting = preferences?.formatting;
  
  const fontSize = customFormatting?.fontSize || legacyFormatting?.fontSize || PDF_DEFAULTS.FONT_SIZE;
  const questionSpacing = customFormatting?.questionSpacing || legacyFormatting?.questionSpacing || PDF_DEFAULTS.QUESTION_SPACING;
  
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
      {/* Use centralized styles */}
      <style>{generatePdfStyles()}</style>
      
      {/* PDF content - borders handled by @page CSS */}
      <div className="pdf-content">
        {/* Watermark - single instance */}
        <div className="page-watermark">
          © 2025 instaku.com
        </div>
        
          {/* Header */}
          {showHeader && (
          <div className="compact-header" style={{
            textAlign: 'center',
            fontSize: `${fontSize + PDF_DEFAULTS.HEADER_FONT_SIZE_OFFSET}px`,
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
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}
                          rehypePlugins={[rehypeKatex]}
                          components={createPdfMarkdownComponents()}
                        >
                          {preprocessContentWithImages(question.question || '', questionImages[question.id?.toString() || ''] || [])}
                        </ReactMarkdown>
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
                            <ReactMarkdown 
                              remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {cleanedOption || option}
                            </ReactMarkdown>
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
                      <span style={{ fontWeight: 'bold' }}>Answer:</span> <ReactMarkdown 
                        remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {formatAnswer(question.correct_answer || '', parsedOptions)}
                      </ReactMarkdown>
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
                          <ReactMarkdown 
                            remarkPlugins={[remarkMath, [remarkGfm, { breaks: true }]]}
                            rehypePlugins={[rehypeKatex]}
                            components={createPdfMarkdownComponents()}
                          >
                            {preprocessContentWithImages(question.explanation, questionImages[question.id?.toString() || ''] || [])}
                          </ReactMarkdown>
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
