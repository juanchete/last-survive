-- Add unique constraint on sportsdata_id to prevent duplicates
-- This allows proper upsert operations during sync

-- First clean any existing duplicates
DELETE FROM players p1 
USING players p2 
WHERE p1.id > p2.id 
  AND p1.name = p2.name 
  AND p1.position = p2.position;

-- Add unique constraint on sportsdata_id (where it's not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_sportsdata_id_unique 
ON players(sportsdata_id) 
WHERE sportsdata_id IS NOT NULL;

-- Add unique constraint on name+position+nfl_team_id combination
-- This prevents duplicates for players without sportsdata_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_name_position_team_unique
ON players(name, position, COALESCE(nfl_team_id, -1));

-- Add comment
COMMENT ON INDEX idx_players_sportsdata_id_unique IS 'Ensures no duplicate players from SportsData.io';
COMMENT ON INDEX idx_players_name_position_team_unique IS 'Prevents duplicate players by name, position, and team';