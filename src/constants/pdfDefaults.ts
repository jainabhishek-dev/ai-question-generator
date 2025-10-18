import { PdfFormatting, PdfCustomization, StudentFields } from '../types/question';

// Central PDF formatting defaults - single unified format
export const PDF_DEFAULTS = {
  FONT_SIZE: 12,
  QUESTION_SPACING: 20,
  MARGINS: { top: 1, right: 0.75, bottom: 1, left: 0.75 }, // Single margin setting
  CONTENT_PADDING: '15px',
  HEADER_FONT_SIZE_OFFSET: 4
} as const;

// Student field defaults
export const DEFAULT_STUDENT_FIELDS: StudentFields = {
  name: {
    enabled: true,
    label: 'Name',
    defaultValue: '',
    placeholder: 'Student Name'
  },
  class: {
    enabled: true,
    label: 'Class',
    defaultValue: '',
    placeholder: 'e.g., 10th A'
  },
  rollNumber: {
    enabled: true,
    label: 'Roll Number',
    defaultValue: '',
    placeholder: 'e.g., 101'
  },
  date: {
    enabled: true,
    label: 'Date',
    defaultValue: new Date().toLocaleDateString(),
    placeholder: 'DD/MM/YYYY'
  },
  duration: {
    enabled: true,
    label: 'Duration',
    defaultValue: '60 minutes',
    placeholder: 'e.g., 60 minutes'
  }
};

// Content option defaults
export const DEFAULT_CONTENT_OPTIONS = {
  includeQuestionText: true,
  includeOptions: true,
  includeCorrectAnswer: false,
  includeExplanation: false,
  showQuestionNumbers: true,
  showQuestionTypes: true,
  showSubjectBadges: false,
  includeCommonInstructions: true,
  commonInstructionsText: 'Read all questions carefully before answering. Choose the best answer for each question.'
};

// Default PDF formatting - single unified format
export const DEFAULT_PDF_FORMATTING = {
  fontSize: PDF_DEFAULTS.FONT_SIZE,
  questionSpacing: PDF_DEFAULTS.QUESTION_SPACING,
  margins: PDF_DEFAULTS.MARGINS,
  showHeader: true,
  headerText: 'Question Set',
  showStudentInfo: true,
  studentInfoPosition: 'top-right' as const
};

// Helper function to create full customization object
export function createPdfCustomization(
  overrides: Partial<PdfCustomization> = {}
): PdfCustomization {
  return {
    template: 'default', // Single template
    studentFields: DEFAULT_STUDENT_FIELDS,
    formatting: { ...DEFAULT_PDF_FORMATTING, ...overrides.formatting } as PdfFormatting,
    ...DEFAULT_CONTENT_OPTIONS,
    ...overrides
  };
}