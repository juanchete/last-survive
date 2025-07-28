-- Test script for roster initialization
-- This can be run manually to test the roster initialization functionality

-- Test function to verify roster initialization works correctly
CREATE OR REPLACE FUNCTION test_roster_initialization() RETURNS JSON AS $$
DECLARE
  v_league_id UUID;
  v_result JSON;
  v_roster_count_week1 INTEGER;
  v_roster_count_week2 INTEGER;
BEGIN
  -- Get a test league ID (you can replace with a specific league ID)
  SELECT id INTO v_league_id
  FROM leagues
  WHERE draft_completed = true
  LIMIT 1;
  
  IF v_league_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No test league found'
    );
  END IF;
  
  -- Count rosters for week 1
  SELECT COUNT(*) INTO v_roster_count_week1
  FROM team_rosters tr
  JOIN fantasy_teams ft ON ft.id = tr.fantasy_team_id
  WHERE ft.league_id = v_league_id
  AND tr.week = 1;
  
  -- Test initialization for week 2
  SELECT initialize_rosters_for_week(v_league_id, 2) INTO v_result;
  
  -- Count rosters for week 2 after initialization
  SELECT COUNT(*) INTO v_roster_count_week2
  FROM team_rosters tr
  JOIN fantasy_teams ft ON ft.id = tr.fantasy_team_id
  WHERE ft.league_id = v_league_id
  AND tr.week = 2;
  
  RETURN json_build_object(
    'success', true,
    'league_id', v_league_id,
    'week1_rosters', v_roster_count_week1,
    'week2_rosters', v_roster_count_week2,
    'initialization_result', v_result
  );
END;
$$ LANGUAGE plpgsql;

-- To run the test:
-- SELECT test_roster_initialization();

-- Clean up test function after use
-- DROP FUNCTION IF EXISTS test_roster_initialization();