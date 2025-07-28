-- Migration to add automatic roster initialization for new weeks
-- This ensures that when a new week becomes active, rosters are copied from the previous week

-- Function to initialize rosters for a new week
CREATE OR REPLACE FUNCTION initialize_rosters_for_week(
  p_league_id UUID,
  p_new_week INTEGER,
  p_season INTEGER DEFAULT 2024
) RETURNS JSON AS $$
DECLARE
  v_previous_week INTEGER;
  v_rosters_created INTEGER := 0;
  v_teams_processed INTEGER := 0;
  v_result JSON;
BEGIN
  -- Find the previous week
  v_previous_week := p_new_week - 1;
  
  -- Check if rosters already exist for the new week
  IF EXISTS (
    SELECT 1 
    FROM team_rosters tr
    JOIN fantasy_teams ft ON ft.id = tr.fantasy_team_id
    WHERE ft.league_id = p_league_id 
    AND tr.week = p_new_week
    LIMIT 1
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Rosters already exist for week %s', p_new_week)
    );
  END IF;
  
  -- Check if previous week has rosters
  IF NOT EXISTS (
    SELECT 1 
    FROM team_rosters tr
    JOIN fantasy_teams ft ON ft.id = tr.fantasy_team_id
    WHERE ft.league_id = p_league_id 
    AND tr.week = v_previous_week
    LIMIT 1
  ) THEN
    -- If no previous week rosters, look for the most recent week with rosters
    SELECT MAX(tr.week) INTO v_previous_week
    FROM team_rosters tr
    JOIN fantasy_teams ft ON ft.id = tr.fantasy_team_id
    WHERE ft.league_id = p_league_id 
    AND tr.week < p_new_week;
    
    IF v_previous_week IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'message', 'No previous rosters found to copy from'
      );
    END IF;
  END IF;
  
  -- Copy rosters from previous week to new week
  -- Only copy for teams that are not eliminated
  INSERT INTO team_rosters (
    fantasy_team_id, 
    player_id, 
    week, 
    is_active, 
    slot, 
    acquired_type, 
    acquired_week
  )
  SELECT 
    tr.fantasy_team_id,
    tr.player_id,
    p_new_week, -- New week
    tr.is_active,
    tr.slot,
    tr.acquired_type,
    tr.acquired_week
  FROM team_rosters tr
  JOIN fantasy_teams ft ON ft.id = tr.fantasy_team_id
  WHERE ft.league_id = p_league_id
    AND ft.eliminated = false -- Only copy for active teams
    AND tr.week = v_previous_week
    -- Ensure we don't copy players from eliminated teams
    AND NOT EXISTS (
      SELECT 1 
      FROM players p
      JOIN nfl_teams nt ON nt.id = p.nfl_team_id
      WHERE p.id = tr.player_id
      AND nt.eliminated = true
    );
  
  GET DIAGNOSTICS v_rosters_created = ROW_COUNT;
  
  -- Count how many teams were processed
  SELECT COUNT(DISTINCT tr.fantasy_team_id) INTO v_teams_processed
  FROM team_rosters tr
  JOIN fantasy_teams ft ON ft.id = tr.fantasy_team_id
  WHERE ft.league_id = p_league_id
    AND tr.week = p_new_week;
  
  -- Log the initialization
  INSERT INTO admin_actions (
    action_type,
    details,
    created_at
  ) VALUES (
    'roster_initialization',
    json_build_object(
      'league_id', p_league_id,
      'week', p_new_week,
      'previous_week', v_previous_week,
      'rosters_created', v_rosters_created,
      'teams_processed', v_teams_processed
    ),
    NOW()
  );
  
  RETURN json_build_object(
    'success', true,
    'message', format('Initialized rosters for week %s', p_new_week),
    'rosters_created', v_rosters_created,
    'teams_processed', v_teams_processed,
    'copied_from_week', v_previous_week
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Error initializing rosters: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle week status changes
CREATE OR REPLACE FUNCTION handle_week_status_change() RETURNS TRIGGER AS $$
DECLARE
  v_result JSON;
BEGIN
  -- When a week becomes active, initialize rosters if needed
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Call the roster initialization function
    SELECT initialize_rosters_for_week(NEW.league_id, NEW.number) INTO v_result;
    
    -- Log the result
    RAISE NOTICE 'Roster initialization result: %', v_result;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for week status changes
DROP TRIGGER IF EXISTS trigger_week_status_change ON weeks;
CREATE TRIGGER trigger_week_status_change
  AFTER UPDATE OF status ON weeks
  FOR EACH ROW
  EXECUTE FUNCTION handle_week_status_change();

-- Create separate trigger for inserts
DROP TRIGGER IF EXISTS trigger_week_insert ON weeks;
CREATE TRIGGER trigger_week_insert
  AFTER INSERT ON weeks
  FOR EACH ROW
  EXECUTE FUNCTION handle_week_status_change();

-- Function to manually initialize rosters (for admin use)
CREATE OR REPLACE FUNCTION admin_initialize_rosters(
  p_league_id UUID,
  p_week INTEGER
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Check if user is admin (you may want to add proper admin check here)
  -- For now, this is a SECURITY DEFINER function that can be called by admins
  
  SELECT initialize_rosters_for_week(p_league_id, p_week) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION initialize_rosters_for_week TO authenticated;
GRANT EXECUTE ON FUNCTION admin_initialize_rosters TO authenticated;

-- Add comments
COMMENT ON FUNCTION initialize_rosters_for_week IS 'Initializes rosters for a new week by copying from the previous week';
COMMENT ON FUNCTION handle_week_status_change IS 'Trigger function that handles week status changes and initializes rosters';
COMMENT ON FUNCTION admin_initialize_rosters IS 'Admin function to manually initialize rosters for a specific week';