-- Add sleeper_id column to players table for API integration
ALTER TABLE players ADD COLUMN sleeper_id TEXT UNIQUE;

-- Add index for sleeper_id lookups
CREATE INDEX idx_players_sleeper_id ON players(sleeper_id);

-- Add comment to explain the column
COMMENT ON COLUMN players.sleeper_id IS 'Sleeper API player ID for syncing data';

-- Create function to sync player stats from external API
CREATE OR REPLACE FUNCTION sync_weekly_stats_from_api(
  p_season INTEGER,
  p_week INTEGER
) RETURNS JSON AS $$
DECLARE
  result JSON;
  stats_count INTEGER := 0;
BEGIN
  -- This function will be called by the application layer
  -- after fetching data from Sleeper API
  
  -- For now, just return a placeholder
  result := json_build_object(
    'success', true,
    'message', 'API sync function ready',
    'season', p_season,
    'week', p_week,
    'count', stats_count
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION sync_weekly_stats_from_api(INTEGER, INTEGER) TO authenticated;

-- Add comment
COMMENT ON FUNCTION sync_weekly_stats_from_api(INTEGER, INTEGER) IS 'Placeholder function for weekly stats sync from external API';