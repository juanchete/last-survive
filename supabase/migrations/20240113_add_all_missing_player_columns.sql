-- Add all missing columns to players table for complete Sleeper API integration
-- This migration adds injury_status and status columns that were missing

ALTER TABLE players
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS injury_status VARCHAR(50);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);
CREATE INDEX IF NOT EXISTS idx_players_injury_status 
  ON players(injury_status) 
  WHERE injury_status IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN players.status IS 'Player status (active, inactive, injured_reserve, etc.)';
COMMENT ON COLUMN players.injury_status IS 'Current injury status from Sleeper API (questionable, doubtful, out, etc.)';