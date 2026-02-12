# AI Prompt Saving Implementation Summary

**Date:** February 9, 2026  
**Feature:** Save AI prompts used to generate questions in the database

## Overview

This implementation adds the ability to save the complete AI prompt used to generate each question in the database. When multiple questions are generated in a single batch, all questions receive the same prompt. This feature works for both authenticated and unauthenticated users.

## Naming Conventions

The prompt is referenced with different names across different layers following standard conventions:

| Layer | Name | Convention | Example |
|-------|------|------------|---------|
| **Database Column** | `ai_prompt` | snake_case | `questions.ai_prompt TEXT NULL` |
| **TypeScript Interface** | `ai_prompt` | snake_case | `ai_prompt?: string \| null` |
| **Function Parameter** | `aiPrompt` | camelCase | `saveQuestions(..., aiPrompt: string, ...)` |
| **Local Variable** | `prompt` | camelCase | `const prompt = createAdvancedPrompt(inputs)` |
| **Object Property** | `prompt` | camelCase | `return { text, prompt }` |

**Why Different Names?**
- SQL uses `snake_case` (PostgreSQL convention)
- TypeScript interfaces match database column names (Supabase convention)
- JavaScript/TypeScript code uses `camelCase` (JavaScript convention)

## Changes Made

### 1. Database Schema (`ADD_AI_PROMPT_COLUMN.sql`)

**New file** - SQL migration script to add the `ai_prompt` column:

```sql
-- Add the ai_prompt column (TEXT allows unlimited length, NULL for existing records)
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS ai_prompt TEXT NULL;

-- Create index for efficient filtering/searching by prompt content
CREATE INDEX IF NOT EXISTS idx_questions_ai_prompt 
ON public.questions USING btree (ai_prompt);
```

**Important:** You need to execute this SQL in your Supabase database before using the feature.

### 2. TypeScript Interfaces (`src/lib/database.ts`)

#### Updated `QuestionRecord` Interface (Line 5-32)

Added new field:
```typescript
ai_prompt?: string | null  // NEW: Store the AI prompt used to generate this question
```

#### Updated `saveQuestions` Function Signature (Line 94-98)

Added `aiPrompt` parameter:
```typescript
export const saveQuestions = async (
  inputs: Inputs, 
  generatedQuestions: GeneratedQuestion[],
  userId?: string | null,
  aiPrompt?: string  // NEW: Optional AI prompt to save with questions
): Promise<{ success: boolean; data?: QuestionRecord[]; error?: string }>
```

#### Updated Database Insert Logic (Line 113-136)

Added prompt to each question record:
```typescript
return {
  // ... other fields ...
  ai_prompt: aiPrompt || null  // NEW: Save AI prompt used for generation
};
```

### 3. AI Generation Functions (`src/lib/gemini.ts`)

#### New Interface (Line 7-10)

```typescript
export interface GenerationResult {
  text: string
  prompt: string
}
```

#### Updated `generateQuestions` Function (Line 292-315)

Changed return type and value:
```typescript
export const generateQuestions = async (
  inputs: Inputs, 
  pdfFileUri?: string
): Promise<GenerationResult> => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  const prompt = createAdvancedPrompt(inputs)
  
  // ... AI call logic ...
  
  return { text, prompt }  // NEW: Return both text and prompt
}
```

#### Updated `generateNCERTQuestions` Function (Line 317-341)

Same pattern as `generateQuestions`:
```typescript
export const generateNCERTQuestions = async (
  inputs: Inputs, 
  pdfFileUri?: string
): Promise<GenerationResult> => {
  // ... similar implementation ...
  return { text, prompt }  // NEW: Return both text and prompt
}
```

### 4. UI Handler Functions (`src/app/create-questions/page.tsx`)

#### Updated `handleGenerate` Function (Line 114-174)

Changed to use new return structure:
```typescript
// OLD:
const text = await generateQuestions(inputs, inputs.pdfFileUri);
const saveResult = await saveQuestions(inputs, processedQuestions, user?.id || null);

// NEW:
const result = await generateQuestions(inputs, inputs.pdfFileUri);
setOutput(result.text);
const parsedQuestions = parseQuestions(result.text);
const saveResult = await saveQuestions(inputs, processedQuestions, user?.id || null, result.prompt);
```

#### Updated `handleGenerateNCERT` Function (Line 176-236)

Same pattern as `handleGenerate`:
```typescript
// NEW:
const result = await generateNCERTQuestions(inputs, inputs.pdfFileUri);
setOutput(result.text);
const saveResult = await saveQuestions(inputs, processedQuestions, user?.id || null, result.prompt);
```

## Data Flow

```
1. User submits form
   ↓
2. createAdvancedPrompt(inputs) → generates prompt string
   ↓
3. generateQuestions(inputs) → calls AI
   ↓
4. return { text: aiResponse, prompt: promptUsed }
   ↓
5. result.text → parseQuestions → processQuestions
   ↓
6. saveQuestions(inputs, questions, userId, result.prompt)
   ↓
7. Database: ai_prompt column saved for each question
```

## User Type Handling

### Authenticated Users
```typescript
{
  user_id: "actual-user-uuid",
  is_public: false,
  ai_prompt: "You are an expert assessment designer..."
}
```

### Unauthenticated Users
```typescript
{
  user_id: null,
  is_public: true,
  ai_prompt: "You are an expert assessment designer..."
}
```

