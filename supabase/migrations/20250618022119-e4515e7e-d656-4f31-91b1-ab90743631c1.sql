
-- Add MVP tracking columns to fantasy_teams table
ALTER TABLE fantasy_teams 
ADD COLUMN mvp_wins INTEGER DEFAULT 0,
ADD COLUMN total_earnings DECIMAL DEFAULT 0;

-- Create weekly MVP history table
CREATE TABLE weekly_mvp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  season INTEGER NOT NULL DEFAULT 2024,
  fantasy_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  points DECIMAL NOT NULL,
  earnings DECIMAL DEFAULT 20.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(league_id, week, season)
);

-- Create function to process weekly MVP and update earnings
CREATE OR REPLACE FUNCTION process_weekly_mvp(target_league_id UUID, week_num INTEGER, season_year INTEGER DEFAULT 2024)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  mvp_team RECORD;
  earnings DECIMAL DEFAULT 20.00;
BEGIN
  -- Find the team with highest points for the week (non-eliminated teams only)
  SELECT 
    ft.id as team_id,
    ft.name as team_name,
    ft.user_id,
    calculate_team_weekly_score(ft.id, week_num, season_year) as weekly_points
  INTO mvp_team
  FROM fantasy_teams ft
  WHERE ft.league_id = target_league_id
    AND ft.eliminated = false
  ORDER BY calculate_team_weekly_score(ft.id, week_num, season_year) DESC
  LIMIT 1;
  
  IF mvp_team IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No eligible teams found for MVP'
    );
  END IF;
  
  -- Insert MVP record (will fail if already exists due to unique constraint)
  BEGIN
    INSERT INTO weekly_mvp_history (league_id, week, season, fantasy_team_id, points, earnings)
    VALUES (target_league_id, week_num, season_year, mvp_team.team_id, mvp_team.weekly_points, earnings);
    
    -- Update team's MVP count and total earnings
    UPDATE fantasy_teams 
    SET mvp_wins = mvp_wins + 1,
        total_earnings = total_earnings + earnings
    WHERE id = mvp_team.team_id;
    
    -- Create notification
    INSERT INTO notifications (user_id, league_id, message, type)
    VALUES (
      mvp_team.user_id,
      target_league_id,
      format('🏆 Congratulations! You are the MVP of Week %s with %s points and earned $%s!', 
             week_num, mvp_team.weekly_points, earnings),
      'success'
    );
    
    RETURN json_build_object(
      'success', true,
      'message', format('MVP processed: %s with %s points', mvp_team.team_name, mvp_team.weekly_points),
      'mvp_team', json_build_object(
        'id', mvp_team.team_id,
        'name', mvp_team.team_name,
        'points', mvp_team.weekly_points,
        'earnings', earnings
      )
    );
    
  EXCEPTION
    WHEN unique_violation THEN
      RETURN json_build_object(
        'success', false,
        'message', 'MVP already processed for this week'
      );
  END;
END;
$$;

-- Update the existing weekly elimination function to also process MVP
CREATE OR REPLACE FUNCTION process_weekly_elimination_with_mvp(league_id UUID, week_num INTEGER, season_year INTEGER DEFAULT 2024)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  elimination_result JSON;
  mvp_result JSON;
BEGIN
  -- First process MVP (before elimination, so eliminated team can still win MVP)
  SELECT process_weekly_mvp(league_id, week_num, season_year) INTO mvp_result;
  
  -- Then process elimination
  SELECT process_weekly_elimination(league_id, week_num, season_year) INTO elimination_result;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Weekly processing completed',
    'elimination_result', elimination_result,
    'mvp_result', mvp_result
  );
END;
$$;
