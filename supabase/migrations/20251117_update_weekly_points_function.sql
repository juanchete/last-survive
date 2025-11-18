-- Migration: Update Weekly Points Function
-- Description: Creates function to update fantasy_teams.weekly_points before elimination process
-- This ensures that weekly_points field is populated with actual calculated points
-- from player_stats before the elimination logic runs

-- Function to update weekly_points for a single team
CREATE OR REPLACE FUNCTION update_team_weekly_points(
  p_team_id UUID,
  p_week INTEGER,
  p_season INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  v_total_points NUMERIC;
BEGIN
  -- Calculate total points from active roster players for the specified week
  SELECT COALESCE(SUM(ps.fantasy_points), 0)
  INTO v_total_points
  FROM team_rosters tr
  JOIN player_stats ps ON tr.player_id = ps.player_id
  WHERE tr.fantasy_team_id = p_team_id
    AND tr.week = p_week
    AND tr.is_active = true
    AND ps.week = p_week
    AND ps.season = p_season;

  -- Update the weekly_points field
  UPDATE fantasy_teams
  SET weekly_points = v_total_points
  WHERE id = p_team_id;

  RETURN v_total_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update weekly_points for all teams in a league
CREATE OR REPLACE FUNCTION update_league_weekly_points(
  p_league_id UUID,
  p_week INTEGER,
  p_season INTEGER
) RETURNS TABLE(
  team_id UUID,
  team_name TEXT,
  points NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH updated_teams AS (
    SELECT
      ft.id,
      ft.name,
      update_team_weekly_points(ft.id, p_week, p_season) as calculated_points
    FROM fantasy_teams ft
    WHERE ft.league_id = p_league_id
      AND ft.eliminated = false
  )
  SELECT
    updated_teams.id,
    updated_teams.name,
    updated_teams.calculated_points
  FROM updated_teams
  ORDER BY updated_teams.calculated_points ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update weekly_points for ALL active leagues
CREATE OR REPLACE FUNCTION update_all_leagues_weekly_points(
  p_week INTEGER,
  p_season INTEGER
) RETURNS TABLE(
  league_id UUID,
  league_name TEXT,
  teams_updated INTEGER,
  min_points NUMERIC,
  max_points NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH league_updates AS (
    SELECT
      l.id as lid,
      l.name as lname,
      COUNT(ft.id)::INTEGER as team_count,
      MIN(update_team_weekly_points(ft.id, p_week, p_season)) as min_pts,
      MAX(update_team_weekly_points(ft.id, p_week, p_season)) as max_pts
    FROM leagues l
    JOIN fantasy_teams ft ON ft.league_id = l.id
    WHERE l.status = 'active'
      AND ft.eliminated = false
      AND l.current_week = p_week
    GROUP BY l.id, l.name
  )
  SELECT
    league_updates.lid,
    league_updates.lname,
    league_updates.team_count,
    league_updates.min_pts,
    league_updates.max_pts
  FROM league_updates;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION update_team_weekly_points(UUID, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_league_weekly_points(UUID, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_all_leagues_weekly_points(INTEGER, INTEGER) TO authenticated, service_role;

-- Add helpful comment
COMMENT ON FUNCTION update_team_weekly_points IS 'Updates weekly_points field for a single team based on player_stats';
COMMENT ON FUNCTION update_league_weekly_points IS 'Updates weekly_points for all non-eliminated teams in a league';
COMMENT ON FUNCTION update_all_leagues_weekly_points IS 'Updates weekly_points for all teams in all active leagues';
