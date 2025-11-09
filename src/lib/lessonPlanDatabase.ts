import { supabase } from './supabase';
import { LessonPlan, LessonPlanRecord } from '@/types/lessonPlan';

// Helper function for consistent error message extraction
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'Unknown error occurred';
};

/**
 * Save a lesson plan to the database
 */
export const saveLessonPlan = async (
  lessonPlan: LessonPlan,
  userId?: string | null
): Promise<{ success: boolean; data?: LessonPlanRecord; error?: string }> => {
  try {
    const lessonPlanToInsert = {
      user_id: userId || null,
      subject: lessonPlan.subject,
      grade: lessonPlan.grade,
      chapter_name: lessonPlan.chapterName || null,
      learning_objective: lessonPlan.learningObjective,
      learner_level: lessonPlan.learnerLevel,
      duration_minutes: lessonPlan.durationMinutes,
      sections: lessonPlan.sections,
      content: lessonPlan.sections, // Store sections as content for compatibility
      additional_notes: lessonPlan.additionalNotes || null,
      extracted_objectives: lessonPlan.extractedObjectives || null,
    };

    const { data, error } = await supabase
      .from('lesson_plans')
      .insert([lessonPlanToInsert])
      .select()
      .single();

    if (error) {
      console.error('Database Error:', error);
      return { success: false, error: getErrorMessage(error) };
    }

    console.log(`✅ Successfully saved lesson plan for ${userId ? `user ${userId}` : 'anonymous user'}`);
    return { success: true, data: data as LessonPlanRecord };

  } catch (err) {
    console.error('Unexpected error saving lesson plan:', err);
    return { success: false, error: getErrorMessage(err) };
  }
};

/**
 * Get all lesson plans for a user
 */
export const getUserLessonPlans = async (
  userId: string,
  filters?: {
    subject?: string;
    grade?: string;
    limit?: number;
    includeDeleted?: boolean;
  }
): Promise<{ success: boolean; data?: LessonPlanRecord[]; error?: string }> => {
  try {
    let query = supabase
      .from('lesson_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Filter out soft-deleted lesson plans unless specifically requested
    if (!filters?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    // Apply additional filters if provided
    if (filters?.subject) {
      query = query.eq('subject', filters.subject);
    }
    if (filters?.grade) {
      query = query.eq('grade', filters.grade);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user lesson plans:', error);
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data: data ? (data as LessonPlanRecord[]) : [] };

  } catch (err) {
    console.error('Unexpected error fetching user lesson plans:', err);
    return { success: false, error: getErrorMessage(err) };
  }
};

/**
 * Get a specific lesson plan by ID
 */
export const getLessonPlanById = async (
  lessonPlanId: number,
  userId?: string
): Promise<{ success: boolean; data?: LessonPlanRecord; error?: string }> => {
  try {
    let query = supabase
      .from('lesson_plans')
      .select('*')
      .eq('id', lessonPlanId);

    // If userId provided, ensure user owns the lesson plan
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching lesson plan:', error);
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data: data as LessonPlanRecord };

  } catch (err) {
    console.error('Unexpected error fetching lesson plan:', err);
    return { success: false, error: getErrorMessage(err) };
  }
};

/**
 * Update a lesson plan
 */
export const updateLessonPlan = async (
  lessonPlanId: number,
  userId: string,
  updates: Partial<LessonPlan>
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Remove fields that should not be updated directly
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, userId, createdAt, updatedAt, deletedAt, ...rest } = updates;

    // Convert LessonPlan format to database format
    const fieldsToUpdate: Record<string, unknown> = {};
    
    if (rest.subject) fieldsToUpdate.subject = rest.subject;
    if (rest.grade) fieldsToUpdate.grade = rest.grade;
    if (rest.chapterName !== undefined) fieldsToUpdate.chapter_name = rest.chapterName;
    if (rest.learningObjective) fieldsToUpdate.learning_objective = rest.learningObjective;
    if (rest.learnerLevel) fieldsToUpdate.learner_level = rest.learnerLevel;
    if (rest.durationMinutes) fieldsToUpdate.duration_minutes = rest.durationMinutes;
    if (rest.sections) {
      fieldsToUpdate.sections = rest.sections;
      fieldsToUpdate.content = rest.sections; // Keep content in sync
    }
    if (rest.additionalNotes !== undefined) fieldsToUpdate.additional_notes = rest.additionalNotes;

    if (rest.extractedObjectives !== undefined) fieldsToUpdate.extracted_objectives = rest.extractedObjectives;

    fieldsToUpdate.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('lesson_plans')
      .update(fieldsToUpdate)
      .eq('id', lessonPlanId)
      .eq('user_id', userId); // Security: only update if user owns it

    if (error) {
      console.error('Error updating lesson plan:', error);
      return { success: false, error: getErrorMessage(error) };
    }

    console.log(`✅ Lesson plan ${lessonPlanId} updated for user ${userId}`);
    return { success: true };

  } catch (err) {
    console.error('Unexpected error updating lesson plan:', err);
    return { success: false, error: getErrorMessage(err) };
  }
};

