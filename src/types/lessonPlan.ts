export interface LessonPlanSection {
  content: string;
  timeAllocation?: number; // minutes allocated to this section
}

export interface LessonPlan {
  id?: number;
  subject: string;
  grade: string;
  chapterName?: string;
  learningObjective: string;
  learnerLevel: 'beginner' | 'intermediate' | 'advanced';
  durationMinutes: 30 | 45 | 60;
  sections: {
    teacherPreparation?: LessonPlanSection;
    iDo?: LessonPlanSection;
    weDo?: LessonPlanSection;
    youDo?: LessonPlanSection;
    conclusion?: LessonPlanSection;
    homework?: LessonPlanSection;
  };
  additionalNotes?: string;
  extractedObjectives?: string[];
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface LessonPlanRecord {
  id?: number;
  user_id?: string | null;
  subject: string;
  grade: string;
  chapter_name?: string;
  learning_objective: string;
  learner_level: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: 30 | 45 | 60;
  sections: Record<string, unknown>;
  content: Record<string, unknown>;
  additional_notes?: string;
  extracted_objectives?: string[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface LearningObjective {
  text: string;
  id?: number;
  relevanceScore?: number;
}

export interface ObjectiveExtractionResult {
  objectives: LearningObjective[];
  totalFound: number;
  filtered: boolean;
}

export interface LessonPlanFormData {
  subject: string;
  grade: string;
  chapterName?: string;
  sections: string[]; // Array of section names to include
  pdfFile?: File;
  additionalNotes?: string;
}

export interface LessonPlanState {
  // Step 1: Form data
  formData: LessonPlanFormData;
  
  // Step 2: Objectives
  extractedObjectives: LearningObjective[];
  selectedObjective?: string;
  
  // Step 3: Learner level
  learnerLevel?: 'beginner' | 'intermediate' | 'advanced';
  
  // Step 4: Duration
  duration?: 30 | 45 | 60;
  
  // Step 5: Final plan
  generatedPlan?: LessonPlan;
  
  // UI state
  currentStep: 'form' | 'objectives' | 'level' | 'duration' | 'generating' | 'complete';
  loading: boolean;
  error?: string;
}

export interface LessonPlanGenerationRequest {
  formData: LessonPlanFormData;
  selectedObjective: string;
  learnerLevel: 'beginner' | 'intermediate' | 'advanced';
  duration: 30 | 45 | 60;
  userId?: string;
}

export interface LessonPlanGenerationResponse {
  success: boolean;
  data?: LessonPlan;
  error?: string;
}

export interface ObjectiveExtractionRequest {
  pdfFile: File;
  subject: string;
  grade: string;
  maxObjectives?: number;
}

export interface ObjectiveExtractionResponse {
  success: boolean;
  data?: ObjectiveExtractionResult;
  error?: string;
}

// Available lesson plan sections
export const LESSON_PLAN_SECTIONS = {
  teacherPreparation: 'Teacher Preparation',
  iDo: 'I Do (Teacher Demonstration)', 
  weDo: 'We Do (Guided Practice)',
  youDo: 'You Do (Independent Practice)',
  conclusion: 'Conclusion',
  homework: 'Homework'
} as const;

export type LessonPlanSectionKey = keyof typeof LESSON_PLAN_SECTIONS;

// Duration options with descriptions
export const DURATION_OPTIONS = [
  {
    value: 30 as const,
    label: '30 Minutes',
    description: 'Quick focused session',
    features: ['Brief introduction', 'Core concept coverage', 'Quick practice']
  },
  {
    value: 45 as const,
    label: '45 Minutes',
    description: 'Standard class period',
    features: ['Detailed explanation', 'Guided practice', 'Independent work']
  },
  {
    value: 60 as const,
    label: '60 Minutes',
    description: 'Extended deep-dive session',
    features: ['Comprehensive coverage', 'Multiple activities', 'Assessment & reflection']
  }
];

// Learner level options with descriptions
export const LEARNER_LEVEL_OPTIONS = [
  {
    value: 'beginner' as const,
    label: 'Beginner',
    description: 'New to this concept',
    icon: '🌱'
  },
  {
    value: 'intermediate' as const,
    label: 'Intermediate', 
    description: 'Some prior knowledge',
    icon: '📚'
  },
  {
    value: 'advanced' as const,
    label: 'Advanced',
    description: 'Strong foundation, ready for complex applications',
    icon: '🎓'
  }
];

// Objective extraction limits
export const OBJECTIVE_LIMITS = {
  maxObjectives: 8,
  warningThreshold: 6,
  fallbackMessage: "More than 8 objectives found. Showing the most relevant ones."
};