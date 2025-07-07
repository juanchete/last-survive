-- Fix the migrate_player_references function to handle admin_actions table
-- This addresses the foreign key constraint violation from admin_actions.target_player_id

CREATE OR REPLACE FUNCTION migrate_player_references(
  old_player_id INTEGER,
  new_player_id INTEGER
) RETURNS JSON AS $$
DECLARE
  result JSON;
  moves_updated INTEGER := 0;
  rosters_updated INTEGER := 0;
  stats_updated INTEGER := 0;
  waivers_updated INTEGER := 0;
  admin_actions_updated INTEGER := 0;
BEGIN
  -- Update roster_moves
  UPDATE roster_moves 
  SET player_id = new_player_id 
  WHERE player_id = old_player_id;
  GET DIAGNOSTICS moves_updated = ROW_COUNT;

  -- Update team_rosters (check for conflicts first)
  UPDATE team_rosters 
  SET player_id = new_player_id 
  WHERE player_id = old_player_id
  AND NOT EXISTS (
    SELECT 1 FROM team_rosters tr2 
    WHERE tr2.fantasy_team_id = team_rosters.fantasy_team_id 
    AND tr2.player_id = new_player_id
    AND tr2.week = team_rosters.week
  );
  GET DIAGNOSTICS rosters_updated = ROW_COUNT;

  -- Update player_stats (check for conflicts first)
  UPDATE player_stats 
  SET player_id = new_player_id 
  WHERE player_id = old_player_id
  AND NOT EXISTS (
    SELECT 1 FROM player_stats ps2 
    WHERE ps2.player_id = new_player_id 
    AND ps2.week = player_stats.week
    AND ps2.season = player_stats.season
  );
  GET DIAGNOSTICS stats_updated = ROW_COUNT;

  -- Update waiver_requests
  UPDATE waiver_requests 
  SET player_id = new_player_id 
  WHERE player_id = old_player_id;
  GET DIAGNOSTICS waivers_updated = ROW_COUNT;

  -- Update admin_actions (this was missing!)
  UPDATE admin_actions 
  SET target_player_id = new_player_id 
  WHERE target_player_id = old_player_id;
  GET DIAGNOSTICS admin_actions_updated = ROW_COUNT;

  result := json_build_object(
    'moves_updated', moves_updated,
    'rosters_updated', rosters_updated,
    'stats_updated', stats_updated,
    'waivers_updated', waivers_updated,
    'admin_actions_updated', admin_actions_updated
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Also update the check_duplicate_player_references function to include admin_actions
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

  -- Check admin_actions (NEW!)
  RETURN QUERY
  SELECT 
    p.id,
    p.name::TEXT,
    'admin_actions'::TEXT,
    COUNT(aa.*)
  FROM players p
  JOIN admin_actions aa ON aa.target_player_id = p.id
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
COMMENT ON FUNCTION migrate_player_references(INTEGER, INTEGER) IS 'Migrate references from one player to another (including admin_actions)';
COMMENT ON FUNCTION check_duplicate_player_references() IS 'Check which tables reference duplicate players (including admin_actions)';