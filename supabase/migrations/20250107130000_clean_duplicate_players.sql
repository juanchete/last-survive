-- Clean duplicate players without sleeper_id
-- This migration removes duplicate players that don't have sleeper_id
-- when another player with the same name and position already has a sleeper_id

-- First, let's create a backup table with the players we're going to delete
CREATE TABLE IF NOT EXISTS players_backup_duplicates AS
SELECT p1.*
FROM players p1
WHERE p1.sleeper_id IS NULL
AND EXISTS (
  SELECT 1 
  FROM players p2 
  WHERE p2.sleeper_id IS NOT NULL 
  AND LOWER(TRIM(p2.name)) = LOWER(TRIM(p1.name))
  AND p2.position = p1.position
  AND p2.id != p1.id
);

-- Add a timestamp to know when this backup was created
ALTER TABLE players_backup_duplicates ADD COLUMN IF NOT EXISTS backed_up_at TIMESTAMP DEFAULT NOW();

-- Now let's check which players would be affected by deletion
-- This helps us identify if any roster_moves, team_rosters, etc. reference these players
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

-- Function to migrate references from duplicate to original player
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

  result := json_build_object(
    'moves_updated', moves_updated,
    'rosters_updated', rosters_updated,
    'stats_updated', stats_updated,
    'waivers_updated', waivers_updated
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to clean duplicate players safely
CREATE OR REPLACE FUNCTION clean_duplicate_players()
RETURNS JSON AS $$
DECLARE
  duplicate_count INTEGER := 0;
  migrated_count INTEGER := 0;
  deleted_count INTEGER := 0;
  error_count INTEGER := 0;
  duplicate_record RECORD;
  original_player_id INTEGER;
  migration_result JSON;
  result JSON;
BEGIN
  -- Process each duplicate player
  FOR duplicate_record IN 
    SELECT p1.id, p1.name, p1.position
    FROM players p1
    WHERE p1.sleeper_id IS NULL
    AND EXISTS (
      SELECT 1 
      FROM players p2 
      WHERE p2.sleeper_id IS NOT NULL 
      AND LOWER(TRIM(p2.name)) = LOWER(TRIM(p1.name))
      AND p2.position = p1.position
      AND p2.id != p1.id
    )
  LOOP
    duplicate_count := duplicate_count + 1;
    
    BEGIN
      -- Find the original player with sleeper_id
      SELECT id INTO original_player_id
      FROM players
      WHERE sleeper_id IS NOT NULL
      AND LOWER(TRIM(name)) = LOWER(TRIM(duplicate_record.name))
      AND position = duplicate_record.position
      AND id != duplicate_record.id
      LIMIT 1;

      IF original_player_id IS NOT NULL THEN
        -- Migrate references
        SELECT migrate_player_references(duplicate_record.id, original_player_id) INTO migration_result;
        migrated_count := migrated_count + 1;
        
        -- Delete the duplicate
        DELETE FROM players WHERE id = duplicate_record.id;
        deleted_count := deleted_count + 1;
        
        RAISE NOTICE 'Migrated and deleted duplicate: % (ID: %)', duplicate_record.name, duplicate_record.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE WARNING 'Error processing player % (ID: %): %', duplicate_record.name, duplicate_record.id, SQLERRM;
    END;
  END LOOP;

  result := json_build_object(
    'duplicate_count', duplicate_count,
    'migrated_count', migrated_count,
    'deleted_count', deleted_count,
    'error_count', error_count
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create an admin function to execute the cleanup
CREATE OR REPLACE FUNCTION admin_clean_duplicate_players(
  admin_id UUID,
  dry_run BOOLEAN DEFAULT TRUE
) RETURNS JSON AS $$
DECLARE
  result JSON;
  is_admin BOOLEAN;
  references_check JSON;
BEGIN
  -- Check if user is admin
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE id = admin_id 
    AND role IN ('admin', 'super_admin')
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Unauthorized: Admin access required'
    );
  END IF;

  -- If dry run, just return what would be affected
  IF dry_run THEN
    SELECT json_agg(row_to_json(t)) INTO references_check
    FROM check_duplicate_player_references() t;
    
    RETURN json_build_object(
      'success', true,
      'dry_run', true,
      'message', 'Dry run completed - no changes made',
      'affected_references', references_check,
      'duplicate_players', (
        SELECT json_agg(json_build_object(
          'id', id,
          'name', name,
          'position', position,
          'nfl_team_id', nfl_team_id
        ))
        FROM players
        WHERE sleeper_id IS NULL
        AND EXISTS (
          SELECT 1 
          FROM players p2 
          WHERE p2.sleeper_id IS NOT NULL 
          AND LOWER(TRIM(p2.name)) = LOWER(TRIM(players.name))
          AND p2.position = players.position
          AND p2.id != players.id
        )
      )
    );
  END IF;

  -- Execute the cleanup
  SELECT clean_duplicate_players() INTO result;
  
  RETURN json_build_object(
    'success', true,
    'dry_run', false,
    'message', 'Duplicate players cleaned successfully',
    'result', result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_clean_duplicate_players(UUID, BOOLEAN) TO authenticated;

-- Add comments
COMMENT ON FUNCTION admin_clean_duplicate_players(UUID, BOOLEAN) IS 'Clean duplicate players without sleeper_id. Set dry_run=false to execute deletion.';
COMMENT ON FUNCTION check_duplicate_player_references() IS 'Check which tables reference duplicate players';
COMMENT ON FUNCTION migrate_player_references(INTEGER, INTEGER) IS 'Migrate references from one player to another';
COMMENT ON FUNCTION clean_duplicate_players() IS 'Internal function to clean duplicate players';