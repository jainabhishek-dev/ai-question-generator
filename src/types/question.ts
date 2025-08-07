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

export type ExportPdfRequest = {
  selectedIds: number[] | string[];
  userId: string;
  exportType: 'worksheet' | 'answer-key';
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
  accessToken: string;
};
