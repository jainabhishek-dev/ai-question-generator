/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  Image, 
  StyleSheet, 
  Font 
} from '@react-pdf/renderer';
import { QuestionRecord } from '../../types/question';

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

// Register fonts (optional - for better typography)
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf', fontWeight: 'normal' },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf', fontWeight: 'bold' },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOkCnqEu92Fr1Mu51xIIzc.ttf', fontStyle: 'italic' },
  ],
});

// Utility function to parse options (keeping your original logic)
function parseOptions(options: string | string[] | null | undefined): string[] {
  if (!options) return [];
  if (Array.isArray(options)) {
    return options;
  }
  if (typeof options === 'string') {
    if (options.trim() === '[]') return [];
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Error parsing options:", error);
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

// Utility function to process options (keeping your original logic)
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

// Utility function to format answers (keeping your original logic)
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

// Simple markdown-like text processing for React-PDF
function processMarkdownText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  // Basic markdown processing (React-PDF doesn't support complex markdown)
  const processed = text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers (will handle with fontWeight)
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic markers (will handle with fontStyle)
    .replace(/`(.*?)`/g, '$1')       // Remove code markers
    .replace(/\$\$(.*?)\$\$/g, '[$1]') // Replace LaTeX block with brackets
    .replace(/\$(.*?)\$/g, '[$1]')     // Replace LaTeX inline with brackets
    .trim();
  return processed;
}

// Detect if text has bold/italic formatting
function getTextStyle(text: string): { fontWeight?: 'bold' | 'normal'; fontStyle?: 'italic' | 'normal' } {
  const style: { fontWeight?: 'bold' | 'normal'; fontStyle?: 'italic' | 'normal' } = {};
  
  if (text.includes('**') || text.includes('<strong>')) {
    style.fontWeight = 'bold';
  }
  if (text.includes('*') && !text.includes('**') || text.includes('<em>')) {
    style.fontStyle = 'italic';
  }
  
  return style;
}

export const ExportPdfDocument: React.FC<Props> = ({
  questions,
  exportType,
  preferences,
}) => {
  const fontSize = preferences?.formatting?.fontSize || 14;
  const questionSpacing = preferences?.formatting?.questionSpacing || 24;
  const brandingTitle = preferences?.branding?.title || (exportType === "worksheet" ? "Worksheet" : "Answer Key");
  const brandingLogo = preferences?.branding?.logo;
  const showHeaders = preferences?.formatting?.showHeaders ?? true;
  const showFooters = preferences?.formatting?.showFooters ?? true;

  // Create dynamic styles based on preferences
  const styles = StyleSheet.create({
    page: {
      fontFamily: 'Roboto',
      fontSize: fontSize,
      lineHeight: 1.6,
      color: '#333333',
      backgroundColor: '#ffffff',
      paddingTop: showHeaders ? 80 : 40,
      paddingBottom: showFooters ? 60 : 40,
      paddingHorizontal: 40,
    },

    // Header styles
    header: {
      position: 'absolute',
      top: 20,
      left: 40,
      right: 40,
      textAlign: 'center',
      fontSize: fontSize + 6,
      fontWeight: 'bold',
      color: '#1a237e',
      paddingBottom: 12,
      borderBottom: '2 solid #e8eaf6',
    },

    // Footer styles
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 40,
      right: 40,
      textAlign: 'center',
      fontSize: 11,
      color: '#757575',
      paddingTop: 8,
      borderTop: '1 solid #e0e0e0',
    },

    // Logo styles
    brandingLogo: {
      width: 250,
      height: 60,
      alignSelf: 'center',
      marginBottom: 20,
    },

    // Title styles
    title: {
      textAlign: 'center',
      marginBottom: 32,
      fontWeight: 'bold',
      fontSize: fontSize + 8,
      color: '#2c3e50',
    },

    // Question container
    questionContainer: {
      marginBottom: questionSpacing,
      paddingBottom: 12,
      borderBottom: '1 solid #f0f0f0',
    },

    lastQuestion: {
      marginBottom: 20,
      borderBottom: 'none',
    },

    // Question header
    questionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },

    questionNumber: {
      fontWeight: 'bold',
      fontSize: fontSize + 2,
      marginRight: 12,
      minWidth: 30,
      color: '#2c3e50',
    },

    questionTextContainer: {
      flex: 1,
    },

    questionText: {
      lineHeight: 1.7,
      marginBottom: 0,
    },

    questionTypeBadge: {
      backgroundColor: '#e3f2fd',
      color: '#1565c0',
      paddingVertical: 3,
      paddingHorizontal: 10,
      borderRadius: 12,
      fontSize: fontSize - 3,
      fontWeight: 500,
      marginLeft: 12,
      alignSelf: 'flex-start',
    },

    // Options styles
    optionsContainer: {
      marginLeft: 42,
      marginTop: 12,
    },

    optionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },

    optionLabel: {
      fontWeight: 600,
      marginRight: 10,
      minWidth: 26,
      color: '#1976d2',
    },

    optionContent: {
      flex: 1,
      paddingRight: 10,
      lineHeight: 1.6,
    },

    // Instruction text styles
    instructionContainer: {
      marginLeft: 42,
      marginTop: 12,
      backgroundColor: '#f9f9f9',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 4,
      borderLeft: '3 solid #dddddd',
    },

    instructionText: {
      fontStyle: 'italic',
      color: '#666666',
    },

    instructionLabel: {
      fontWeight: 'bold',
    },

    // Answer section styles
    answerSection: {
      marginLeft: 42,
      marginTop: 16,
      marginBottom: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: '#f8fdf8',
      borderRadius: 6,
      borderLeft: '4 solid #4caf50',
    },

    answerText: {
      color: '#2e7d32',
      fontWeight: 600,
      marginBottom: 10,
      fontSize: fontSize,
    },

    answerLabel: {
      fontWeight: 'bold',
    },

    explanationText: {
      color: '#424242',
      fontSize: fontSize - 1,
      lineHeight: 1.6,
      marginTop: 8,
    },

    explanationLabel: {
      fontWeight: 'bold',
    },

    // Text formatting styles
    boldText: {
      fontWeight: 'bold',
    },

    italicText: {
      fontStyle: 'italic',
    },

    codeText: {
      fontFamily: 'Courier',
      backgroundColor: '#f5f7fa',
      fontSize: fontSize - 1,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        {showHeaders && (
          <View style={styles.header} fixed>
            <Text>{brandingTitle}</Text>
          </View>
        )}

        {/* Title and Logo (when headers are off) */}
        {!showHeaders && (
          <>
            {brandingLogo && (
              <Image src={brandingLogo} style={styles.brandingLogo} />
            )}
            <Text style={styles.title}>{brandingTitle}</Text>
          </>
        )}

        {/* Questions */}
        {questions.map((q, idx) => {
          const parsedOptions = parseOptions(q.options);
          const questionType = q.question_type || 'unknown';
          const isLastQuestion = idx === questions.length - 1;
          const processedQuestionText = processMarkdownText(q.question);
          const questionTextStyle = getTextStyle(q.question);

          return (
            <View 
              key={q.id || idx} 
              style={isLastQuestion ? styles.lastQuestion : styles.questionContainer}
              wrap={false} // Prevent question from breaking across pages
            >
              {/* Question Header */}
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>{idx + 1}.</Text>
                <View style={styles.questionTextContainer}>
                  <Text style={[styles.questionText, questionTextStyle]}>
                    {processedQuestionText}
                  </Text>
                  <View style={styles.questionTypeBadge}>
                    <Text>{questionType.replace(/-/g, ' ')}</Text>
                  </View>
                </View>
              </View>

              {/* Multiple Choice Options */}
              {questionType === 'multiple-choice' && parsedOptions.length > 0 && (
                <View style={styles.optionsContainer}>
                  {parsedOptions.map((opt, i) => {
                    const { cleanedOption, showLabel } = processOption(opt, i);
                    const label = String.fromCharCode(65 + i);
                    const processedOption = processMarkdownText(cleanedOption || opt);
                    const optionTextStyle = getTextStyle(cleanedOption || opt);

                    return (
                      <View key={i} style={styles.optionItem}>
                        {showLabel && (
                          <Text style={styles.optionLabel}>{label})</Text>
                        )}
                        <Text style={[styles.optionContent, optionTextStyle]}>
                          {processedOption}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Instructions for Different Question Types */}
              {questionType === 'multiple-choice' && (
                <View style={styles.instructionContainer}>
                  <Text style={styles.instructionText}>
                    <Text style={styles.instructionLabel}>Instructions:</Text> Select the correct option.
                  </Text>
                </View>
              )}

              {questionType === 'fill-in-the-blank' && (
                <View style={styles.instructionContainer}>
                  <Text style={styles.instructionText}>
                    <Text style={styles.instructionLabel}>Instructions:</Text> Fill in the blank above.
                  </Text>
                </View>
              )}

              {questionType === 'short-answer' && (
                <View style={styles.instructionContainer}>
                  <Text style={styles.instructionText}>
                    <Text style={styles.instructionLabel}>Instructions:</Text> Provide a short answer (2-3 sentences).
                  </Text>
                </View>
              )}

              {questionType === 'long-answer' && (
                <View style={styles.instructionContainer}>
                  <Text style={styles.instructionText}>
                    <Text style={styles.instructionLabel}>Instructions:</Text> Provide a detailed answer with explanation.
                  </Text>
                </View>
              )}

              {/* Answer Key Section */}
              {exportType === "answer-key" && (
                <View style={styles.answerSection}>
                  <Text style={styles.answerText}>
                    <Text style={styles.answerLabel}>Answer:</Text>{' '}
                    {processMarkdownText(formatAnswer(q.correct_answer || '', parsedOptions))}
                  </Text>
                  
                  {q.explanation && (
                    <Text style={styles.explanationText}>
                      <Text style={styles.explanationLabel}>Explanation:</Text>{' '}
                      {processMarkdownText(q.explanation)}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Footer */}
        {showFooters && (
          <View style={styles.footer} fixed>
            <Text>Generated by AI Question Generator</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};
