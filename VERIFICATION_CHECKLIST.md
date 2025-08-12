# Sleeper API Integration Verification Checklist

## 🔍 Complete System Verification Guide

This checklist will help you verify that the new Sleeper API Edge Function integration is working correctly.

## 1. Edge Function Health Check ✅

### Quick Test
```bash
# Test the health endpoint
curl https://tvzktsamnoiyjbayimvh.supabase.co/functions/v1/sleeper-proxy/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-10T...",
  "metrics": {
    "requests_last_5m": 0,
    "cache_hit_rate": "0%",
    "error_rate": "0%",
    "avg_latency_ms": 0
  }
}
```

## 2. Frontend Application Tests 🖥️

### A. Start the Application
```bash
npm run dev
```
Then open: http://localhost:8080

### B. Navigate to Admin Panel
1. Login with admin credentials
2. Go to **Admin Panel** → **Sleeper API Control**
3. You should see:
   - ✅ NFL State showing current week/season
   - ✅ Provider status showing "Healthy"
   - ✅ Cache status showing "Active"

### C. Test Data Sync Functions
In the Sleeper API Control panel:

1. **Test NFL Teams Sync:**
   - Click "Sincronizar Equipos NFL"
   - Should show success message with team count
   - Check database: `SELECT COUNT(*) FROM nfl_teams;` (should be 32)

2. **Test Players Sync:**
   - Click "Sincronizar Jugadores Fantasy Activos"
   - Should sync ~1,500 players
   - Check database: `SELECT COUNT(*) FROM players WHERE sleeper_id IS NOT NULL;`

3. **Test Weekly Stats Sync:**
   - Set Season: 2024, Week: 1
   - Click "Sincronizar Estadísticas"
   - Should show success with stats count

## 3. Cache Verification 📦

### Test Cache is Working
```sql
-- Run in Supabase SQL Editor
-- Check cache entries
SELECT 
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries
FROM api_cache;

-- Check cache hit rate
SELECT 
  endpoint,
  COUNT(*) as total_requests,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cache_hit = true) / COUNT(*), 2) as hit_rate
FROM api_metrics
WHERE ts >= NOW() - INTERVAL '1 hour'
GROUP BY endpoint;
```

**Expected:** After syncing data twice, you should see >50% cache hit rate

## 4. Performance Tests ⚡

### A. Response Time Test
```bash
# First request (cache miss)
time curl -s https://tvzktsamnoiyjbayimvh.supabase.co/functions/v1/sleeper-proxy/state > /dev/null

# Second request (cache hit - should be much faster)
time curl -s https://tvzktsamnoiyjbayimvh.supabase.co/functions/v1/sleeper-proxy/state > /dev/null
```

**Expected:**
- First request: 200-500ms
- Second request: <50ms

### B. Large Dataset Test
```bash
# Test players endpoint (large dataset)
time curl -s https://tvzktsamnoiyjbayimvh.supabase.co/functions/v1/sleeper-proxy/players | wc -c
```

**Expected:** Should return >1MB of data in <2 seconds

## 5. Error Handling Tests 🛡️

### A. Invalid Parameters
```bash
# Test with invalid parameters
curl "https://tvzktsamnoiyjbayimvh.supabase.co/functions/v1/sleeper-proxy/stats?season=invalid&week=abc"
```

**Expected:** Should return 400 error with clear message

### B. Circuit Breaker Test (Optional)
To test circuit breaker, you would need to simulate failures. The circuit opens after 5 consecutive failures.

## 6. Backward Compatibility Test 🔄

### Check Old Code Still Works
1. Open any component using the old hooks
2. Verify data loads correctly
3. Check console for any deprecation warnings (dev mode only)

The old imports should still work:
```typescript
// Both should work
import { useSleeperNFLState } from '@/hooks/useSleeperAPI'  // Old
import { useNFLState } from '@/hooks/useNFLDataAPI'        // New
```

