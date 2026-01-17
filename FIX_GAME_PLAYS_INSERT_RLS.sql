-- ============================================
-- Migration: Fix INSERT RLS Policy for Anonymous Game Plays
-- ============================================
-- Purpose: Allow anonymous users to INSERT game play records
-- Date: 2026-01-11
-- Issue: "new row violates row-level security policy for table 'game_plays'"
--        Anonymous users were blocked from creating game_plays rows
-- ============================================

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Anyone can create game plays" ON game_plays;
DROP POLICY IF EXISTS "Allow all inserts to game_plays" ON game_plays;

-- Create new INSERT policy that applies to all roles
-- This allows both authenticated and anonymous users to insert game plays
-- Note: Omitting TO clause makes it apply to PUBLIC (all roles) by default
CREATE POLICY "Enable insert for all users" ON game_plays
    FOR INSERT
    WITH CHECK (true);

-- Ensure proper grants are in place for both roles
-- These grants give the actual permission to perform the INSERT operation
GRANT INSERT ON TABLE game_plays TO authenticated;
GRANT INSERT ON TABLE game_plays TO anon;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- 1. Verify the new INSERT policy was created
SELECT 
    policyname,
    cmd,
    qual,
    with_check,
    roles
FROM pg_policies 
WHERE tablename = 'game_plays' 
AND cmd = 'INSERT';

-- 2. Verify grants are in place
SELECT 
    grantee,
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'game_plays' 
AND privilege_type = 'INSERT'
ORDER BY grantee;

-- ============================================
-- NOTES:
-- ============================================
-- 1. The TO clause explicitly targets public, authenticated, and anon roles
-- 2. WITH CHECK (true) allows any insert without conditions
-- 3. GRANT statements ensure both roles have INSERT permission on the table
-- 4. This works in combination with the SELECT policy fix (FIX_GAME_PLAYS_RLS_ANONYMOUS.sql)
--    to provide complete anonymous play support:
--    - INSERT policy: Anonymous users can submit plays
--    - SELECT policy: Game creators can view all plays (including anonymous)
-- ============================================
