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
  chapter_number?: string
  chapter_name?: string
  learning_outcome?: string
  user_id: string | null  // UPDATED: Allow null for non-authenticated users
  deleted_at?: string | null  // NEW: Add soft delete field
  created_at?: string
  updated_at?: string
  is_public: boolean
  is_shared: boolean
  shared_with: string[] | null
  question_source?: string
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
      chapter_number: inputs.chapterNumber || null,
      chapter_name: inputs.chapterName || null,
      learning_outcome: inputs.learningOutcome || null,
      question_source: inputs.question_source || 'general', // <-- add this line
      user_id: userId || null,
      is_public: !userId,        // true if no userId (anonymous), false if logged in
      is_shared: false,          // always false on creation
      shared_with: null          // always null on creation      
      
    }))

    // FIXED: Execute different queries based on user authentication
    const { data, error } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select()

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


export interface QuestionRating {
  id?: number
  question_id: number
  user_id: string | null
  rating: number
  created_at?: string
  updated_at?: string
}

/**
 * Save or update a user's rating for a question.
 */
export const saveQuestionRating = async (
  questionId: number,
  userId: string | null,
  rating: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('question_ratings')
      .upsert(
        [{ question_id: questionId, user_id: userId, rating }],
        { onConflict: 'question_id,user_id' }
      )
    if (error) {
      console.error('Error saving rating:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

/**
 * Get average rating and user's rating for a question.
 */
type QuestionRatingRow = {
  rating: number
  user_id: string | null
}

export const getQuestionRating = async (
  questionId: number,
  userId?: string | null
): Promise<{ success: boolean; average?: number; userRating?: number; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('question_ratings')
      .select('rating, user_id')
      .eq('question_id', questionId)

    if (error) {
      console.error('Error fetching ratings:', error)
      return { success: false, error: error.message }
    }

    const rows = (data ?? []) as QuestionRatingRow[]
    if (rows.length === 0) {
      return { success: true, average: 0, userRating: undefined }
    }

    const ratings = rows.map(r => r.rating)
    const average = ratings.reduce((a, b) => a + b, 0) / ratings.length

    let userRating: number | undefined = undefined
    if (userId) {
      const userRow = rows.find(r => r.user_id === userId)
      userRating = userRow?.rating
    }

    return { success: true, average, userRating }
  } catch (err) {
    return { success: false, error: (err as Error).message }
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

/**
 * Get all public questions (optionally filter out deleted).
 */
export const getPublicQuestions = async (filters?: {
  subject?: string
  grade?: string
  limit?: number
  includeDeleted?: boolean
}): Promise<{ success: boolean; data?: QuestionRecord[]; error?: string }> => {
  try {
    let query = supabase
      .from('questions')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (!filters?.includeDeleted) {
      query = query.is('deleted_at', null)
    }
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
      console.error('Error fetching public questions:', error)
      return { success: false, error: getErrorMessage(error) }
    }

    return {
      success: true,
      data: data ? (data as QuestionRecord[]) : []
    }
  } catch (err) {
    console.error('Unexpected error fetching public questions:', err)
    return {
      success: false,
      error: getErrorMessage(err)
    }
  }
}

const databaseApi = {
  saveQuestions,
  getQuestions,
  getPublicQuestions, // <-- add this
  deleteUserQuestion,
  getUserQuestions,
  softDeleteUserQuestion,
  restoreUserQuestion
};
export default databaseApi;

export interface ContactMessage {
  contact_id?: number
  name: string
  email: string
  message: string
  created_at?: string
}

export const saveContactMessage = async (
  name: string,
  email: string,
  message: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('contact_messages')
      .insert([{ name, email, message }])
    if (error) {
      console.error('Error saving contact message:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}