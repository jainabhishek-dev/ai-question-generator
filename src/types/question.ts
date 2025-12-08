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
  
  // Virtual fields for image data (populated via joins)
  image_prompts?: ImagePrompt[];
  generated_images?: GeneratedImage[];
};

// Image-related interfaces for educational content
export interface ImagePrompt {
  id: string;
  question_id: number;
  prompt_text: string;
  original_ai_prompt: string;
  placement: ImagePlacement;
  style_preference: ImageStyle;
  subject_context?: string;
  accuracy_requirements?: string[];
  is_generated: boolean;
  user_satisfied?: boolean;
  question_deleted_at?: string;
  is_orphaned: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeneratedImage {
  id: string;
  prompt_id: string;
  image_url: string;
  prompt_used: string;
  attempt_number: number;
  user_rating?: number;
  accuracy_feedback?: AccuracyFeedback;
  alt_text?: string;
  file_size_bytes?: number;
  image_width?: number;
  image_height?: number;
  is_selected: boolean;
  user_id?: string;
  generated_at: string;
  
  // New schema fields - will be added to database
  question_id?: number;
  placement_type?: ImagePlacement;
  
  // Fields from joined data with image_prompts table
  prompt_text?: string;
  original_ai_prompt?: string;
  placement?: ImagePlacement;
  style_preference?: ImageStyle;
  prompt_created_at?: string;
}

// New interface for the updated question_images table schema
export interface QuestionImage {
  id: string;
  prompt_id: string;
  image_url: string;
  prompt_used: string;
  attempt_number: number;
  user_rating?: number;
  accuracy_feedback?: AccuracyFeedback;
  alt_text?: string;
  file_size_bytes?: number;
  image_width?: number;
  image_height?: number;
  is_selected: boolean;
  user_id?: string;
  generated_at: string;
  
  // New required fields for updated schema
  question_id: number;
  placement_type: ImagePlacement;
  
  // Fields from joined data with image_prompts table
  prompt_text?: string;
  original_ai_prompt?: string;
  style_preference?: ImageStyle;
  prompt_created_at?: string;
}

// Educational image placement options
export type ImagePlacement = 
  | 'question' 
  | 'option_a' 
  | 'option_b' 
  | 'option_c' 
  | 'option_d' 
  | 'explanation' 
  | 'before_question';

// Educational image styles based on subject
export type ImageStyle = 
  | 'scientific_diagram'
  | 'mathematical_chart'
  | 'simple_illustration'
  | 'technical_drawing'
  | 'infographic'
  | 'educational_diagram'
  | 'textbook_illustration';

// User feedback for educational accuracy
export type AccuracyFeedback = 
  | 'correct' 
  | 'incorrect' 
  | 'partially_correct';

// Image generation configuration
export interface ImageGenerationConfig {
  numberOfImages: 1 | 2 | 3 | 4;
  imageSize: '1K' | '2K';
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  personGeneration: 'dont_allow' | 'allow_adult' | 'allow_all';
}

// Request/Response interfaces for image operations
export interface ImageGenerationRequest {
  prompt_id: string;
  edited_prompt?: string;
  style?: ImageStyle;
  config?: Partial<ImageGenerationConfig>;
  user_id?: string;
}

export interface ImageGenerationResponse {
  success: boolean;
  data?: GeneratedImage;
  error?: string;
}

export interface ImagePromptRequest {
  question_id: number;
  prompts: Omit<ImagePrompt, 'id' | 'created_at' | 'updated_at' | 'is_generated' | 'is_orphaned'>[];
}

// Enhanced question interface with image support
export interface QuestionWithImages extends QuestionRecord {
  image_prompts: ImagePrompt[];
  generated_images: GeneratedImage[];
}

// New interface for questions with the updated image schema
export interface QuestionWithNewImages extends QuestionRecord {
  question_images: QuestionImage[];
  image_prompts: ImagePrompt[];
}

// Utility types for image management
export interface ImagesByPlacement {
  [placement: string]: QuestionImage[];
}

export interface ImageSelectionRequest {
  imageId: string;
  questionId: number;
  placementType: ImagePlacement;
}

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