**Both user types receive the same prompt-saving functionality.**

## Batch Question Handling

When generating multiple questions in a single request (e.g., 5 MCQs + 3 Fill-in-the-blank):
- **One prompt** is created based on user inputs
- **One AI call** is made with that prompt
- **All questions** receive the same prompt value in the database

Example:
```typescript
// User generates 5 questions
const result = await generateQuestions(inputs);  // 1 prompt created
const questions = parseQuestions(result.text);   // 5 questions parsed
await saveQuestions(inputs, questions, userId, result.prompt);
// All 5 questions get the same prompt in database
```

## Testing

### Test File Created
`src/lib/__tests__/ai-prompt-generation.test.ts`

### Test Coverage
✅ GenerationResult structure validation  
✅ Question parsing and processing  
✅ Prompt flow to database structure  
✅ Batch questions share same prompt  
✅ Authenticated user data structure  
✅ Unauthenticated user data structure  
✅ Prompt content validation  
✅ Empty/null prompt handling  
✅ End-to-end data flow simulation  

**All 9 tests passed successfully.**

## Build Verification

```bash
npm run build
# ✓ Compiled successfully
# ✓ No TypeScript errors
# ✓ No linting errors (only pre-existing warnings)
```

## Migration Steps

### To Deploy This Feature:

1. **Execute SQL Migration:**
   
   ⚠️ **IMPORTANT:** Do NOT create an index on `ai_prompt` column!
   
   Run this SQL in your Supabase SQL editor:
   ```sql
   -- Add the column
   ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS ai_prompt TEXT NULL;
   
   -- Add comment (NO INDEX - prompts exceed btree size limit)
   COMMENT ON COLUMN public.questions.ai_prompt IS 'The complete AI prompt used to generate this question. When multiple questions are generated in one batch, all questions share the same prompt value. Not indexed due to large text size.';
   ```

2. **If You Already Created the Index (causing errors):**
   
   Run `REMOVE_AI_PROMPT_INDEX.sql` to fix the error:
   ```sql
   DROP INDEX IF EXISTS public.idx_questions_ai_prompt;
   ```
   
   See `FIX_DATABASE_ERROR.md` for detailed instructions.

3. **Deploy Code:**
   ```bash
   npm run build
   # Deploy to production
   ```

4. **Verify:**
   - Generate a new question through the UI
   - Check database: `SELECT id, question, LENGTH(ai_prompt) FROM questions ORDER BY created_at DESC LIMIT 1;`
   - Confirm `ai_prompt` column is populated

## Backward Compatibility

- **Existing questions:** `ai_prompt` will be `NULL` (column is nullable)
- **New questions:** `ai_prompt` will contain the full prompt text
- **No breaking changes:** All existing functionality continues to work

## Performance Considerations

- **Column Type:** `TEXT` allows unlimited prompt length
- **Index:** Created `btree` index on `ai_prompt` for efficient searching
- **Storage:** Prompts are typically 1-10KB each, minimal storage impact

## Future Enhancements

Possible future improvements:
- Filter questions by prompt similarity
- Analyze prompt effectiveness vs. question quality
- Reuse successful prompts for similar question generation
- Prompt version tracking and A/B testing

## Files Modified

| File | Changes |
|------|---------|
| `ADD_AI_PROMPT_COLUMN.sql` | **NEW** - Database migration |
| `src/lib/database.ts` | Added `ai_prompt` field, updated `saveQuestions` |
| `src/lib/gemini.ts` | Added `GenerationResult` interface, updated both generation functions |
| `src/app/create-questions/page.tsx` | Updated `handleGenerate` and `handleGenerateNCERT` |
| `src/lib/__tests__/ai-prompt-generation.test.ts` | **NEW** - Comprehensive test suite |

## Summary

✅ **SQL migration** created for database schema  
✅ **TypeScript interfaces** updated for type safety  
✅ **Generation functions** now return both text and prompt  
✅ **Save function** accepts and stores prompt  
✅ **UI handlers** pass prompt through the flow  
✅ **Tests** verify all functionality  
✅ **Build** succeeds with no errors  
✅ **Naming conventions** follow best practices  
✅ **Works for both** authenticated and unauthenticated users  

The feature is production-ready pending SQL migration execution.

---

## Issue Resolution: Database Index Error

### Problem Encountered

After initial deployment, a database error occurred:
```
index row size 2928 exceeds btree version 4 maximum 2704 for index "idx_questions_ai_prompt"
```

**Root Cause:** The btree index on `ai_prompt` column cannot handle values larger than 2704 bytes. AI prompts are typically 2000-4000 bytes, exceeding this PostgreSQL limit.

### Resolution

**Solution:** Remove the index. The `ai_prompt` column doesn't need indexing since it's only used for record-keeping, not for querying.

**Files Created:**
- `REMOVE_AI_PROMPT_INDEX.sql` - SQL to drop the problematic index
- `FIX_DATABASE_ERROR.md` - Detailed fix instructions

**Action Required:**
Execute the removal SQL in Supabase:
```sql
DROP INDEX IF EXISTS public.idx_questions_ai_prompt;
```

**Impact:** Questions now save successfully with prompts of any size. No performance impact since the column isn't queried.

See `FIX_DATABASE_ERROR.md` for complete instructions.
