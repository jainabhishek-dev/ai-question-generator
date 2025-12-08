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

export const updateUserQuestion = async (
  questionId: number,
  userId: string,
  updated: Partial<QuestionRecord>
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Remove fields that should not be updated directly
    const rest = { ...updated }
    delete rest.id
    delete rest.user_id
    delete rest.created_at
    delete rest.updated_at
    delete rest.deleted_at

    // Use Record<string, unknown> for safe assignment
    const fieldsToUpdate: Record<string, unknown> = { ...rest }
    fieldsToUpdate.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('questions')
      .update(fieldsToUpdate)
      .eq('id', questionId)
      .eq('user_id', userId) // Security: only update if user owns it

    if (error) {
      console.error('Error updating question:', error)
      return { success: false, error: error.message }
    }

    console.log(`✅ Question ${questionId} updated for user ${userId}`)
    return { success: true }
  } catch (err) {
    console.error('Unexpected error updating question:', err)
    return { success: false, error: getErrorMessage(err) }
  }
}

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

/* ========== IMAGE-RELATED DATABASE FUNCTIONS ========== */

import type { 
  ImagePrompt, 
  GeneratedImage, 
  QuestionImage,
  QuestionWithImages,
  ImageGenerationResponse,
  AccuracyFeedback 
} from '@/types/question'

/**
 * Save image prompts for a question
 */
export const saveImagePrompts = async (
  questionId: number,
  prompts: Omit<ImagePrompt, 'id' | 'created_at' | 'updated_at' | 'is_generated' | 'is_orphaned'>[]
): Promise<{ success: boolean; data?: ImagePrompt[]; error?: string }> => {
  try {
    const promptsToInsert = prompts.map(prompt => ({
      question_id: questionId,
      prompt_text: prompt.prompt_text,
      original_ai_prompt: prompt.original_ai_prompt,
      placement: prompt.placement,
      style_preference: prompt.style_preference,
      subject_context: prompt.subject_context || null,
      accuracy_requirements: prompt.accuracy_requirements || null,
      user_satisfied: prompt.user_satisfied || null,
      question_deleted_at: null,
      is_generated: false,
      is_orphaned: false
    }))

    const { data, error } = await supabase
      .from('image_prompts')
      .insert(promptsToInsert)
      .select()

    if (error) {
      console.error('Error saving image prompts:', error)
      return { success: false, error: getErrorMessage(error) }
    }

    console.log(`✅ Successfully saved ${promptsToInsert.length} image prompts for question ${questionId}`)
    return { success: true, data: data as ImagePrompt[] }

  } catch (err) {
    console.error('Unexpected error saving image prompts:', err)
    return { success: false, error: getErrorMessage(err) }
  }
}

/**
 * Get image prompts for a question
 */
export const getImagePrompts = async (
  questionId: number
): Promise<{ success: boolean; data?: ImagePrompt[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('image_prompts')
      .select('*')
      .eq('question_id', questionId)
      .eq('is_orphaned', false)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching image prompts:', error)
      return { success: false, error: getErrorMessage(error) }
    }

    return { success: true, data: data as ImagePrompt[] || [] }

  } catch (err) {
    console.error('Unexpected error fetching image prompts:', err)
    return { success: false, error: getErrorMessage(err) }
  }
}

/**
 * Generate a new image for a prompt (legacy approach)
 */
