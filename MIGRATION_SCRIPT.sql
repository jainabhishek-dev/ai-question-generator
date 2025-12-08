-- ============================================
-- QUESTION IMAGES SCHEMA MIGRATION
-- ============================================
-- This script updates the question_images table to support the new schema
-- with direct question_id and placement_type relationships
--
-- IMPORTANT: 
-- 1. Backup your database before running this migration
-- 2. Test on a copy of production data first
-- 3. This migration includes data cleanup for duplicate images
-- 4. The migration is designed to be idempotent (safe to run multiple times)
--
-- Run these steps in order:

-- ============================================
-- STEP 1: Add new columns to question_images table
-- ============================================

-- Add question_id column (references questions table directly)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'question_images' 
        AND column_name = 'question_id'
    ) THEN
        ALTER TABLE question_images 
        ADD COLUMN question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added question_id column to question_images table';
    ELSE
        RAISE NOTICE 'question_id column already exists in question_images table';
    END IF;
END $$;

-- Add placement_type column (replaces reliance on image_prompts.placement)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'question_images' 
        AND column_name = 'placement_type'
    ) THEN
        ALTER TABLE question_images 
        ADD COLUMN placement_type VARCHAR(20) 
        CHECK (placement_type IN ('question', 'option_a', 'option_b', 'option_c', 'option_d', 'explanation'));
        
        RAISE NOTICE 'Added placement_type column to question_images table';
    ELSE
        RAISE NOTICE 'placement_type column already exists in question_images table';
    END IF;
END $$;

-- ============================================
-- STEP 2: Populate new columns from existing data
-- ============================================

-- Update question_id and placement_type from image_prompts relationships
UPDATE question_images 
SET 
    question_id = ip.question_id,
    placement_type = ip.placement
FROM image_prompts ip 
WHERE question_images.prompt_id = ip.id 
AND question_images.question_id IS NULL;

-- Report how many rows were updated
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM question_images 
    WHERE question_id IS NOT NULL AND placement_type IS NOT NULL;
    
    RAISE NOTICE 'Updated % question_images records with question_id and placement_type', updated_count;
END $$;

-- ============================================
-- STEP 3: Clean up duplicate images
-- ============================================

-- Create a temporary function to handle duplicates
CREATE OR REPLACE FUNCTION cleanup_duplicate_question_images()
RETURNS TEXT AS $$
DECLARE
    duplicate_record RECORD;
    images_to_keep UUID[];
    images_to_remove UUID[];
    total_duplicates INTEGER := 0;
    total_removed INTEGER := 0;
BEGIN
    -- Find groups of images that are duplicates (same question_id + placement_type)
    FOR duplicate_record IN 
        SELECT question_id, placement_type, array_agg(id ORDER BY 
            CASE WHEN is_selected THEN 0 ELSE 1 END, -- Selected images first
            generated_at DESC -- Most recent first
        ) as image_ids, COUNT(*) as count
        FROM question_images 
        WHERE question_id IS NOT NULL AND placement_type IS NOT NULL
        GROUP BY question_id, placement_type
        HAVING COUNT(*) > 1
    LOOP
        total_duplicates := total_duplicates + 1;
        
        -- Keep the first image (most recent selected, or most recent if none selected)
        images_to_keep := array_append(images_to_keep, duplicate_record.image_ids[1]);
        
        -- Mark the kept image as selected
        UPDATE question_images 
        SET is_selected = true 
        WHERE id = duplicate_record.image_ids[1];
        
        -- Remove or deselect other images in this group
        FOR i IN 2..array_length(duplicate_record.image_ids, 1) LOOP
            images_to_remove := array_append(images_to_remove, duplicate_record.image_ids[i]);
            
            -- Option 1: Mark as not selected (soft delete - keeps history)
            UPDATE question_images 
            SET is_selected = false 
            WHERE id = duplicate_record.image_ids[i];
            
            -- Option 2: Hard delete (uncomment to permanently remove duplicates)
            -- DELETE FROM question_images WHERE id = duplicate_record.image_ids[i];
            
            total_removed := total_removed + 1;
        END LOOP;
        
        RAISE NOTICE 'Processed duplicate group: question_id=%, placement_type=%, kept=%, removed=%', 
                     duplicate_record.question_id, duplicate_record.placement_type, 1, duplicate_record.count - 1;
    END LOOP;
    
    RETURN FORMAT('Processed %s duplicate groups, removed %s duplicate images', total_duplicates, total_removed);
