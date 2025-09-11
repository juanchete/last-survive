# Production Deployment Checklist - Weekly Points Reset System

## ✅ Database Changes Applied
- [x] Added `weekly_points` column to `fantasy_teams` table
- [x] Added `last_week_reset_at` column to track reset timestamps
- [x] Created `reset_weekly_points()` function
- [x] Created `update_team_weekly_points()` function for real-time updates
- [x] Created `league_standings_weekly` view for weekly/season rankings
- [x] Created `process_live_scoring_update()` trigger for automatic updates

## ✅ Edge Function Deployed
- [x] `weekly-points-reset` Edge Function created and active
- [x] Can be called manually or via cron job
- [x] Logs resets to `admin_actions` table

## ✅ Frontend Updates
- [x] Standings page shows weekly points during game week
- [x] Team Battle page displays weekly points
- [x] Real-time updates via `useWeeklyPoints` hook
- [x] Automatic refresh every 30 seconds during games

## 🔧 Production Setup Required

### 1. Schedule the Weekly Reset (Tuesday 3 AM)
You need to set up a cron job to call the Edge Function. Options:

#### Option A: Supabase Cron (Recommended)
```sql
-- Run this in Supabase SQL Editor
SELECT cron.schedule(
  'weekly-points-reset',
  '0 3 * * 2', -- Every Tuesday at 3 AM
  $$
  SELECT reset_weekly_points();
  $$
);
```

#### Option B: External Cron Service
Use a service like Vercel Cron, Railway, or GitHub Actions to call:
```
POST https://[your-project].supabase.co/functions/v1/weekly-points-reset
Headers:
  Authorization: Bearer [your-service-role-key]
```

### 2. Test the System
```bash
# Test the weekly reset manually
npm run test-weekly-reset

# Monitor the logs
npx supabase functions logs weekly-points-reset
```

### 3. Monitor Performance
- Check Supabase dashboard for function executions
- Monitor `admin_actions` table for reset logs
- Verify real-time updates during Thursday games

## 📊 What Happens Each Week

### Tuesday 3 AM (Reset)
1. All `weekly_points` set to 0
2. `last_week_reset_at` updated
3. Action logged to `admin_actions`
4. Standings show projected points

### Thursday 8 PM - Monday (Game Week)
1. Real-time points accumulate in `weekly_points`
2. Standings sort by weekly points
3. Live updates as games progress
4. Elimination based on lowest weekly points

### Tuesday - Thursday 8 PM (Non-Game Week)
1. Standings show projected points
2. Teams prepare for next week
3. Waiver processing happens

## ⚠️ Important Notes

### Data Preservation
- `points` column (total season points) is NEVER reset
- All historical data preserved in `player_stats`
- Weekly performance tracked via `week_number`

### Error Handling
- Edge Function has try/catch blocks
- Logs errors to console
- Returns appropriate HTTP status codes

### Monitoring
- Check `admin_actions` table for reset confirmations
- Monitor Supabase logs for errors
- Verify weekly_points update during games

## 🚀 Deployment Steps

1. **Deploy database changes** (already done)
2. **Set up cron job** for Tuesday 3 AM reset
3. **Test manually** with `npm run test-weekly-reset`
4. **Monitor first automatic reset** next Tuesday
5. **Verify real-time updates** during Thursday games

## 📞 Support

If issues arise:
1. Check Supabase logs for Edge Function errors
2. Verify `admin_actions` table for reset logs
3. Run manual reset if automatic fails: `npm run test-weekly-reset`
4. Check `league_standings_weekly` view for data

## ✅ Final Verification

Before going live:
- [ ] Cron job scheduled for Tuesday 3 AM
- [ ] Manual test successful
- [ ] Real-time updates working
- [ ] Error handling tested
- [ ] Monitoring in place

The system is ready for production once the cron job is configured!