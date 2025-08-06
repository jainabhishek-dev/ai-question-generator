import { supabase } from './supabase'
import { Inputs } from '@/components/AdvancedQuestionForm'

// Types for better type safety
export interface QuestionRecord {
  id?: number
  question: string
  question_type: string
  options?: string[] | null
  correct_answer: string
  explanation?: string
  subject: string
  sub_subject?: string
  topic: string
  sub_topic?: string
  grade: string
  difficulty: string
  blooms_level: string
  pdf_content?: string
  additional_notes?: string
  user_id: string | null  // UPDATED: Allow null for non-authenticated users
  deleted_at?: string | null  // NEW: Add soft delete field
  created_at?: string
  updated_at?: string
}

export interface GeneratedQuestion {
  type: string
  question: string
  options?: string[]
  correctAnswer: string
  correctAnswerLetter?: string
  explanation?: string
}

// Helper function for consistent error message extraction
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: string }).message) : String(error)
  }
  return 'Unknown error occurred'
}

// FIXED: Use proper Supabase JavaScript client pattern
// FIXED: Use conditional query execution instead of variable reassignment
export const saveQuestions = async (
  inputs: Inputs, 
  generatedQuestions: GeneratedQuestion[],
  userId?: string | null
): Promise<{ success: boolean; data?: QuestionRecord[]; error?: string }> => {
  try {
    const questionsToInsert = generatedQuestions.map(q => ({
      question: q.question,
      question_type: q.type,
      options: q.options || null,
      correct_answer: q.correctAnswer,
      explanation: q.explanation || null,
      subject: inputs.subject,
      sub_subject: inputs.subSubject || null,
      topic: inputs.topic,
      sub_topic: inputs.subTopic || null,
      grade: inputs.grade,
      difficulty: inputs.difficulty,
      blooms_level: inputs.bloomsLevel,
      pdf_content: inputs.pdfContent || null,
      additional_notes: inputs.additionalNotes || null,
      user_id: userId || null
    }))

    // FIXED: Execute different queries based on user authentication
    const { data, error } = userId 
      ? await supabase.from('questions').insert(questionsToInsert).select()
      : await supabase.from('questions').insert(questionsToInsert)

    if (error) {
      console.error('Database Error:', error)
      return { success: false, error: getErrorMessage(error) }
    }

    const logMessage = userId 
      ? `✅ Successfully saved ${questionsToInsert.length} questions for user ${userId}`
      : `✅ Successfully saved ${questionsToInsert.length} questions (anonymous user)`
    
    console.log(logMessage)
    
    return { 
      success: true, 
      data: data ? (data as QuestionRecord[]) : undefined 
    }

  } catch (err) {
    console.error('Unexpected error saving questions:', err)
    return { 
      success: false, 
      error: getErrorMessage(err)
    }
  }
}

// Function to retrieve questions (for future "My Questions" feature)
export const getQuestions = async (filters?: {
  subject?: string
  grade?: string
  limit?: number
}): Promise<{ success: boolean; data?: QuestionRecord[]; error?: string }> => {
  try {
    let query = supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters if provided
    if (filters?.subject) {
      query = query.eq('subject', filters.subject)
    }
    if (filters?.grade) {
      query = query.eq('grade', filters.grade)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching questions:', error)
      return { success: false, error: getErrorMessage(error) }
    }

    return { 
      success: true, 
      data: data ? (data as QuestionRecord[]) : [] 
    }

  } catch (err) {
    console.error('Unexpected error fetching questions:', err)
    return { 
      success: false, 
      error: getErrorMessage(err)
    }
  }
}

// UPDATE: Filter out soft-deleted questions in getUserQuestions
export const getUserQuestions = async (
  userId: string,
  filters?: {
    subject?: string
    grade?: string
    limit?: number
    includeDeleted?: boolean  // NEW: Option to include soft-deleted items
  }
): Promise<{ success: boolean; data?: QuestionRecord[]; error?: string }> => {
  try {
    let query = supabase
      .from('questions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // NEW: Filter out soft-deleted questions unless specifically requested
    if (!filters?.includeDeleted) {
      query = query.is('deleted_at', null)
    }

    // Apply additional filters if provided
    if (filters?.subject) {
      query = query.eq('subject', filters.subject)
    }
    if (filters?.grade) {
      query = query.eq('grade', filters.grade)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching user questions:', error)
      return { success: false, error: getErrorMessage(error) }
    }

    return { 
      success: true, 
      data: data ? (data as QuestionRecord[]) : [] 
    }

  } catch (err) {
    console.error('Unexpected error fetching user questions:', err)
    return { 
      success: false, 
      error: getErrorMessage(err)
    }
  }
}

// NEW: Soft delete function
export const softDeleteUserQuestion = async (
  questionId: number,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('questions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', questionId)
      .eq('user_id', userId)  // Security: only delete if user owns it

    if (error) {
      console.error('Error soft deleting question:', error)
      return { success: false, error: getErrorMessage(error) }
    }

    console.log(`✅ Question ${questionId} soft deleted for user ${userId}`)
    return { success: true }

  } catch (err) {
    console.error('Unexpected error soft deleting question:', err)
    return { 
      success: false, 
      error: getErrorMessage(err)
    }
  }
}

// NEW: Restore soft-deleted question
export const restoreUserQuestion = async (
  questionId: number,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('questions')
      .update({ deleted_at: null })
      .eq('id', questionId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error restoring question:', error)
      return { success: false, error: getErrorMessage(error) }
    }

    console.log(`✅ Question ${questionId} restored for user ${userId}`)
    return { success: true }

  } catch (err) {
    console.error('Unexpected error restoring question:', err)
    return { 
      success: false, 
      error: getErrorMessage(err)
    }
  }
}

// Delete question (user can only delete their own questions)
export const deleteUserQuestion = async (
  questionId: number,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId)
      .eq('user_id', userId)  // Security: only delete if user owns it

    if (error) {
      console.error('Error deleting question:', error)
      return { success: false, error: getErrorMessage(error) }
    }

    console.log(`✅ Question ${questionId} deleted successfully for user ${userId}`)
    return { success: true }

  } catch (err) {
    console.error('Unexpected error deleting question:', err)
    return { 
      success: false, 
      error: getErrorMessage(err)
    }
  }
}

const databaseApi = {
  saveQuestions,
  getQuestions,
  deleteUserQuestion,
  getUserQuestions,
  softDeleteUserQuestion,
  restoreUserQuestion
};
export default databaseApi;