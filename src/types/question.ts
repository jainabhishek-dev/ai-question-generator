export type QuestionRecord = {
  id?: number;
  question: string;
  question_type: string;
  options?: string[] | null;
  correct_answer: string;
  explanation?: string;
  subject?: string;
  sub_subject?: string;
  topic?: string;
  sub_topic?: string;
  grade: string;
  difficulty: string;
  blooms_level?: string;
  pdf_content?: string;
  additional_notes?: string;
  user_id?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

// Student Information Field Configuration
export interface StudentField {
  enabled: boolean;
  label: string;
  defaultValue: string;
  placeholder?: string;
}

export interface StudentFields {
  name: StudentField;
  class: StudentField;
  rollNumber: StudentField;
  date: StudentField;
  duration: StudentField;
}

// PDF Formatting Options
export interface PdfFormatting {
  // Typography
  fontSize: number;
  questionSpacing: number;
  
  // Layout
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  
  // Header/Footer
  showHeader: boolean;
  headerText?: string;
  
  // Student Information Section
  showStudentInfo: boolean;
  studentInfoPosition: 'top-left' | 'top-right' | 'top-center';
}

// Complete PDF Customization Options
export interface PdfCustomization {
  template: 'default'; // Simplified to single template
  studentFields: StudentFields;
  formatting: PdfFormatting;
  
  // Content Selection Options
  includeQuestionText: boolean;
  includeOptions: boolean;  // For MCQ and True/False
  includeCorrectAnswer: boolean;
  includeExplanation: boolean;
  showQuestionNumbers: boolean;
  showQuestionTypes: boolean;
  showSubjectBadges: boolean;
  
  // Common Instructions
  includeCommonInstructions: boolean;
  commonInstructionsText?: string;
  
  // Legacy support
  showInstructions?: boolean;
  highlightAnswers?: boolean;
  showExplanations?: boolean;
}

export type ExportPdfRequest = {
  selectedIds: number[] | string[];
  userId: string;
  exportType: 'worksheet' | 'answer-key';
  customization?: PdfCustomization;
  accessToken: string;
};
