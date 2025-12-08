/**
 * Migration utilities for updating question_images table to new schema
 * These functions help migrate from the old prompt-based system to the new question_id + placement_type system
 */

import { createClient } from '@supabase/supabase-js'

// You'll need to set up a service role client for migration operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Migrate question_images to include question_id and placement_type
 * This function populates the new columns based on existing image_prompts relationships
 */
// Type definition for the migration data structure
interface MigrationImage {
  id: string
  prompt_id: string
  is_selected: boolean
  generated_at: string
  image_prompts: {
    id: string
    question_id: number
    placement: string
  }[]
}

// Type definition for migration statistics
interface MigrationStats {
  totalImages: number
  migratedImages: number
  skippedImages: number
  errors: number
  duplicatesFound: number
  duplicatesResolved: number
}

export const migrateQuestionImages = async (): Promise<{ success: boolean; message: string; stats: MigrationStats }> => {
  const stats: MigrationStats = {
    totalImages: 0,
    migratedImages: 0,
    skippedImages: 0,
    errors: 0,
    duplicatesFound: 0,
    duplicatesResolved: 0
  }

  try {
    // Step 1: Get all question_images that need migration (those without question_id)
    console.log('🔍 Finding images to migrate...')
    const { data: imagesToMigrate, error: fetchError } = await supabaseAdmin
      .from('question_images')
      .select(`
        id,
        prompt_id,
        is_selected,
        generated_at,
        image_prompts!inner(
          id,
          question_id,
          placement
        )
      `)
      .is('question_id', null) // Only migrate images without question_id

    if (fetchError) {
      throw new Error(`Failed to fetch images: ${fetchError.message}`)
    }

    stats.totalImages = imagesToMigrate?.length || 0
    console.log(`📊 Found ${stats.totalImages} images to migrate`)

    if (stats.totalImages === 0) {
      return {
        success: true,
        message: 'No images need migration',
        stats
      }
    }

    // Step 2: Group images by question_id and placement to identify duplicates
    console.log('🔍 Identifying duplicates...')
    const imagesByQuestionPlacement: { [key: string]: MigrationImage[] } = {}
    
    if (imagesToMigrate) {
      (imagesToMigrate as MigrationImage[]).forEach((image: MigrationImage) => {
        // image_prompts is an array, but should have only one item due to inner join
        const prompt = image.image_prompts[0]
        if (!prompt) return // Skip if no prompt data
        
        const questionId = prompt.question_id
        const placement = prompt.placement
        const key = `${questionId}-${placement}`
        
        if (!imagesByQuestionPlacement[key]) {
          imagesByQuestionPlacement[key] = []
        }
        imagesByQuestionPlacement[key].push(image)
      })
    }

    // Step 3: Process each question/placement group
    for (const [key, groupImages] of Object.entries(imagesByQuestionPlacement)) {
      const [questionId, placement] = key.split('-')
      
      if (groupImages.length > 1) {
        stats.duplicatesFound += groupImages.length - 1
        console.log(`⚠️ Found ${groupImages.length} images for question ${questionId} placement ${placement}`)
        
        // Keep the most recently selected image, or the most recent if none selected
        const selectedImages = groupImages.filter(img => img.is_selected)
        let imageToKeep: MigrationImage
        
        if (selectedImages.length > 0) {
          // Keep the most recently generated selected image
          imageToKeep = selectedImages.sort((a, b) => 
            new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
          )[0]
        } else {
          // Keep the most recently generated image
          imageToKeep = groupImages.sort((a, b) => 
            new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
          )[0]
        }
        
        // Mark the kept image as selected and update its schema
        await supabaseAdmin
          .from('question_images')
          .update({
            question_id: parseInt(questionId),
            placement_type: placement,
            is_selected: true
          })
          .eq('id', imageToKeep.id)

        // Delete or mark other images as not selected
        const imagesToRemove = groupImages.filter(img => img.id !== imageToKeep.id)
        for (const img of imagesToRemove) {
          // Option 1: Soft delete by marking as not selected and adding question_id for tracking
          await supabaseAdmin
            .from('question_images')
            .update({
              question_id: parseInt(questionId),
              placement_type: placement,
              is_selected: false
            })
            .eq('id', img.id)
          
          // Option 2: Hard delete (uncomment if preferred)
          // await supabaseAdmin
          //   .from('question_images')
          //   .delete()
          //   .eq('id', img.id)
        }
        
        stats.duplicatesResolved += imagesToRemove.length
        stats.migratedImages += groupImages.length
      } else {
        // Single image - just update the schema
        const image = groupImages[0]
        await supabaseAdmin
          .from('question_images')
          .update({
            question_id: parseInt(questionId),
            placement_type: placement,
            is_selected: image.is_selected || true // Ensure at least one image is selected per placement
          })
          .eq('id', image.id)
        
        stats.migratedImages += 1
      }
    }

    console.log('✅ Migration completed successfully')
    return {
      success: true,
      message: `Successfully migrated ${stats.migratedImages} images`,
      stats
    }

  } catch (error) {
    console.error('❌ Migration error:', error)
    stats.errors += 1
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stats
    }
  }
}

