-- Add opponent column to player_stats table
-- This stores which team the player is facing in a given week

ALTER TABLE player_stats
ADD COLUMN IF NOT EXISTS opponent VARCHAR(10);

-- Add comment to document the column
COMMENT ON COLUMN player_stats.opponent IS 'Team abbreviation that the player is facing this week (e.g., "KC", "SF", "BYE")';
