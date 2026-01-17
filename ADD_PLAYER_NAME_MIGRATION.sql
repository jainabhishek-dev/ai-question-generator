-- Migration: Add player_name column to game_plays table
-- Purpose: Store display names for both anonymous and logged-in players
-- Date: 2026-01-11

-- Add player_name column to game_plays table
ALTER TABLE game_plays ADD COLUMN IF NOT EXISTS player_name TEXT;

-- Add index for faster queries when searching by player name
CREATE INDEX IF NOT EXISTS idx_game_plays_player_name ON game_plays(player_name);

-- Add comment to document the column
COMMENT ON COLUMN game_plays.player_name IS 'Display name provided by player (can be nickname for both anonymous and logged-in users)';
