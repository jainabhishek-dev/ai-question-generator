-- ============================================
-- SUPABASE DATABASE SCHEMA FOR IMAGE GENERATION
-- AI Question Generator - Educational Image Support
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. IMAGE PROMPTS TABLE
-- Stores AI-generated prompts for educational images
-- ============================================

CREATE TABLE IF NOT EXISTS image_prompts (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign key to questions table
    question_id BIGINT NOT NULL,
    
    -- Prompt content
    prompt_text TEXT NOT NULL,
    original_ai_prompt TEXT NOT NULL, -- Original prompt from Gemini before enhancement
    
    -- Image placement and styling
    placement TEXT NOT NULL CHECK (placement IN (
        'question', 
        'option_a', 
        'option_b', 
        'option_c', 
        'option_d', 
        'explanation', 
        'before_question'
    )),
    
    style_preference TEXT NOT NULL DEFAULT 'educational_diagram' CHECK (style_preference IN (
        'scientific_diagram',
        'mathematical_chart',
        'simple_illustration',
        'technical_drawing',
        'infographic',
        'educational_diagram',
        'textbook_illustration'
    )),
    
    -- Educational context
    subject_context TEXT, -- Subject-specific context for accuracy
    accuracy_requirements TEXT[], -- Array of accuracy requirements
    
    -- Generation status
    is_generated BOOLEAN DEFAULT FALSE,
    user_satisfied BOOLEAN, -- User feedback on prompt quality
    
    -- Relationship status
    question_deleted_at TIMESTAMP WITH TIME ZONE, -- Track if parent question is deleted
    is_orphaned BOOLEAN DEFAULT FALSE, -- Mark orphaned prompts for cleanup
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint (assuming questions table exists)
    CONSTRAINT fk_image_prompts_question FOREIGN KEY (question_id) 
        REFERENCES questions(id) ON DELETE SET NULL
);

-- ============================================
-- 2. QUESTION IMAGES TABLE  
-- Stores generated images and their metadata
-- ============================================

CREATE TABLE IF NOT EXISTS question_images (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign key to image_prompts
    prompt_id UUID NOT NULL,
    
    -- Image storage
    image_url TEXT NOT NULL, -- Supabase Storage public URL
    prompt_used TEXT NOT NULL, -- Actual prompt sent to Imagen API
    
    -- Generation metadata
    attempt_number INTEGER NOT NULL DEFAULT 1,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    accuracy_feedback TEXT CHECK (accuracy_feedback IN ('correct', 'partially_correct', 'incorrect')),
    
    -- Image metadata
    alt_text TEXT,
    file_size_bytes BIGINT,
    image_width INTEGER,
    image_height INTEGER,
    
    -- Selection status
    is_selected BOOLEAN DEFAULT FALSE, -- Which image is currently selected for this prompt
    
    -- User tracking
    user_id UUID, -- Track who generated this image
    
    -- Timestamps
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_question_images_prompt FOREIGN KEY (prompt_id) 
        REFERENCES image_prompts(id) ON DELETE CASCADE,
    
    -- Ensure only one selected image per prompt
    CONSTRAINT unique_selected_per_prompt UNIQUE NULLS NOT DISTINCT (prompt_id, is_selected) 
        DEFERRABLE INITIALLY DEFERRED
);

-- ============================================
-- 3. ADD IMAGE SUPPORT TO EXISTING QUESTIONS TABLE
-- Add columns to track image-enhanced questions
-- ============================================

-- Check if columns already exist before adding them
DO $$ 
BEGIN
    -- Add has_images column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'has_images'
    ) THEN
        ALTER TABLE questions ADD COLUMN has_images BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add image_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'image_count'
    ) THEN
        ALTER TABLE questions ADD COLUMN image_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add last_image_generated column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'last_image_generated'
    ) THEN
        ALTER TABLE questions ADD COLUMN last_image_generated TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================

-- Image prompts indexes
CREATE INDEX IF NOT EXISTS idx_image_prompts_question_id ON image_prompts(question_id);
CREATE INDEX IF NOT EXISTS idx_image_prompts_created_at ON image_prompts(created_at);
CREATE INDEX IF NOT EXISTS idx_image_prompts_placement ON image_prompts(placement);
CREATE INDEX IF NOT EXISTS idx_image_prompts_is_generated ON image_prompts(is_generated);
CREATE INDEX IF NOT EXISTS idx_image_prompts_is_orphaned ON image_prompts(is_orphaned);

-- Question images indexes
CREATE INDEX IF NOT EXISTS idx_question_images_prompt_id ON question_images(prompt_id);
CREATE INDEX IF NOT EXISTS idx_question_images_user_id ON question_images(user_id);
CREATE INDEX IF NOT EXISTS idx_question_images_generated_at ON question_images(generated_at);
CREATE INDEX IF NOT EXISTS idx_question_images_is_selected ON question_images(is_selected);
CREATE INDEX IF NOT EXISTS idx_question_images_user_rating ON question_images(user_rating);
CREATE INDEX IF NOT EXISTS idx_question_images_attempt_number ON question_images(attempt_number);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_question_images_prompt_selected ON question_images(prompt_id, is_selected);
CREATE INDEX IF NOT EXISTS idx_question_images_prompt_rating ON question_images(prompt_id, user_rating);

-- Questions table indexes for image support
CREATE INDEX IF NOT EXISTS idx_questions_has_images ON questions(has_images);
CREATE INDEX IF NOT EXISTS idx_questions_image_count ON questions(image_count);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE image_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_images ENABLE ROW LEVEL SECURITY;