export const generateImage = async (
  promptId: string,
  imageUrl: string,
  promptUsed: string,
  userId?: string,
  altText?: string
): Promise<ImageGenerationResponse> => {
  try {
    // Get current highest attempt number
    const { data: existingAttempts } = await supabase
      .from('question_images')
      .select('attempt_number')
      .eq('prompt_id', promptId)
      .order('attempt_number', { ascending: false })
      .limit(1)

    const nextAttemptNumber = (existingAttempts?.[0]?.attempt_number || 0) + 1

    // Insert new image generation
    const { data: newImage, error } = await supabase
      .from('question_images')
      .insert({
        prompt_id: promptId,
        image_url: imageUrl,
        prompt_used: promptUsed,
        attempt_number: nextAttemptNumber,
        is_selected: true, // Make this the active image
        user_id: userId || null,
        alt_text: altText,
        generated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving generated image:', error)
      return { success: false, error: getErrorMessage(error) }
    }

    // Mark previous attempts as not selected
    await supabase
      .from('question_images')
      .update({ is_selected: false })
      .eq('prompt_id', promptId)
      .neq('id', newImage.id)

    // Update prompt status to generated
    await supabase
      .from('image_prompts')
      .update({ is_generated: true })
      .eq('id', promptId)

    console.log(`✅ Generated image attempt #${nextAttemptNumber} for prompt ${promptId}`)
    return { success: true, data: newImage as GeneratedImage }

  } catch (err) {
    console.error('Unexpected error generating image:', err)
    return { success: false, error: getErrorMessage(err) }
  }
}

/**
 * Generate a new image with new schema (question_id + placement_type)
 */
export const generateImageNewSchema = async (
  questionId: number,
  placementType: string,
  imageUrl: string,
  promptUsed: string,
  promptId?: string,
  userId?: string,
  altText?: string
): Promise<ImageGenerationResponse> => {
  try {
    // Get current highest attempt number for this question/placement
    const { data: existingAttempts } = await supabase
      .from('question_images')
      .select('attempt_number')
      .eq('question_id', questionId)
      .eq('placement_type', placementType)
      .order('attempt_number', { ascending: false })
      .limit(1)

    const nextAttemptNumber = (existingAttempts?.[0]?.attempt_number || 0) + 1

    // Insert new image generation
    const { data: newImage, error } = await supabase
      .from('question_images')
      .insert({
        prompt_id: promptId || null,
        question_id: questionId,
        placement_type: placementType,
        image_url: imageUrl,
        prompt_used: promptUsed,
        attempt_number: nextAttemptNumber,
        is_selected: true, // Make this the active image
        user_id: userId || null,
        alt_text: altText,
        generated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving generated image (new schema):', error)
      return { success: false, error: getErrorMessage(error) }
    }

    // Mark previous images for this question/placement as not selected
    await supabase
      .from('question_images')
      .update({ is_selected: false })
      .eq('question_id', questionId)
      .eq('placement_type', placementType)
      .neq('id', newImage.id)

    console.log(`✅ Generated image attempt #${nextAttemptNumber} for question ${questionId} placement ${placementType}`)
    return { success: true, data: newImage as QuestionImage }

  } catch (err) {
    console.error('Unexpected error generating image (new schema):', err)
    return { success: false, error: getErrorMessage(err) }
  }
}

/**
 * Get all generation attempts for a prompt
 */
export const getImageAttempts = async (
  promptId: string
): Promise<{ success: boolean; data?: GeneratedImage[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('question_images')
      .select('*')
      .eq('prompt_id', promptId)
      .order('attempt_number', { ascending: true })

    if (error) {
      console.error('Error fetching image attempts:', error)
      return { success: false, error: getErrorMessage(error) }
    }

    return { success: true, data: data as GeneratedImage[] || [] }

  } catch (err) {
    console.error('Unexpected error fetching image attempts:', err)
    return { success: false, error: getErrorMessage(err) }
  }
}

/**
 * Select a different image attempt as active (legacy approach)
 */
export const selectImageAttempt = async (
  imageId: string,
  promptId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Mark all attempts as not selected
    await supabase
      .from('question_images')
      .update({ is_selected: false })
      .eq('prompt_id', promptId)

    // Mark chosen attempt as selected
    const { error } = await supabase
      .from('question_images')
      .update({ is_selected: true })
      .eq('id', imageId)

    if (error) {
      console.error('Error selecting image attempt:', error)
      return { success: false, error: getErrorMessage(error) }
    }

    console.log(`✅ Selected image attempt ${imageId} for prompt ${promptId}`)
    return { success: true }

  } catch (err) {
    console.error('Unexpected error selecting image attempt:', err)
    return { success: false, error: getErrorMessage(err) }
  }
}

/**
 * Select image by ID and placement (new schema approach)
 */
export const selectImageByIdAndPlacement = async (
  imageId: string,
  questionId: number,
  placementType: string,
  authenticatedSupabase?: typeof supabase
): Promise<{ success: boolean; error?: string }> => {
  // Use the provided authenticated client, or fall back to the global one
  const client = authenticatedSupabase || supabase
  try {
    // Image selection with authenticated context
    
    // First, deselect all images for this question/placement combination
    const deselectResult = await client
      .from('question_images')
      .update({ is_selected: false })
      .eq('question_id', questionId)
      .eq('placement_type', placementType)
    
    if (deselectResult.error) {
      console.error('Error deselecting images:', deselectResult.error)
      return { success: false, error: getErrorMessage(deselectResult.error) }
    }

    // Then select the chosen image
    const selectResult = await client
      .from('question_images')
      .update({ is_selected: true })
      .eq('id', imageId)

    if (selectResult.error) {
      console.error('Error selecting image:', selectResult.error)
      return { success: false, error: getErrorMessage(selectResult.error) }
    }

    return { success: true }

  } catch (err) {
    console.error('Unexpected error selecting image by placement:', err)
    return { success: false, error: getErrorMessage(err) }
  }
}

/**
 * Rate an image and provide accuracy feedback
 */
export const rateImage = async (
  imageId: string,
  rating?: number,
  accuracyFeedback?: AccuracyFeedback
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updateData: Record<string, unknown> = {}
    
    if (rating !== undefined) {
      updateData.user_rating = rating
    }
    
    if (accuracyFeedback !== undefined) {
      updateData.accuracy_feedback = accuracyFeedback
    }

    const { error } = await supabase
      .from('question_images')
      .update(updateData)
      .eq('id', imageId)

    if (error) {
      console.error('Error rating image:', error)
      return { success: false, error: getErrorMessage(error) }
    }

    console.log(`✅ Updated rating for image ${imageId}`)
    return { success: true }

  } catch (err) {
    console.error('Unexpected error rating image:', err)
    return { success: false, error: getErrorMessage(err) }
  }
}