## 7. Database Verification 🗄️

### Check All Tables Created
```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('api_cache', 'api_metrics');

-- Check player cross-reference IDs
SELECT 
  COUNT(*) FILTER (WHERE sleeper_id IS NOT NULL) as with_sleeper_id,
  COUNT(*) FILTER (WHERE gsis_id IS NOT NULL) as with_gsis_id,
  COUNT(*) FILTER (WHERE espn_id IS NOT NULL) as with_espn_id
FROM players;
```

## 8. Automated Tests 🧪

### Run Unit Tests
```bash
# Run all new tests
npm test -- --testNamePattern="(FantasyProvider|SleeperProvider|useNFLDataAPI)"

# Run with coverage
npm test -- --coverage --testNamePattern="(FantasyProvider|SleeperProvider|useNFLDataAPI)"
```

**Expected:** All tests should pass

## 9. Monitoring & Observability 📊

### Check Metrics Dashboard
```sql
-- Overall system health
SELECT 
  COUNT(*) as total_requests,
  AVG(latency_ms) as avg_latency,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency,
  COUNT(*) FILTER (WHERE status >= 400) as errors
FROM api_metrics
WHERE ts >= NOW() - INTERVAL '1 hour';

-- Per endpoint performance
SELECT 
  endpoint,
  COUNT(*) as requests,
  AVG(latency_ms)::INT as avg_ms,
  MAX(latency_ms) as max_ms,
  COUNT(*) FILTER (WHERE cache_hit) as cache_hits
FROM api_metrics
WHERE ts >= NOW() - INTERVAL '1 hour'
GROUP BY endpoint
ORDER BY requests DESC;
```

## 10. Production Readiness Checklist ✈️

- [ ] **Edge Function Deployed**: `npx supabase functions deploy sleeper-proxy`
- [ ] **Migrations Applied**: `npx supabase db push`
- [ ] **Environment Variables Set**: Check Supabase dashboard
- [ ] **CORS Configured**: Verify ALLOWED_ORIGINS includes your domain
- [ ] **Cache Working**: Verify >50% hit rate after initial sync
- [ ] **No Console Errors**: Check browser console
- [ ] **Tests Passing**: All unit tests green
- [ ] **Performance Acceptable**: <50ms for cached, <500ms for uncached
- [ ] **Error Handling**: Graceful failures with clear messages
- [ ] **Monitoring Active**: Metrics being collected

## 🎯 Quick Verification Script

Run the automated verification:
```bash
./scripts/verify-sleeper-integration.sh
```

## ⚠️ Common Issues & Solutions

### Issue: "Missing authorization header"
**Solution:** Make sure you're logged in to the app

### Issue: Cache not working
**Solution:** Check RLS policies are applied:
```sql
SELECT * FROM pg_policies WHERE tablename = 'api_cache';
```

### Issue: Slow responses
**Solution:** Check circuit breaker state:
```bash
curl https://tvzktsamnoiyjbayimvh.supabase.co/functions/v1/sleeper-proxy/health | jq '.circuit_breakers'
```

### Issue: No data syncing
**Solution:** Check Edge Function logs in Supabase dashboard

## ✅ Success Criteria

Your system is working properly if:

1. ✅ Health endpoint returns "healthy"
2. ✅ Admin panel shows provider as "Healthy"
3. ✅ Can sync players/teams/stats without errors
4. ✅ Cache hit rate >50% after second sync
5. ✅ Response times <50ms for cached data
6. ✅ All automated tests pass
7. ✅ No console errors in browser
8. ✅ Old code still works (backward compatibility)
9. ✅ Metrics are being collected
10. ✅ Circuit breakers are in "closed" state

## 📞 Need Help?

If any test fails:
1. Check Edge Function logs in Supabase dashboard
2. Review browser console for errors
3. Check database connection
4. Verify environment variables are set correctly
5. Review the architecture documentation