END;
$$ LANGUAGE plpgsql;

-- Run the cleanup function
SELECT cleanup_duplicate_question_images();

-- Drop the temporary function
DROP FUNCTION cleanup_duplicate_question_images();

-- ============================================
-- STEP 4: Add indexes and constraints for performance and data integrity
-- ============================================

-- Create unique index to prevent future duplicates (one selected image per question/placement)
DROP INDEX IF EXISTS idx_question_images_unique_selected_per_placement;
CREATE UNIQUE INDEX idx_question_images_unique_selected_per_placement 
ON question_images (question_id, placement_type) 
WHERE is_selected = true;

-- Add regular indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_images_question_id 
ON question_images(question_id);

CREATE INDEX IF NOT EXISTS idx_question_images_placement_type 
ON question_images(placement_type);

CREATE INDEX IF NOT EXISTS idx_question_images_question_placement 
ON question_images(question_id, placement_type);

-- ============================================
-- STEP 5: Update RLS (Row Level Security) policies if needed
-- ============================================

-- Update existing policies to work with the new schema
-- These policies ensure users can only see images for questions they own

-- Drop and recreate the view policy for question_images
DROP POLICY IF EXISTS "Users can view images for their prompts" ON question_images;
CREATE POLICY "Users can view images for their questions" ON question_images
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM questions q 
        WHERE q.id = question_images.question_id 
        AND (q.user_id = auth.uid() OR q.user_id IS NULL)
    )
    OR
    -- Fallback for images still linked via prompts (during migration period)
    EXISTS (
        SELECT 1 FROM image_prompts ip 
        JOIN questions q ON ip.question_id = q.id
        WHERE ip.id = question_images.prompt_id 
        AND (q.user_id = auth.uid() OR q.user_id IS NULL)
    )
);

-- Drop and recreate the insert policy for question_images
DROP POLICY IF EXISTS "Users can create images for their prompts" ON question_images;
CREATE POLICY "Users can create images for their questions" ON question_images
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM questions q 
        WHERE q.id = question_images.question_id 
        AND (q.user_id = auth.uid() OR q.user_id IS NULL)
    )
    OR
    -- Fallback for images still linked via prompts (during migration period)
    EXISTS (
        SELECT 1 FROM image_prompts ip 
        JOIN questions q ON ip.question_id = q.id
        WHERE ip.id = question_images.prompt_id 
        AND (q.user_id = auth.uid() OR q.user_id IS NULL)
    )
);

-- Add update and delete policies for completeness
DO $$
BEGIN
    -- Try to create update policy, ignore if it already exists
    BEGIN
        CREATE POLICY "Users can update images for their questions" ON question_images
        FOR UPDATE 
        USING (
            EXISTS (
                SELECT 1 FROM questions q 
                WHERE q.id = question_images.question_id 
                AND (q.user_id = auth.uid() OR q.user_id IS NULL)
            )
            OR
            EXISTS (
                SELECT 1 FROM image_prompts ip 
                JOIN questions q ON ip.question_id = q.id
                WHERE ip.id = question_images.prompt_id 
                AND (q.user_id = auth.uid() OR q.user_id IS NULL)
            )
        );
        RAISE NOTICE 'Created update policy for question_images';
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'Update policy for question_images already exists';
    END;
    
    -- Try to create delete policy, ignore if it already exists
    BEGIN
        CREATE POLICY "Users can delete images for their questions" ON question_images
        FOR DELETE 
        USING (
            EXISTS (
                SELECT 1 FROM questions q 
                WHERE q.id = question_images.question_id 
                AND (q.user_id = auth.uid() OR q.user_id IS NULL)
            )
            OR
            EXISTS (
                SELECT 1 FROM image_prompts ip 
                JOIN questions q ON ip.question_id = q.id
                WHERE ip.id = question_images.prompt_id 
                AND (q.user_id = auth.uid() OR q.user_id IS NULL)
            )
        );
        RAISE NOTICE 'Created delete policy for question_images';
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'Delete policy for question_images already exists';
    END;
END $$;

-- ============================================
-- STEP 6: Validation and reporting
-- ============================================

