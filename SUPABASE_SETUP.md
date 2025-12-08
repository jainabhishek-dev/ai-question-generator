# Supabase Configuration for Image Generation Feature

## Storage Bucket Setup

**When you're ready to test the image generation feature, you'll need to:**

### 1. Create Storage Bucket in Supabase
```sql
-- In Supabase SQL Editor, create the images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);
```

### 2. Set Storage Policies
```sql
-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'images' AND 
    auth.role() = 'authenticated'
  );

-- Allow public read access to images
CREATE POLICY "Allow public downloads" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

-- Allow users to delete their own images
CREATE POLICY "Allow user deletes" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 3. Environment Variables
Add to your `.env.local`:
```
# Google Imagen API (when ready)
GOOGLE_AI_API_KEY=your_api_key_here

# Supabase (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Tables

**These will be created after we finish the implementation:**
- `question_image_prompts` - Stores AI-generated image prompts
- `question_images` - Stores generated image attempts and metadata

## Current Status
✅ TypeScript interfaces defined
✅ Database functions implemented  
✅ Storage utilities ready
⏳ Waiting for table creation (after implementation complete)

## Next Steps
1. Complete AI integration (Gemini + Imagen)
2. Build frontend components
3. Create API routes
4. Test everything
5. Create final database schema