/**
 * Soft delete a lesson plan
 */
export const softDeleteLessonPlan = async (
  lessonPlanId: number,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('lesson_plans')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', lessonPlanId)
      .eq('user_id', userId); // Security: only delete if user owns it

    if (error) {
      console.error('Error soft deleting lesson plan:', error);
      return { success: false, error: getErrorMessage(error) };
    }

    console.log(`✅ Lesson plan ${lessonPlanId} soft deleted for user ${userId}`);
    return { success: true };

  } catch (err) {
    console.error('Unexpected error soft deleting lesson plan:', err);
    return { success: false, error: getErrorMessage(err) };
  }
};

/**
 * Restore a soft-deleted lesson plan
 */
export const restoreLessonPlan = async (
  lessonPlanId: number,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('lesson_plans')
      .update({ deleted_at: null })
      .eq('id', lessonPlanId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error restoring lesson plan:', error);
      return { success: false, error: getErrorMessage(error) };
    }

    console.log(`✅ Lesson plan ${lessonPlanId} restored for user ${userId}`);
    return { success: true };

  } catch (err) {
    console.error('Unexpected error restoring lesson plan:', err);
    return { success: false, error: getErrorMessage(err) };
  }
};

/**
 * Permanently delete a lesson plan
 */
export const deleteLessonPlan = async (
  lessonPlanId: number,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('lesson_plans')
      .delete()
      .eq('id', lessonPlanId)
      .eq('user_id', userId); // Security: only delete if user owns it

    if (error) {
      console.error('Error deleting lesson plan:', error);
      return { success: false, error: getErrorMessage(error) };
    }

    console.log(`✅ Lesson plan ${lessonPlanId} permanently deleted for user ${userId}`);
    return { success: true };

  } catch (err) {
    console.error('Unexpected error deleting lesson plan:', err);
    return { success: false, error: getErrorMessage(err) };
  }
};

/**
 * Convert database record to LessonPlan type
 */
export const recordToLessonPlan = (record: LessonPlanRecord): LessonPlan => {
  return {
    id: record.id,
    subject: record.subject,
    grade: record.grade,
    chapterName: record.chapter_name || undefined,
    learningObjective: record.learning_objective,
    learnerLevel: record.learner_level,
    durationMinutes: record.duration_minutes,
    sections: record.sections as LessonPlan['sections'],
    additionalNotes: record.additional_notes || undefined,
    extractedObjectives: record.extracted_objectives || undefined,
    userId: record.user_id || undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at || undefined,
  };
};

/**
 * Get lesson plan statistics for a user
 */
export const getLessonPlanStats = async (
  userId: string
): Promise<{ success: boolean; data?: { total: number; bySubject: Record<string, number>; byGrade: Record<string, number> }; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('lesson_plans')
      .select('subject, grade')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      return { success: false, error: getErrorMessage(error) };
    }

    const stats = {
      total: data.length,
      bySubject: {} as Record<string, number>,
      byGrade: {} as Record<string, number>,
    };

    data.forEach((plan) => {
      // Count by subject
      stats.bySubject[plan.subject] = (stats.bySubject[plan.subject] || 0) + 1;
      // Count by grade
      stats.byGrade[plan.grade] = (stats.byGrade[plan.grade] || 0) + 1;
    });

    return { success: true, data: stats };

  } catch (err) {
    console.error('Unexpected error fetching lesson plan stats:', err);
    return { success: false, error: getErrorMessage(err) };
  }
};

const lessonPlanDatabase = {
  saveLessonPlan,
  getUserLessonPlans,
  getLessonPlanById,
  updateLessonPlan,
  softDeleteLessonPlan,
  restoreLessonPlan,
  deleteLessonPlan,
  recordToLessonPlan,
  getLessonPlanStats,
};

export default lessonPlanDatabase;