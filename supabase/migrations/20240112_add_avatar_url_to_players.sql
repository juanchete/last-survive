-- Add avatar_url column to players table for Sleeper API integration
ALTER TABLE players
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add index for better query performance when filtering by avatar existence
CREATE INDEX IF NOT EXISTS idx_players_avatar_url 
  ON players(avatar_url) 
  WHERE avatar_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN players.avatar_url IS 'Player avatar/photo URL from Sleeper API';