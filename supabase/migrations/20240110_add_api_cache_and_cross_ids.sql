-- Migration: Add API cache, metrics, and cross-reference IDs
-- Author: System
-- Date: 2024-01-10

-- ==============================================
-- 1. API Cache Table
-- ==============================================
CREATE TABLE IF NOT EXISTS api_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT api_cache_key_check CHECK (char_length(key) > 0)
);

-- Index for efficient cache expiry queries
CREATE INDEX idx_api_cache_expires_at ON api_cache(expires_at);

-- Comments for documentation
COMMENT ON TABLE api_cache IS 'Cache for external API responses with TTL support';
COMMENT ON COLUMN api_cache.key IS 'Canonical hash of method+route+query params';
COMMENT ON COLUMN api_cache.value IS 'Cached JSON response from external API';
COMMENT ON COLUMN api_cache.expires_at IS 'Timestamp when cache entry expires';

-- ==============================================
-- 2. API Metrics Table (partitionable)
-- ==============================================
CREATE TABLE IF NOT EXISTS api_metrics (
  id BIGSERIAL,
  ts TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  endpoint TEXT NOT NULL,
  status INTEGER NOT NULL,
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms INTEGER,
  error TEXT,
  metadata JSONB,
  PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

-- Create initial partition for current month
CREATE TABLE IF NOT EXISTS api_metrics_2024_01 PARTITION OF api_metrics
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Index for efficient metric queries
CREATE INDEX idx_api_metrics_ts ON api_metrics(ts DESC);
CREATE INDEX idx_api_metrics_endpoint ON api_metrics(endpoint);
CREATE INDEX idx_api_metrics_status ON api_metrics(status);
CREATE INDEX idx_api_metrics_cache_hit ON api_metrics(cache_hit);

-- Comments for documentation
COMMENT ON TABLE api_metrics IS 'Observability metrics for API proxy operations';
COMMENT ON COLUMN api_metrics.ts IS 'Timestamp of the API call';
COMMENT ON COLUMN api_metrics.endpoint IS 'API endpoint path';
COMMENT ON COLUMN api_metrics.status IS 'HTTP status code returned';
COMMENT ON COLUMN api_metrics.cache_hit IS 'Whether response was served from cache';
COMMENT ON COLUMN api_metrics.latency_ms IS 'Response time in milliseconds';
COMMENT ON COLUMN api_metrics.error IS 'Error message if request failed';
COMMENT ON COLUMN api_metrics.metadata IS 'Additional context (user agent, region, etc)';

-- ==============================================
-- 3. Add Cross-Reference IDs to Players
-- ==============================================
ALTER TABLE players 
  ADD COLUMN IF NOT EXISTS gsis_id TEXT,
  ADD COLUMN IF NOT EXISTS sportradar_id TEXT,
  ADD COLUMN IF NOT EXISTS stats_id TEXT,
  ADD COLUMN IF NOT EXISTS espn_id TEXT,
  ADD COLUMN IF NOT EXISTS yahoo_id TEXT,
  ADD COLUMN IF NOT EXISTS rotowire_id TEXT,
  ADD COLUMN IF NOT EXISTS fantasypros_id TEXT,
  ADD COLUMN IF NOT EXISTS pfr_id TEXT,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Partial indexes for efficient lookups when IDs are present
CREATE INDEX IF NOT EXISTS idx_players_gsis_id 
  ON players(gsis_id) 
  WHERE gsis_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_sportradar_id 
  ON players(sportradar_id) 
  WHERE sportradar_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_stats_id 
  ON players(stats_id) 
  WHERE stats_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_espn_id 
  ON players(espn_id) 
  WHERE espn_id IS NOT NULL;

-- Comments for cross-reference columns
COMMENT ON COLUMN players.gsis_id IS 'NFL Game Statistics and Information System ID';
COMMENT ON COLUMN players.sportradar_id IS 'Sportradar unique player identifier';
COMMENT ON COLUMN players.stats_id IS 'Stats.com player identifier';
COMMENT ON COLUMN players.espn_id IS 'ESPN player identifier';
COMMENT ON COLUMN players.yahoo_id IS 'Yahoo Fantasy player identifier';
COMMENT ON COLUMN players.rotowire_id IS 'Rotowire player identifier';
COMMENT ON COLUMN players.fantasypros_id IS 'FantasyPros player identifier';
COMMENT ON COLUMN players.pfr_id IS 'Pro Football Reference player identifier';
COMMENT ON COLUMN players.last_sync_at IS 'Last time player data was synchronized';

-- ==============================================
-- 4. Row Level Security (RLS)
-- ==============================================

-- Enable RLS on new tables
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_metrics ENABLE ROW LEVEL SECURITY;

-- Create service role for Edge Functions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'edge_function_role'
  ) THEN
    CREATE ROLE edge_function_role;
  END IF;
END
$$;

-- Grant permissions to Edge Function role
GRANT ALL ON api_cache TO edge_function_role;
GRANT ALL ON api_metrics TO edge_function_role;
GRANT ALL ON SEQUENCE api_metrics_id_seq TO edge_function_role;

-- RLS Policies for api_cache
CREATE POLICY "Edge Functions can manage cache" ON api_cache
  FOR ALL
  TO edge_function_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage cache" ON api_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read cache" ON api_cache
  FOR SELECT
  TO authenticated
  USING (expires_at > NOW());

-- RLS Policies for api_metrics
CREATE POLICY "Edge Functions can write metrics" ON api_metrics
  FOR INSERT
  TO edge_function_role
  WITH CHECK (true);

CREATE POLICY "Service role can manage metrics" ON api_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated admins can read metrics" ON api_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'admin' OR users.role = 'super_admin')
    )
  );

