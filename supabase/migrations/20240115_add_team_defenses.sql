-- Migration to add team defenses as special player entries
-- Team defenses are handled as "players" with position DEF for fantasy purposes

-- First, ensure we have all 32 NFL teams
-- This will be populated by the sync function, but we ensure the structure is ready

-- Add a column to identify team defense entries
ALTER TABLE players
ADD COLUMN IF NOT EXISTS is_team_defense BOOLEAN DEFAULT FALSE;

-- Add index for quick lookup of team defenses
CREATE INDEX IF NOT EXISTS idx_players_team_defense 
  ON players(is_team_defense) 
  WHERE is_team_defense = true;

-- Create a function to initialize team defenses
CREATE OR REPLACE FUNCTION initialize_team_defenses()
RETURNS TABLE (
  created_count INTEGER,
  message TEXT
) AS $$
DECLARE
  v_created_count INTEGER := 0;
  v_team RECORD;
BEGIN
  -- Loop through all NFL teams and create defense entries
  FOR v_team IN 
    SELECT id, name, abbreviation 
    FROM nfl_teams 
    WHERE abbreviation IS NOT NULL
  LOOP
    -- Check if defense already exists
    IF NOT EXISTS (
      SELECT 1 FROM players 
      WHERE position = 'DEF' 
      AND nfl_team_id = v_team.id
      AND is_team_defense = true
    ) THEN
      -- Insert team defense as a "player"
      INSERT INTO players (
        name,
        position,
        nfl_team_id,
        sleeper_id,
        is_team_defense,
        status,
        photo_url
      ) VALUES (
        v_team.name || ' Defense',
        'DEF',
        v_team.id,
        v_team.abbreviation, -- Sleeper uses team abbreviation as defense ID
        true,
        'active',
        NULL
      );
      
      v_created_count := v_created_count + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY
  SELECT v_created_count, 
         'Created ' || v_created_count || ' team defense entries';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for easy access to team defenses
CREATE OR REPLACE VIEW team_defenses AS
SELECT 
  p.id,
  p.name,
  p.sleeper_id,
  p.nfl_team_id,
  nt.abbreviation as team_abbreviation,
  nt.name as team_name,
  p.avatar_url,
  p.last_sync_at
FROM players p
JOIN nfl_teams nt ON nt.id = p.nfl_team_id
WHERE p.position = 'DEF' 
  AND p.is_team_defense = true;

-- Grant permissions
GRANT SELECT ON team_defenses TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_team_defenses() TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN players.is_team_defense IS 'Indicates if this player entry represents a team defense/special teams unit';
COMMENT ON VIEW team_defenses IS 'View of all team defense units for fantasy football';
COMMENT ON FUNCTION initialize_team_defenses() IS 'Initializes team defense entries for all NFL teams';