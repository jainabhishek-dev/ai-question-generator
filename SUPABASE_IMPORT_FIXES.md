# Supabase Import Fixes - Complete ✅

## Issue
Live quiz API routes were importing from non-existent modules:
- `@/lib/supabase/server` (doesn't exist)
- `@/lib/supabase/client` (doesn't exist)

This caused "Module not found" errors when trying to create live sessions.

## Solution Applied

Fixed all import paths to follow the existing project patterns:

### API Routes (Server-side)

**Pattern Used:**
- Import `supabaseAdmin` from `@/lib/supabase` for database operations
- Import `createServerClient` from `@supabase/ssr` for authentication
- Use hybrid approach: authenticate with cookies, execute with service role

**Files Fixed:**

1. ✅ `src/app/api/live/sessions/create/route.ts`
   - Fixed imports to use `supabaseAdmin` and `createServerClient` from `@supabase/ssr`
   - Updated helper functions to use `supabaseAdmin`
   - Added service role availability check

2. ✅ `src/app/api/live/sessions/[sessionId]/route.ts`
   - Fixed imports to use `supabaseAdmin` and `createServerClient` from `@supabase/ssr`
   - Updated all database operations to use `supabaseAdmin`
   - Added service role availability checks for all actions (start, answer, next, end)

3. ✅ `src/app/api/live/sessions/validate-pin/route.ts`
   - Changed to use `import { supabase } from '@/lib/supabase'`
   - Read-only operations use regular client

4. ✅ `src/app/api/live/sessions/join/route.ts`
   - Changed to use `import { supabaseAdmin } from '@/lib/supabase'`
   - Anonymous participants need write access, using service role
   - Added service role availability check

### Client-side Pages

**Pattern Used:**
- Import `supabase` directly from `@/lib/supabase`
- Use the singleton browser client instance

**Files Fixed:**

5. ✅ `src/lib/liveQuizService.ts`
   - Changed from `createClient()` to importing `supabase`
   - Removed instance creation, use singleton
   - Fixed all references from `this.supabase` to `supabase`

6. ✅ `src/app/live/host/[sessionId]/lobby/page.tsx`
   - Changed import to `import { supabase } from '@/lib/supabase'`
   - Removed `const supabase = createClient()`

7. ✅ `src/app/live/host/[sessionId]/control/page.tsx`
   - Changed import to `import { supabase } from '@/lib/supabase'`
   - Removed `const supabase = createClient()`

8. ✅ `src/app/live/participant/[sessionId]/waiting/page.tsx`
   - Changed import to `import { supabase } from '@/lib/supabase'`
   - Removed `const supabase = createClient()`

9. ✅ `src/app/live/participant/[sessionId]/play/page.tsx`
   - Changed import to `import { supabase } from '@/lib/supabase'`
   - Removed `const supabase = createClient()`

## Security Pattern

The implementation now follows the project's established security pattern:

1. **Authenticated Operations** (create, start, next, end):
   - Use `createServerClient` with cookies to verify user identity
   - Check ownership/permissions
   - Use `supabaseAdmin` to execute database operations (bypasses RLS after verification)

2. **Anonymous Read Operations** (validate-pin):
   - Use regular `supabase` client
   - No authentication required

3. **Anonymous Write Operations** (join):
   - Use `supabaseAdmin` to bypass RLS
   - Validation logic ensures data integrity

## Verification

✅ **Linter Status**: No errors found
✅ **Import Paths**: All corrected
✅ **Pattern Consistency**: Matches existing codebase
✅ **Service Role**: Proper availability checks added

## Files Modified: 9 total

- 4 API route files
- 1 service file
- 4 client page files

The "Module not found" error is now resolved!
