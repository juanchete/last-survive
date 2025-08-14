-- Fix the update_player_last_season_points function to include proper WHERE clause

-- First, ensure the column exists
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS last_season_points NUMERIC DEFAULT 0;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS update_player_last_season_points(INTEGER);

-- Create the corrected function
CREATE OR REPLACE FUNCTION update_player_last_season_points(p_season INTEGER)
RETURNS TABLE (
  updated_count INTEGER,
  message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Update each player's last_season_points with their total from the specified season
  WITH season_totals AS (
    SELECT 
      ps.player_id,
      SUM(ps.fantasy_points) as total_points
    FROM player_stats ps
    WHERE ps.season = p_season
      AND ps.fantasy_points IS NOT NULL
    GROUP BY ps.player_id
  )
  UPDATE players p
  SET last_season_points = COALESCE(st.total_points, 0)
  FROM season_totals st
  WHERE p.id = st.player_id;
  
  -- Get the count of updated rows
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Also update players who didn't have any stats to 0
  UPDATE players
  SET last_season_points = 0
  WHERE id NOT IN (
    SELECT DISTINCT player_id 
    FROM player_stats 
    WHERE season = p_season
      AND fantasy_points IS NOT NULL
  )
  AND last_season_points IS NULL;
  
  -- Return the result
  RETURN QUERY
  SELECT 
    v_updated_count,
    format('Updated %s players with season %s points', v_updated_count, p_season);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_player_last_season_points(INTEGER) TO authenticated;

-- Add a comment to document the function
COMMENT ON FUNCTION update_player_last_season_points(INTEGER) IS 
'Updates the last_season_points column for all players based on their total fantasy points from the specified season. Used for draft rankings.';