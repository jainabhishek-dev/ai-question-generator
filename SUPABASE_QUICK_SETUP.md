# 🚀 Supabase Setup Guide for Image Generation

## Quick Setup Steps

### 1. Database Tables (SQL Editor)

Copy and paste this SQL into Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create image_prompts table
CREATE TABLE image_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id BIGINT NOT NULL,
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

-- Create question_images table
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

-- Add columns to existing questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS has_images BOOLEAN DEFAULT FALSE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_count INTEGER DEFAULT 0;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS last_image_generated TIMESTAMP WITH TIME ZONE;
```

### 2. Create Indexes (SQL Editor)

```sql
-- Performance indexes
CREATE INDEX idx_image_prompts_question_id ON image_prompts(question_id);
CREATE INDEX idx_image_prompts_is_generated ON image_prompts(is_generated);
CREATE INDEX idx_question_images_prompt_id ON question_images(prompt_id);
CREATE INDEX idx_question_images_is_selected ON question_images(is_selected);
CREATE INDEX idx_question_images_prompt_selected ON question_images(prompt_id, is_selected);
```

### 3. Enable Row Level Security (SQL Editor)

```sql
-- Enable RLS
ALTER TABLE image_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_images ENABLE ROW LEVEL SECURITY;

-- Image prompts policies
CREATE POLICY "Users can manage image prompts for their questions" ON image_prompts
    USING (question_id IN (SELECT id FROM questions WHERE user_id = auth.uid()));

-- Question images policies  
CREATE POLICY "Users can manage images for their prompts" ON question_images
    USING (prompt_id IN (
        SELECT ip.id FROM image_prompts ip
        JOIN questions q ON ip.question_id = q.id
        WHERE q.user_id = auth.uid()
    ));
```

### 4. Create Storage Bucket (Storage Section)

**In Supabase Dashboard → Storage:**

1. Click "Create Bucket"
2. Name: `images`
3. Set as Public: ✅ **YES**
4. File size limit: `10 MB`
5. Allowed MIME types: `image/jpeg, image/png, image/webp`

### 5. Storage Policies (SQL Editor)

```sql
-- Storage bucket policies
CREATE POLICY "Authenticated users can upload images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Public can view images" ON storage.objects
    FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "Users can delete their own images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
```

### 6. Helper Functions (SQL Editor)

```sql
-- Function to ensure only one selected image per prompt
CREATE OR REPLACE FUNCTION ensure_single_selected_image()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_selected = TRUE THEN
        UPDATE question_images 
        SET is_selected = FALSE 
        WHERE prompt_id = NEW.prompt_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_ensure_single_selected_image
    BEFORE INSERT OR UPDATE ON question_images
    FOR EACH ROW
    WHEN (NEW.is_selected = TRUE)
    EXECUTE FUNCTION ensure_single_selected_image();
```

## 🔧 Environment Variables

Add these to your `.env.local`:

```bash
# Google AI (for Imagen 4.0)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Supabase (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## ✅ Verification Steps

1. **Test Database Connection:**
   - Go to Supabase Table Editor
   - Verify `image_prompts` and `question_images` tables exist
   - Check `questions` table has new columns: `has_images`, `image_count`, `last_image_generated`

2. **Test Storage:**
   - Go to Storage → images bucket
   - Try uploading a test image
   - Verify public URL works

3. **Test RLS:**
   - Create a test image prompt via your app
   - Verify it appears in the database
   - Check only your user can see it

## 🚨 Important Notes

- **Google AI API Key:** You need to enable Imagen API in Google AI Studio
- **Cost Management:** Set up billing alerts in Google Cloud Console
- **Storage Limits:** Monitor storage usage in Supabase dashboard
- **RLS Testing:** Always test with different users to ensure security

## 🔄 Migration for Existing Data

If you have existing questions and want to add image support:

```sql
-- Mark existing questions as non-image questions
UPDATE questions SET has_images = FALSE, image_count = 0 WHERE has_images IS NULL;
```

The system is now ready for educational image generation! 🎨