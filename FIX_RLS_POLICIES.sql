-- Fix RLS policies for games table
-- Run this in Supabase SQL Editor if you're getting "new row violates row-level security policy" error

-- Step 1: Drop existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can view public games" ON games;
DROP POLICY IF EXISTS "Users can view own games" ON games;
DROP POLICY IF EXISTS "Authenticated users can create games" ON games;
DROP POLICY IF EXISTS "Users can update own games" ON games;
DROP POLICY IF EXISTS "Users can delete own games" ON games;

-- Step 2: Disable RLS temporarily to verify it's the issue
-- ALTER TABLE games DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Step 4: Recreate policies with proper permissions

-- Anyone can view public, active, approved games
CREATE POLICY "Anyone can view public games" ON games
    FOR SELECT USING (
        is_public = TRUE 
        AND is_active = TRUE 
        AND moderation_status = 'approved'
    );

-- Users can view their own games (even private/inactive)
CREATE POLICY "Users can view own games" ON games
    FOR SELECT USING (
        auth.uid() IS NOT NULL 
        AND user_id = auth.uid()
    );

-- Authenticated users can create games (they own)
CREATE POLICY "Authenticated users can create games" ON games
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND user_id = auth.uid()
    );

-- Users can update their own games
CREATE POLICY "Users can update own games" ON games
    FOR UPDATE USING (
        auth.uid() IS NOT NULL 
        AND user_id = auth.uid()
    )
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND user_id = auth.uid()
    );

-- Users can soft-delete their own games (set is_active = false)
CREATE POLICY "Users can delete own games" ON games
    FOR UPDATE USING (
        auth.uid() IS NOT NULL 
        AND user_id = auth.uid()
    );

-- Step 5: Verify policies are working
-- Test with: SELECT * FROM games WHERE user_id = auth.uid();