/**
 * Get question with all associated image data
 */
export const getQuestionWithImages = async (
  questionId: number
): Promise<{ success: boolean; data?: QuestionWithImages; error?: string }> => {
  try {
    // Get question data
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single()

    if (questionError) {
      console.error('Error fetching question:', questionError)
      return { success: false, error: getErrorMessage(questionError) }
    }

    // Get image prompts
    const { data: imagePrompts } = await getImagePrompts(questionId)

    // Get generated images for each prompt
    const generatedImages: GeneratedImage[] = []
    
    if (imagePrompts && imagePrompts.length > 0) {
      for (const prompt of imagePrompts) {
        const { data: attempts } = await getImageAttempts(prompt.id)
        if (attempts) {
          generatedImages.push(...attempts)
        }
      }
    }

    const questionWithImages: QuestionWithImages = {
      ...question,
      image_prompts: imagePrompts || [],
      generated_images: generatedImages
    }

    return { success: true, data: questionWithImages }

  } catch (err) {
    console.error('Unexpected error fetching question with images:', err)
    return { success: false, error: getErrorMessage(err) }
  }
}

/* ========== EXPORTS ========== */

const databaseApi = {
  saveQuestions,
  getQuestions,
  getPublicQuestions,
  deleteUserQuestion,
  getUserQuestions,
  softDeleteUserQuestion,
  restoreUserQuestion,
  // Image-related functions
  saveImagePrompts,
  getImagePrompts,
  generateImage,
  generateImageNewSchema,
  getImageAttempts,
  selectImageAttempt,
  selectImageByIdAndPlacement,
  rateImage,
  getQuestionWithImages
};

export default databaseApi;