-- ==============================================
-- 5. Helper Functions
-- ==============================================

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE (
  total_entries BIGINT,
  expired_entries BIGINT,
  active_entries BIGINT,
  total_size_mb NUMERIC,
  oldest_entry TIMESTAMPTZ,
  newest_entry TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_entries,
    COUNT(*) FILTER (WHERE expires_at < NOW())::BIGINT as expired_entries,
    COUNT(*) FILTER (WHERE expires_at >= NOW())::BIGINT as active_entries,
    ROUND(SUM(pg_column_size(value))::NUMERIC / 1048576, 2) as total_size_mb,
    MIN(created_at) as oldest_entry,
    MAX(created_at) as newest_entry
  FROM api_cache;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get API metrics summary
CREATE OR REPLACE FUNCTION get_api_metrics_summary(
  p_interval INTERVAL DEFAULT '5 minutes'
)
RETURNS TABLE (
  endpoint TEXT,
  total_requests BIGINT,
  cache_hits BIGINT,
  cache_hit_rate NUMERIC,
  avg_latency_ms NUMERIC,
  p95_latency_ms NUMERIC,
  error_count BIGINT,
  error_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.endpoint,
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE m.cache_hit = true)::BIGINT as cache_hits,
    ROUND(100.0 * COUNT(*) FILTER (WHERE m.cache_hit = true) / NULLIF(COUNT(*), 0), 2) as cache_hit_rate,
    ROUND(AVG(m.latency_ms)::NUMERIC, 2) as avg_latency_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.latency_ms)::NUMERIC, 2) as p95_latency_ms,
    COUNT(*) FILTER (WHERE m.status >= 400)::BIGINT as error_count,
    ROUND(100.0 * COUNT(*) FILTER (WHERE m.status >= 400) / NULLIF(COUNT(*), 0), 2) as error_rate
  FROM api_metrics m
  WHERE m.ts >= NOW() - p_interval
  GROUP BY m.endpoint
  ORDER BY total_requests DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create monthly partitions automatically
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  -- Calculate next month's dates
  start_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  end_date := start_date + INTERVAL '1 month';
  partition_name := 'api_metrics_' || TO_CHAR(start_date, 'YYYY_MM');
  
  -- Check if partition already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_class 
    WHERE relname = partition_name
  ) THEN
    -- Create the partition
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF api_metrics FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      start_date,
      end_date
    );
    
    RAISE NOTICE 'Created partition: %', partition_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule partition creation (requires pg_cron extension)
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('create-monthly-partition', '0 0 25 * *', 'SELECT create_monthly_partition()');

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION clean_expired_cache() TO edge_function_role;
GRANT EXECUTE ON FUNCTION get_cache_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_api_metrics_summary(INTERVAL) TO authenticated;
GRANT EXECUTE ON FUNCTION create_monthly_partition() TO service_role;

-- ==============================================
-- 6. Indexes for Performance
-- ==============================================

-- Composite index for cache key lookups with expiry check
CREATE INDEX idx_api_cache_key_expires 
  ON api_cache(key, expires_at);

-- Index for metrics aggregation queries
CREATE INDEX idx_api_metrics_endpoint_ts 
  ON api_metrics(endpoint, ts DESC);

-- Index for error tracking
CREATE INDEX idx_api_metrics_errors 
  ON api_metrics(ts DESC) 
  WHERE status >= 400;

-- ==============================================
-- 7. Initial Data & Configuration
-- ==============================================

-- Insert default cache entries for testing
INSERT INTO api_cache (key, value, expires_at)
VALUES 
  ('test:health', '{"status": "ok", "timestamp": "2024-01-10T00:00:00Z"}'::jsonb, NOW() + INTERVAL '1 hour')
ON CONFLICT (key) DO NOTHING;

-- ==============================================
-- 8. Rollback Script (save separately)
-- ==============================================
/*
-- To rollback this migration, run:

-- Drop policies
DROP POLICY IF EXISTS "Edge Functions can manage cache" ON api_cache;
DROP POLICY IF EXISTS "Service role can manage cache" ON api_cache;
DROP POLICY IF EXISTS "Authenticated users can read cache" ON api_cache;
DROP POLICY IF EXISTS "Edge Functions can write metrics" ON api_metrics;
DROP POLICY IF EXISTS "Service role can manage metrics" ON api_metrics;
DROP POLICY IF EXISTS "Authenticated admins can read metrics" ON api_metrics;

-- Drop functions
DROP FUNCTION IF EXISTS clean_expired_cache();
DROP FUNCTION IF EXISTS get_cache_stats();
DROP FUNCTION IF EXISTS get_api_metrics_summary(INTERVAL);
DROP FUNCTION IF EXISTS create_monthly_partition();

-- Drop indexes on players
DROP INDEX IF EXISTS idx_players_gsis_id;
DROP INDEX IF EXISTS idx_players_sportradar_id;
DROP INDEX IF EXISTS idx_players_stats_id;
DROP INDEX IF EXISTS idx_players_espn_id;

-- Remove columns from players
ALTER TABLE players 
  DROP COLUMN IF EXISTS gsis_id,
  DROP COLUMN IF EXISTS sportradar_id,
  DROP COLUMN IF EXISTS stats_id,
  DROP COLUMN IF EXISTS espn_id,
  DROP COLUMN IF EXISTS yahoo_id,
  DROP COLUMN IF EXISTS rotowire_id,
  DROP COLUMN IF EXISTS fantasypros_id,
  DROP COLUMN IF EXISTS pfr_id,
  DROP COLUMN IF EXISTS last_sync_at;

-- Drop tables
DROP TABLE IF EXISTS api_metrics;
DROP TABLE IF EXISTS api_cache;

-- Drop role
DROP ROLE IF EXISTS edge_function_role;
*/