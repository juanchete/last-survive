-- Remove Sleeper integration completely
-- This migration removes all Sleeper-related columns, functions, and indexes

-- Drop the sync function first
DROP FUNCTION IF EXISTS sync_weekly_stats_from_api(INTEGER, INTEGER);

-- Drop index on sleeper_id
DROP INDEX IF EXISTS idx_players_sleeper_id;

-- Drop the team_defenses view first (it depends on sleeper_id)
DROP VIEW IF EXISTS team_defenses;

-- Drop the sleeper_id column from players table
ALTER TABLE players DROP COLUMN IF EXISTS sleeper_id;

-- Recreate the team_defenses view without sleeper_id
CREATE VIEW team_defenses AS
SELECT 
  p.id,
  p.name,
  p.nfl_team_id,
  nt.abbreviation AS team_abbreviation,
  nt.name AS team_name,
  p.avatar_url,
  p.last_sync_at
FROM players p
JOIN nfl_teams nt ON nt.id = p.nfl_team_id
WHERE p.position = 'DEF' AND p.is_team_defense = true;

-- Drop and recreate clean_duplicate_players function without sleeper_id references
DROP FUNCTION IF EXISTS clean_duplicate_players();

CREATE OR REPLACE FUNCTION clean_duplicate_players()
RETURNS JSON AS $$
DECLARE
  duplicate_count INTEGER := 0;
  deleted_count INTEGER := 0;
  result JSON;
  duplicate_rec RECORD;
BEGIN
  -- Find duplicates based on name and position only (no sleeper_id)
  FOR duplicate_rec IN
    SELECT name, position, COUNT(*) as count
    FROM players
    WHERE name IS NOT NULL
    GROUP BY name, position
    HAVING COUNT(*) > 1
    ORDER BY name, position
  LOOP
    duplicate_count := duplicate_count + duplicate_rec.count - 1;
    
    -- Keep the first one (oldest by ID), delete the rest
    DELETE FROM players 
    WHERE name = duplicate_rec.name 
    AND position = duplicate_rec.position
    AND id NOT IN (
      SELECT id FROM players 
      WHERE name = duplicate_rec.name 
      AND position = duplicate_rec.position
      ORDER BY id 
      LIMIT 1
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the action (simplified for system operations)
    -- Note: admin_user_id would need a valid UUID for proper logging
  END LOOP;
  
  result := json_build_object(
    'success', true,
    'message', 'Duplicate cleanup completed',
    'duplicate_count', duplicate_count,
    'deleted_count', deleted_count
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION clean_duplicate_players() TO authenticated;
COMMENT ON FUNCTION clean_duplicate_players() IS 'Clean duplicate players based on name and position';

-- Migration completed successfully
-- Removed all Sleeper integration: functions, indexes, columns, and views