-- Image Prompts Policies
CREATE POLICY "Users can view image prompts for their questions" ON image_prompts
    FOR SELECT USING (
        question_id IN (
            SELECT id FROM questions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create image prompts for their questions" ON image_prompts
    FOR INSERT WITH CHECK (
        question_id IN (
            SELECT id FROM questions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update image prompts for their questions" ON image_prompts
    FOR UPDATE USING (
        question_id IN (
            SELECT id FROM questions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete image prompts for their questions" ON image_prompts
    FOR DELETE USING (
        question_id IN (
            SELECT id FROM questions WHERE user_id = auth.uid()
        )
    );

-- Question Images Policies
CREATE POLICY "Users can view images for their prompts" ON question_images
    FOR SELECT USING (
        prompt_id IN (
            SELECT ip.id FROM image_prompts ip
            JOIN questions q ON ip.question_id = q.id
            WHERE q.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create images for their prompts" ON question_images
    FOR INSERT WITH CHECK (
        prompt_id IN (
            SELECT ip.id FROM image_prompts ip
            JOIN questions q ON ip.question_id = q.id
            WHERE q.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update images for their prompts" ON question_images
    FOR UPDATE USING (
        prompt_id IN (
            SELECT ip.id FROM image_prompts ip
            JOIN questions q ON ip.question_id = q.id
            WHERE q.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete images for their prompts" ON question_images
    FOR DELETE USING (
        prompt_id IN (
            SELECT ip.id FROM image_prompts ip
            JOIN questions q ON ip.question_id = q.id
            WHERE q.user_id = auth.uid()
        )
    );

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to update question image count
CREATE OR REPLACE FUNCTION update_question_image_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE questions 
        SET 
            image_count = (
                SELECT COUNT(*) FROM image_prompts 
                WHERE question_id = NEW.question_id
            ),
            has_images = TRUE,
            last_image_generated = NOW()
        WHERE id = NEW.question_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE questions 
        SET 
            image_count = (
                SELECT COUNT(*) FROM image_prompts 
                WHERE question_id = OLD.question_id
            )
        WHERE id = OLD.question_id;
        
        -- Update has_images flag
        UPDATE questions 
        SET has_images = (image_count > 0)
        WHERE id = OLD.question_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure only one selected image per prompt
CREATE OR REPLACE FUNCTION ensure_single_selected_image()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_selected = TRUE THEN
        -- Deselect all other images for this prompt
        UPDATE question_images 
        SET is_selected = FALSE 
        WHERE prompt_id = NEW.prompt_id AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Trigger to update question image count
CREATE TRIGGER trigger_update_question_image_count
    AFTER INSERT OR DELETE ON image_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_question_image_count();

-- Trigger to ensure single selected image
CREATE TRIGGER trigger_ensure_single_selected_image
    BEFORE INSERT OR UPDATE ON question_images
    FOR EACH ROW
    WHEN (NEW.is_selected = TRUE)
    EXECUTE FUNCTION ensure_single_selected_image();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE TRIGGER trigger_update_image_prompts_timestamp
    BEFORE UPDATE ON image_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 8. SUPABASE STORAGE SETUP
-- ============================================

-- Create storage bucket for images (run this in Supabase dashboard or via API)
-- Note: This needs to be run in the Supabase dashboard Storage section

/*
CREATE STORAGE BUCKET 'images' WITH (
    public = true,
    file_size_limit = 10485760, -- 10MB limit
    allowed_mime_types = '{image/jpeg,image/png,image/webp}'
);
*/

-- Storage RLS Policies (for bucket 'images')
/*
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'images' 
        AND auth.role() = 'authenticated'
    );

-- Allow public read access to images
CREATE POLICY "Public can view images" ON storage.objects
    FOR SELECT USING (bucket_id = 'images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
*/

-- ============================================
-- 9. SAMPLE DATA (OPTIONAL)
-- ============================================

-- Insert sample image prompt for testing (uncomment if needed)
/*
INSERT INTO image_prompts (
    question_id,
    prompt_text,
    original_ai_prompt,
    placement,
    style_preference,
    subject_context,
    accuracy_requirements
) VALUES (
    1, -- Replace with actual question ID
    'Simple diagram showing the water cycle with labeled stages including evaporation, condensation, precipitation, and collection',
    'water cycle diagram',
    'question',
    'educational_diagram',
    'Environmental Science - Grade 6',
    ARRAY['accurate scientific labels', 'clear process arrows', 'age-appropriate complexity']
);
*/

-- ============================================
-- 10. CLEANUP AND MAINTENANCE QUERIES
-- ============================================

-- Clean up orphaned image prompts (run periodically)
-- DELETE FROM image_prompts WHERE is_orphaned = TRUE AND created_at < NOW() - INTERVAL '30 days';

-- Clean up unselected old images (run periodically)  
-- DELETE FROM question_images WHERE is_selected = FALSE AND generated_at < NOW() - INTERVAL '90 days';

-- Update orphaned status for prompts with deleted questions
-- UPDATE image_prompts SET is_orphaned = TRUE WHERE question_deleted_at IS NOT NULL;

COMMENT ON TABLE image_prompts IS 'Stores AI-generated prompts for educational images with placement and style information';
COMMENT ON TABLE question_images IS 'Stores generated educational images with metadata, ratings, and selection status';
COMMENT ON FUNCTION update_question_image_count() IS 'Automatically updates image count and flags on questions table';
COMMENT ON FUNCTION ensure_single_selected_image() IS 'Ensures only one image is selected per prompt';

-- ============================================
-- SCRIPT COMPLETE
-- ============================================