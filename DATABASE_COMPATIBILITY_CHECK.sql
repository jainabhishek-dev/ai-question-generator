-- ============================================
-- COMPATIBILITY CHECK & MIGRATION SCRIPT
-- For existing AI Question Generator databases
-- ============================================

-- Check existing questions table structure
DO $$
DECLARE
    table_exists boolean;
    column_exists boolean;
BEGIN
    -- Check if questions table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'questions'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Questions table exists ✓';
        
        -- Check for required columns
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'questions' AND column_name = 'id'
        ) INTO column_exists;
        
        IF column_exists THEN
            RAISE NOTICE 'Questions.id column exists ✓';
        ELSE
            RAISE WARNING 'Questions.id column missing - may need to modify foreign key constraints';
        END IF;
        
        -- Check user_id column
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'questions' AND column_name = 'user_id'
        ) INTO column_exists;
        
        IF column_exists THEN
            RAISE NOTICE 'Questions.user_id column exists ✓';
        ELSE
            RAISE WARNING 'Questions.user_id column missing - RLS policies may need adjustment';
        END IF;
        
    ELSE
        RAISE EXCEPTION 'Questions table does not exist! Please create it first.';
    END IF;
END $$;

-- ============================================
-- SAFE COLUMN ADDITIONS
-- (Only adds if columns don't exist)
-- ============================================

-- Add image support columns to questions table
DO $$ 
BEGIN
    -- Add has_images column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'has_images'
    ) THEN
        ALTER TABLE questions ADD COLUMN has_images BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added has_images column to questions table';
    ELSE
        RAISE NOTICE 'has_images column already exists in questions table';
    END IF;
    
    -- Add image_count column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'image_count'
    ) THEN
        ALTER TABLE questions ADD COLUMN image_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added image_count column to questions table';
    ELSE
        RAISE NOTICE 'image_count column already exists in questions table';
    END IF;
    
    -- Add last_image_generated column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'last_image_generated'
    ) THEN
        ALTER TABLE questions ADD COLUMN last_image_generated TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_image_generated column to questions table';
    ELSE
        RAISE NOTICE 'last_image_generated column already exists in questions table';
    END IF;
END $$;

-- ============================================
-- DATA TYPE COMPATIBILITY CHECKS
-- ============================================

-- Check questions.id data type for foreign key compatibility
DO $$
DECLARE
    id_data_type text;
BEGIN
    SELECT data_type INTO id_data_type
    FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'id';
    
    RAISE NOTICE 'Questions.id data type: %', id_data_type;
    
    IF id_data_type IN ('bigint', 'integer', 'int8', 'int4') THEN
        RAISE NOTICE 'Compatible numeric ID type ✓';
    ELSIF id_data_type = 'uuid' THEN
        RAISE WARNING 'UUID ID detected - you may need to change image_prompts.question_id to UUID type';
    ELSE
        RAISE WARNING 'Unexpected ID type: % - may need schema adjustments', id_data_type;
    END IF;
END $$;

-- ============================================
-- MIGRATION FOR EXISTING DATA
-- ============================================

-- Update existing questions to set default image values
UPDATE questions 
SET 
    has_images = FALSE,
    image_count = 0
WHERE has_images IS NULL;

-- Show migration summary
DO $$
DECLARE
    total_questions integer;
    questions_with_images integer;
BEGIN
    SELECT COUNT(*) INTO total_questions FROM questions;
    SELECT COUNT(*) INTO questions_with_images FROM questions WHERE has_images = TRUE;
    
    RAISE NOTICE '=== MIGRATION SUMMARY ===';
    RAISE NOTICE 'Total questions: %', total_questions;
    RAISE NOTICE 'Questions with images: %', questions_with_images;
    RAISE NOTICE 'Questions ready for image support: %', total_questions;
END $$;

-- ============================================
-- FOREIGN KEY CONSTRAINT ADJUSTMENT
-- (If your questions.id is UUID instead of BIGINT)
-- ============================================

-- Uncomment this section if your questions table uses UUID for id:
/*
DO $$
DECLARE
    id_data_type text;
BEGIN
    SELECT data_type INTO id_data_type
    FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'id';
    
    IF id_data_type = 'uuid' THEN
        RAISE NOTICE 'Adjusting image_prompts.question_id to UUID type';
        
        -- Drop the table if it exists and recreate with UUID
        DROP TABLE IF EXISTS question_images CASCADE;
        DROP TABLE IF EXISTS image_prompts CASCADE;
        
        -- Recreate with UUID foreign key
        CREATE TABLE image_prompts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            question_id UUID NOT NULL, -- Changed to UUID
            prompt_text TEXT NOT NULL,
            original_ai_prompt TEXT NOT NULL,
            placement TEXT NOT NULL CHECK (placement IN (
                'question', 'option_a', 'option_b', 'option_c', 'option_d', 'explanation', 'before_question'
            )),
            style_preference TEXT NOT NULL DEFAULT 'educational_diagram' CHECK (style_preference IN (
                'scientific_diagram', 'mathematical_chart', 'simple_illustration',
                'technical_drawing', 'infographic', 'educational_diagram', 'textbook_illustration'
            )),
            subject_context TEXT,
            accuracy_requirements TEXT[],
            is_generated BOOLEAN DEFAULT FALSE,
            user_satisfied BOOLEAN,
            question_deleted_at TIMESTAMP WITH TIME ZONE,
            is_orphaned BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT fk_image_prompts_question FOREIGN KEY (question_id) 
                REFERENCES questions(id) ON DELETE SET NULL
        );
        
        -- Recreate question_images table
        CREATE TABLE question_images (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            prompt_id UUID NOT NULL,
            image_url TEXT NOT NULL,
            prompt_used TEXT NOT NULL,
            attempt_number INTEGER NOT NULL DEFAULT 1,
            user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
            accuracy_feedback TEXT CHECK (accuracy_feedback IN ('correct', 'partially_correct', 'incorrect')),
            alt_text TEXT,
            file_size_bytes BIGINT,
            image_width INTEGER,
            image_height INTEGER,
            is_selected BOOLEAN DEFAULT FALSE,
            user_id UUID,
            generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT fk_question_images_prompt FOREIGN KEY (prompt_id) 
                REFERENCES image_prompts(id) ON DELETE CASCADE
        );
        
        RAISE NOTICE 'Tables recreated with UUID foreign keys';
    END IF;
END $$;
*/