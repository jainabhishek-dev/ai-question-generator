# Fix Database Error - AI Prompt Index Issue

**Error:** `index row size 2928 exceeds btree version 4 maximum 2704 for index "idx_questions_ai_prompt"`

## Problem

The btree index created on the `ai_prompt` column cannot handle prompts larger than 2704 bytes. Your AI prompts are typically 2000-4000 bytes, which exceeds this PostgreSQL limit.

## Solution

Remove the problematic index. The `ai_prompt` column doesn't need to be indexed since:
- It's used for record-keeping and traceability, not for querying
- No WHERE clauses filter by this column
- Indexing provides no performance benefit

## Steps to Fix

### 1. Execute the Removal SQL

Open your Supabase SQL Editor and run the contents of `REMOVE_AI_PROMPT_INDEX.sql`:

```sql
-- Drop the problematic index
DROP INDEX IF EXISTS public.idx_questions_ai_prompt;

-- Update comment
COMMENT ON COLUMN public.questions.ai_prompt IS 'The full AI prompt used to generate this question. When multiple questions are generated in one batch, all questions share the same prompt value. Not indexed due to large text size (prompts often exceed btree limit of 2704 bytes).';
```

### 2. Verify the Fix

After running the SQL, check that the index is removed:

```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'questions' 
AND indexname LIKE '%ai_prompt%';
```

**Expected result:** 0 rows (index is gone)

### 3. Test Question Creation

1. Go to Create Questions page
2. Generate a question with a complex prompt (multiple question types, detailed subject)
3. Verify it saves successfully
4. Check the database to confirm `ai_prompt` is populated:

```sql
SELECT 
  id, 
  LEFT(question, 50) as question_preview,
  LENGTH(ai_prompt) as prompt_length,
  created_at
FROM questions 
WHERE ai_prompt IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;
```

## What Changed

### Before (Causing Error)
```sql
CREATE INDEX idx_questions_ai_prompt ON questions USING btree (ai_prompt);
-- ❌ Fails when prompt > 2704 bytes
```

### After (Fixed)
```sql
-- No index on ai_prompt column
-- ✅ Saves successfully with prompts of any size
```

## Files Updated

1. **REMOVE_AI_PROMPT_INDEX.sql** (NEW) - SQL to drop the index
2. **ADD_AI_PROMPT_COLUMN.sql** (UPDATED) - Removed index creation, added documentation

## Why This Works

- The `ai_prompt` column stores data successfully (TEXT type has no size limit)
- The problem was only with the INDEX, not the column itself
- Removing the index allows inserts to succeed
- No performance impact since we don't query by this column

## Future Considerations

If you ever need to search/filter by prompt content, use:

1. **MD5 Hash Index:** Index a hash instead of the full text
   ```sql
   CREATE INDEX idx_questions_ai_prompt_md5 ON questions (MD5(ai_prompt));
   ```

2. **Full-Text Search:** Use GIN index for text search
   ```sql
   CREATE INDEX idx_questions_ai_prompt_gin 
   ON questions USING gin(to_tsvector('english', ai_prompt));
   ```

But for now, no index is the correct solution.

## Expected Outcome

After executing the removal SQL:
- ✅ Questions save successfully
- ✅ AI prompts are stored in database
- ✅ No database errors
- ✅ All functionality works as expected
