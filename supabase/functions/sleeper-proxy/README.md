# Sleeper Proxy Edge Function

## Overview

This Edge Function acts as a proxy between the frontend application and the Sleeper API, providing caching, retry logic, circuit breakers, and observability.

## Features

- **Caching**: PostgreSQL-based cache with configurable TTL per endpoint
- **Circuit Breakers**: Prevents cascading failures when API is down
- **Retry Logic**: Exponential backoff with jitter for transient failures
- **Metrics**: Tracks request count, cache hit rate, latency, and errors
- **CORS Support**: Configurable allowed origins
- **Health Checks**: Monitoring endpoint for system health

## Endpoints

### GET /sleeper-proxy/state
Get current NFL state including week, season, and season type.

**Cache TTL**: 5 minutes

**Response**:
```json
{
  "week": 10,
  "season_type": "regular",
  "season": "2024",
  "previous_season": "2023",
  "display_week": 10
}
```

### GET /sleeper-proxy/players
Get all NFL players with metadata.

**Cache TTL**: 24 hours

**Response**:
```json
{
  "player_id": {
    "first_name": "Patrick",
    "last_name": "Mahomes",
    "position": "QB",
    "team": "KC",
    "active": true,
    // ... additional fields
  }
}
```

### GET /sleeper-proxy/stats
Get weekly statistics for all players.

**Parameters**:
- `season` (required): Year (e.g., "2024")
- `week` (required): Week number (1-18)
- `season_type` (optional): "pre", "regular", or "post" (default: "regular")

**Cache TTL**: 30 minutes

**Response**:
```json
{
  "player_id": {
    "pts_ppr": 25.5,
    "pass_yd": 300,
    "pass_td": 2,
    // ... additional stats
  }
}
```

### GET /sleeper-proxy/projections
Get weekly projections for all players.

**Parameters**:
- `season` (required): Year
- `week` (required): Week number
- `season_type` (optional): Season type

**Cache TTL**: 30 minutes

### GET /sleeper-proxy/health
Health check and metrics endpoint.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-10T12:00:00Z",
  "metrics": {
    "requests_last_5m": 100,
    "cache_hit_rate": "75%",
    "error_rate": "0.5%",
    "avg_latency_ms": 45
  },
  "circuit_breakers": {
    "/players": {
      "state": "closed",
      "failures": 0
    }
  }
}
```

## Configuration

### Environment Variables

- `SLEEPER_BASE_URL`: Base URL for Sleeper API (default: `https://api.sleeper.app`)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

### TTL Configuration

```typescript
const TTL_CONFIG = {
  '/state': 300,        // 5 minutes
  '/players': 86400,    // 24 hours
  '/stats': 1800,       // 30 minutes
  '/projections': 1800, // 30 minutes
}
```

### Circuit Breaker Settings

```typescript
const CIRCUIT_BREAKER_THRESHOLD = 5        // Failures before opening
const CIRCUIT_BREAKER_TIMEOUT = 60000      // 60 seconds recovery
const CIRCUIT_BREAKER_SUCCESS_THRESHOLD = 3 // Successes to close
```

## Database Schema

### api_cache Table

Stores cached API responses with TTL support.

```sql
CREATE TABLE api_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### api_metrics Table

Stores API metrics for observability.

```sql
CREATE TABLE api_metrics (
  id BIGSERIAL,
  ts TIMESTAMPTZ DEFAULT NOW(),
  endpoint TEXT NOT NULL,
  status INTEGER NOT NULL,
  cache_hit BOOLEAN DEFAULT FALSE,
  latency_ms INTEGER,
  error TEXT,
  metadata JSONB,
  PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);
```

## Development

### Local Testing

1. Start Supabase locally:
```bash
npx supabase start
```

2. Deploy the function locally:
```bash
npx supabase functions serve sleeper-proxy
```

3. Test with curl:
```bash
curl http://localhost:54321/functions/v1/sleeper-proxy/health
```

### Deployment

Deploy to production:
```bash
npx supabase functions deploy sleeper-proxy
```

## Monitoring

### Cache Performance

Monitor cache hit rate to ensure optimal performance:

```sql
SELECT 
  endpoint,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cache_hit = true) / COUNT(*), 2) as hit_rate
FROM api_metrics
WHERE ts >= NOW() - INTERVAL '1 hour'
GROUP BY endpoint;
```

### Error Tracking

Monitor errors by endpoint:

```sql
SELECT 
  endpoint,
  COUNT(*) as error_count,
  array_agg(DISTINCT error) as error_messages
FROM api_metrics
WHERE status >= 400
  AND ts >= NOW() - INTERVAL '1 hour'
GROUP BY endpoint;
```

### Latency Analysis

Analyze response times:

```sql
SELECT 
  endpoint,
  AVG(latency_ms) as avg_latency,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency,
  MAX(latency_ms) as max_latency
FROM api_metrics
WHERE ts >= NOW() - INTERVAL '1 hour'
GROUP BY endpoint;
```

## Error Handling

### Circuit Breaker States

- **Closed**: Normal operation, requests pass through
- **Open**: Too many failures, requests are rejected immediately
- **Half-Open**: Testing recovery, limited requests allowed

### Retry Strategy

Exponential backoff with jitter:

```typescript
delay = min(1000 * 2^attempt + random(0, 1000), 30000)
```

### Error Responses

All errors return JSON with appropriate HTTP status codes:

```json
{
  "error": "Error message",
  "details": "Additional context if available"
}
```

## Security

### Authentication

Requires Supabase authentication token in Authorization header:

```
Authorization: Bearer <supabase_access_token>
```

### CORS

Only configured origins are allowed to access the function.

### Rate Limiting

Respects Sleeper API rate limits (1000 requests/minute).

## Troubleshooting

### Cache Not Working

1. Check database connection
2. Verify RLS policies
3. Check cache key generation

### Circuit Breaker Open

1. Check Sleeper API status
2. Review error logs
3. Wait for timeout period

### High Latency

1. Check cache hit rate
2. Monitor Sleeper API response times
3. Review database performance