/**
 * Validate the migration by checking data consistency
 */
export const validateMigration = async (): Promise<{ success: boolean; issues: string[] }> => {
  const issues: string[] = []

  try {
    // Check 1: All question_images should have question_id and placement_type after migration
    const { data: imagesWithoutSchema } = await supabaseAdmin
      .from('question_images')
      .select('id')
      .or('question_id.is.null,placement_type.is.null')

    if (imagesWithoutSchema && imagesWithoutSchema.length > 0) {
      issues.push(`${imagesWithoutSchema.length} images still missing question_id or placement_type`)
    }

    // Check 2: No question should have multiple selected images for same placement
    const { data: multipleSelected } = await supabaseAdmin
      .from('question_images')
      .select('question_id, placement_type')
      .eq('is_selected', true)
      .not('question_id', 'is', null)
      .not('placement_type', 'is', null)

    if (multipleSelected) {
      const duplicateSelections: { [key: string]: number } = {}
      multipleSelected.forEach(img => {
        const key = `${img.question_id}-${img.placement_type}`
        duplicateSelections[key] = (duplicateSelections[key] || 0) + 1
      })

      const duplicates = Object.entries(duplicateSelections).filter(([, count]) => count > 1)
      if (duplicates.length > 0) {
        issues.push(`${duplicates.length} question/placement combinations have multiple selected images`)
      }
    }

    // Check 3: Verify referential integrity with questions table
    const { data: orphanedImages } = await supabaseAdmin
      .from('question_images')
      .select(`
        id,
        question_id,
        questions!inner(id)
      `)
      .not('question_id', 'is', null)

    const { data: allImages } = await supabaseAdmin
      .from('question_images')
      .select('id, question_id')
      .not('question_id', 'is', null)

    const validImageCount = orphanedImages?.length || 0
    const totalImageCount = allImages?.length || 0

    if (totalImageCount > validImageCount) {
      issues.push(`${totalImageCount - validImageCount} images reference non-existent questions`)
    }

    return {
      success: issues.length === 0,
      issues
    }

  } catch (error) {
    return {
      success: false,
      issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    }
  }
}

/**
 * Rollback migration by removing question_id and placement_type from question_images
 * USE WITH CAUTION - This will revert to the old schema
 */
export const rollbackMigration = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('⚠️ Rolling back migration...')
    
    const { error } = await supabaseAdmin
      .from('question_images')
      .update({
        question_id: null,
        placement_type: null
      })
      .not('question_id', 'is', null)

    if (error) {
      throw error
    }

    console.log('✅ Migration rolled back successfully')
    return {
      success: true,
      message: 'Migration rolled back successfully'
    }

  } catch (error) {
    console.error('❌ Rollback error:', error)
    return {
      success: false,
      message: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get migration status and statistics
 */
export const getMigrationStatus = async (): Promise<{
  needsMigration: boolean
  totalImages: number
  migratedImages: number
  duplicateGroups: number
}> => {
  try {
    // Count total images
    const { count: totalImages } = await supabaseAdmin
      .from('question_images')
      .select('*', { count: 'exact', head: true })

    // Count migrated images (those with question_id)
    const { count: migratedImages } = await supabaseAdmin
      .from('question_images')
      .select('*', { count: 'exact', head: true })
      .not('question_id', 'is', null)

    // Count potential duplicates
    const { data: duplicateCheck } = await supabaseAdmin
      .from('question_images')
      .select('question_id, placement_type')
      .eq('is_selected', true)
      .not('question_id', 'is', null)
      .not('placement_type', 'is', null)

    const duplicateGroups = duplicateCheck ? 
      Object.keys(duplicateCheck.reduce((acc, img) => {
        const key = `${img.question_id}-${img.placement_type}`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as { [key: string]: number })).filter(key => 
        (duplicateCheck.reduce((acc, img) => {
          const imgKey = `${img.question_id}-${img.placement_type}`
          acc[imgKey] = (acc[imgKey] || 0) + 1
          return acc
        }, {} as { [key: string]: number }))[key] > 1
      ).length : 0

    return {
      needsMigration: (migratedImages || 0) < (totalImages || 0),
      totalImages: totalImages || 0,
      migratedImages: migratedImages || 0,
      duplicateGroups
    }

  } catch (error) {
    console.error('Error getting migration status:', error)
    return {
      needsMigration: false,
      totalImages: 0,
      migratedImages: 0,
      duplicateGroups: 0
    }
  }
}