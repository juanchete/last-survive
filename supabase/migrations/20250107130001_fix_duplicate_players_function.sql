-- Fix type mismatch in check_duplicate_player_references function
-- This fixes the "character varying(100) does not match expected type text" error

-- Drop and recreate the function with proper type casting
DROP FUNCTION IF EXISTS check_duplicate_player_references();

CREATE OR REPLACE FUNCTION check_duplicate_player_references()
RETURNS TABLE (
  player_id INTEGER,
  player_name TEXT,
  table_name TEXT,
  reference_count BIGINT
) AS $$
BEGIN
  -- Check roster_moves
  RETURN QUERY
  SELECT 
    p.id,
    p.name::TEXT,
    'roster_moves'::TEXT,
    COUNT(rm.*)
  FROM players p
  JOIN roster_moves rm ON rm.player_id = p.id
  WHERE p.sleeper_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM players p2 
    WHERE p2.sleeper_id IS NOT NULL 
    AND LOWER(TRIM(p2.name)) = LOWER(TRIM(p.name))
    AND p2.position = p.position
    AND p2.id != p.id
  )
  GROUP BY p.id, p.name;

  -- Check team_rosters
  RETURN QUERY
  SELECT 
    p.id,
    p.name::TEXT,
    'team_rosters'::TEXT,
    COUNT(tr.*)
  FROM players p
  JOIN team_rosters tr ON tr.player_id = p.id
  WHERE p.sleeper_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM players p2 
    WHERE p2.sleeper_id IS NOT NULL 
    AND LOWER(TRIM(p2.name)) = LOWER(TRIM(p.name))
    AND p2.position = p.position
    AND p2.id != p.id
  )
  GROUP BY p.id, p.name;

  -- Check player_stats
  RETURN QUERY
  SELECT 
    p.id,
    p.name::TEXT,
    'player_stats'::TEXT,
    COUNT(ps.*)
  FROM players p
  JOIN player_stats ps ON ps.player_id = p.id
  WHERE p.sleeper_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM players p2 
    WHERE p2.sleeper_id IS NOT NULL 
    AND LOWER(TRIM(p2.name)) = LOWER(TRIM(p.name))
    AND p2.position = p.position
    AND p2.id != p.id
  )
  GROUP BY p.id, p.name;

  -- Check waiver_requests
  RETURN QUERY
  SELECT 
    p.id,
    p.name::TEXT,
    'waiver_requests'::TEXT,
    COUNT(wr.*)
  FROM players p
  JOIN waiver_requests wr ON wr.player_id = p.id
  WHERE p.sleeper_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM players p2 
    WHERE p2.sleeper_id IS NOT NULL 
    AND LOWER(TRIM(p2.name)) = LOWER(TRIM(p.name))
    AND p2.position = p.position
    AND p2.id != p.id
  )
  GROUP BY p.id, p.name;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION check_duplicate_player_references() IS 'Check which tables reference duplicate players (fixed type casting)';