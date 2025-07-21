 🧪 Complete Testing Workflow Guide

  Phase 1: League Creation & Setup

  1. Create a League
  🌐 Navigate to: http://localhost:8080/create-league
  - Fill in league details (name, description, entry fee)
  - Set owner_plays = true (so you participate as a player)
  - Set max members (e.g., 4 for quick testing)
  - Create private league (generates invite code)

  2. Join Additional Users
  🌐 Navigate to: http://localhost:8080/browse-leagues
  - Either manually create 3 more user accounts, OR
  - Use the invite code to join with test accounts
  - Each user should get auto-assigned a fantasy team

  3. Verify Setup
  🌐 Navigate to:
  http://localhost:8080/standings?league=[league-id]
  - Should see 4 active teams with 0 points
  - All teams should show as "not eliminated"

  Phase 2: Data Population (Sleeper API)

  4. Sync Data via Admin Panel
  🌐 Navigate to: http://localhost:8080/admin → API Sleeper tab
  Execute in this order:
  1. Sync NFL Teams (should get ~32 teams)
  2. Sync Fantasy Players (should get ~1,500 active players)
  3. Clean Duplicate Players (fix any duplicates)
  4. Sync Weekly Stats for 2024 Week 1 (get real fantasy
  points)

  Phase 3: Draft Simulation

  5. Start the Draft
  🌐 Navigate to:
  http://localhost:8080/draft?league=[league-id]
  As league owner:
  - Click "Start Draft Now"
  - Verify draft order is randomized
  - Draft players for each team (or use auto-draft)
  - Each team needs: 1 QB, 2 RB, 2 WR, 1 TE, 1 K, 1 DEF

  6. Verify Draft Results
  🌐 Navigate to:
  http://localhost:8080/standings?league=[league-id]
  - Each team should have 8 players
  - Player names should be visible
  - Teams still show 0 points (no stats yet)

  Phase 4: Weekly Scoring & Elimination

  7. Process Week 1 Scores
  🌐 Navigate to:
  http://localhost:8080/elimination-control?league=[league-id]
  As league owner:
  - Should see weekly scores calculated from Sleeper data
  - Click "Process Weekly Elimination"
  - Lowest scoring team should be eliminated

  8. Verify Elimination Results
  🌐 Navigate to:
  http://localhost:8080/standings?league=[league-id]
  - Should see 3 active teams, 1 eliminated
  - Eliminated team should show "Eliminated Week 1"
  - Rankings should be updated based on points

  Phase 5: Waiver Wire Testing

  9. Test Waiver System
  🌐 Navigate to:
  http://localhost:8080/waivers?league=[league-id]
  - Eliminated team's players should be in waiver pool
  - Submit waiver claims as active teams
  - Test waiver priority (reverse standings order)

  Phase 6: Multi-Week Simulation

  10. Continue Weekly Process
  Repeat for Week 2-3:
  1. Sync Week 2 stats via Admin → API Sleeper
  2. Process Week 2 elimination
  3. Verify another team eliminated
  4. Check final standings

  11. Final Testing
  🌐 Navigate to:
  http://localhost:8080/standings?league=[league-id]
  Final state should show:
  - 1 surviving team (winner)
  - 3 eliminated teams with different elimination weeks
  - Complete points history
  - Correct rankings

  🛠️ Testing Shortcuts & Tools

  Quick Test Data Setup

  -- Run these in Supabase SQL Editor for faster testing
  SELECT simulate_elimination_for_testing('your-league-id');
  SELECT setup_realistic_test_rosters('your-league-id');

  Admin Testing Tools

  🌐 League Manager Dashboard:
  http://localhost:8080/manager/[league-id]
  - Edit player points manually
  - Recalculate team scores
  - View detailed team rosters
  - Test admin actions

  Key Testing URLs

  📋 Full Testing Checklist:

  1. Create League: /create-league
  2. Browse/Join: /browse-leagues
  3. Draft: /draft?league=[id]
  4. Admin Panel: /admin (API Sleeper tab)
  5. Standings: /standings?league=[id]
  6. Elimination: /elimination-control?league=[id]
  7. Waivers: /waivers?league=[id]
  8. Trades: /trades?league=[id]
  9. Manager Dashboard: /manager/[league-id]

  🎯 Expected Results per Phase

  After League Creation: 4 teams, 0 points each
  After Data Sync: Players populated, real NFL data available
  After Draft: Each team has 8 players assigned
  After Week 1: 1 team eliminated, scores calculated
  After Week 2: 2 teams eliminated
  After Week 3: 1 winner remains

  🚨 Common Issues to Watch For

  1. Draft Timer: May timeout too quickly in testing
  2. Player Stats: Ensure you sync the correct week's data
  3. Elimination Logic: Verify only active teams can be
  eliminated
  4. Waiver Priority: Should follow reverse standings order
  5. Permissions: Some actions require league owner privileges

  This testing workflow will validate the entire application
  flow from league creation to determining a winner!