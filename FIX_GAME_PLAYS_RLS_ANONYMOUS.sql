-- ============================================
-- Migration: Fix RLS Policy for Anonymous Game Plays
-- ============================================
-- Purpose: Allow game creators to view ALL plays (including anonymous plays)
--          of their games in analytics
-- Date: 2026-01-11
-- Issue: Anonymous plays with user_id=NULL were not visible to game creators
--        in analytics due to IN subquery not handling the relationship optimally
-- ============================================

-- Drop the existing policy that uses IN subquery
DROP POLICY IF EXISTS "Creators can view plays of their games" ON game_plays;

-- Create improved policy using EXISTS for better NULL handling
-- This explicitly checks the relationship between games and game_plays
-- and allows game creators to see ALL plays (authenticated and anonymous)
CREATE POLICY "Creators can view all plays of their games" ON game_plays
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM games 
            WHERE games.id = game_plays.game_id 
            AND games.user_id = auth.uid()
        )
    );

-- ============================================
-- NOTES:
-- ============================================
-- 1. This policy allows game creators to view ALL plays of their games,
--    regardless of whether the play has a user_id (logged-in) or is NULL (anonymous)
-- 
-- 2. The EXISTS clause is more explicit and performant than IN for this use case
--
-- 3. Anonymous plays are identified by having user_id = NULL and a player_name
--
-- 4. This fix makes historical anonymous plays immediately visible in analytics
--    without requiring users to replay the quiz
-- ============================================

-- Verify the policy was created successfully
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'game_plays' 
AND policyname = 'Creators can view all plays of their games';