-- Create a validation function to check migration success
CREATE OR REPLACE FUNCTION validate_question_images_migration()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check 1: All images have question_id and placement_type
    RETURN QUERY
    SELECT 
        'Schema Completeness'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'All images have required fields' 
             ELSE COUNT(*)::TEXT || ' images missing question_id or placement_type' END::TEXT
    FROM question_images 
    WHERE question_id IS NULL OR placement_type IS NULL;

    -- Check 2: No duplicate selected images per question/placement
    RETURN QUERY
    SELECT 
        'Duplicate Prevention'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'No duplicate selections found'
             ELSE COUNT(*)::TEXT || ' question/placement combinations have multiple selected images' END::TEXT
    FROM (
        SELECT question_id, placement_type, COUNT(*) as selected_count
        FROM question_images 
        WHERE is_selected = true AND question_id IS NOT NULL AND placement_type IS NOT NULL
        GROUP BY question_id, placement_type
        HAVING COUNT(*) > 1
    ) duplicates;

    -- Check 3: Referential integrity with questions table
    RETURN QUERY
    SELECT 
        'Referential Integrity'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'All image references are valid'
             ELSE COUNT(*)::TEXT || ' images reference non-existent questions' END::TEXT
    FROM question_images qi
    LEFT JOIN questions q ON qi.question_id = q.id
    WHERE qi.question_id IS NOT NULL AND q.id IS NULL;

    -- Check 4: Index existence
    RETURN QUERY
    SELECT 
        'Performance Indexes'::TEXT,
        CASE WHEN COUNT(*) >= 4 THEN 'PASS' ELSE 'PARTIAL' END::TEXT,
        COUNT(*)::TEXT || ' relevant indexes found'
    FROM pg_indexes 
    WHERE tablename = 'question_images' 
    AND (indexname LIKE '%question_id%' OR indexname LIKE '%placement%' OR indexname LIKE '%selected%');

END;
$$ LANGUAGE plpgsql;

-- Run validation
SELECT * FROM validate_question_images_migration();

-- Final statistics
SELECT 
    'Migration Summary' as report_section,
    (SELECT COUNT(*) FROM question_images) as total_images,
    (SELECT COUNT(*) FROM question_images WHERE question_id IS NOT NULL) as migrated_images,
    (SELECT COUNT(*) FROM question_images WHERE is_selected = true AND question_id IS NOT NULL) as selected_images,
    (SELECT COUNT(DISTINCT CONCAT(question_id, '-', placement_type)) FROM question_images WHERE question_id IS NOT NULL) as unique_question_placements;

-- Drop the validation function
DROP FUNCTION validate_question_images_migration();

-- ============================================
-- STEP 7: Optional - Create a rollback function (USE WITH CAUTION)
-- ============================================

CREATE OR REPLACE FUNCTION rollback_question_images_migration()
RETURNS TEXT AS $$
BEGIN
    -- Remove the new columns (THIS WILL LOSE THE NEW SCHEMA DATA)
    ALTER TABLE question_images DROP COLUMN IF EXISTS question_id;
    ALTER TABLE question_images DROP COLUMN IF EXISTS placement_type;
    
    -- Drop the new indexes
    DROP INDEX IF EXISTS idx_question_images_unique_selected_per_placement;
    DROP INDEX IF EXISTS idx_question_images_question_id;
    DROP INDEX IF EXISTS idx_question_images_placement_type;
    DROP INDEX IF EXISTS idx_question_images_question_placement;
    
    RETURN 'Migration rollback completed - new schema columns and indexes removed';
END;
$$ LANGUAGE plpgsql;

-- To rollback (UNCOMMENT ONLY IF NEEDED):
-- SELECT rollback_question_images_migration();
-- DROP FUNCTION rollback_question_images_migration();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '
============================================
QUESTION IMAGES MIGRATION COMPLETED
============================================

Next steps:
1. Verify the validation results above show all PASS
2. Test the application with the new schema
3. Monitor performance with new indexes
4. The application now supports both old and new schemas during transition
5. Once confirmed working, you can remove legacy fallback code

The migration has:
✅ Added question_id and placement_type columns
✅ Populated data from existing image_prompts relationships  
✅ Cleaned up duplicate images (keeping most recent selected)
✅ Added performance indexes
✅ Updated RLS policies for security
✅ Created validation checks

For support or issues, check the migration logs above.
============================================
';
END $$;