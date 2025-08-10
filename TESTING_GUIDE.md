# Last Survive - Testing Guide for Stakeholders

## 🧪 Complete Testing Guide

This guide helps stakeholders test all features of Last Survive, especially during the off-season when live NFL data isn't available.

## Quick Start Testing

### 1. Access Testing Dashboard

1. Login with admin credentials
2. Navigate to `/admin`
3. Click "Testing Dashboard" button
4. Enable "Simulation Mode"
5. Select the league you want to test from the dropdown

### 2. Create Test League

In Testing Dashboard > Test Data tab:
1. Set league name (e.g., "Test Championship 2023")
2. Choose 8 teams (recommended for quick testing)
3. Select "Pre-simulate 4 weeks" to start mid-season
4. Click "Create Test League with Mock Draft"

### 3. Simulate Season Progress

In Testing Dashboard > Season Simulation tab:
1. Make sure you have selected a league from the dropdown
2. Use "Advance Week" to progress one week at a time
3. Use "Simulate 4 Weeks" for quick progression
4. Use "Complete Season" to test end-game scenarios
5. Each simulation action only affects the selected league

## Feature Testing Checklist

### ✅ User Management
- [ ] User registration with email verification
- [ ] Login/logout functionality
- [ ] Password reset flow
- [ ] Profile updates
- [ ] Admin user privileges

### ✅ League Management
- [ ] Create new league
- [ ] Set league rules and scoring
- [ ] Send/accept invitations
- [ ] League settings modification
- [ ] Commissioner tools

### ✅ Draft System
- [ ] Join draft lobby
- [ ] Make manual picks
- [ ] Auto-draft functionality
- [ ] 60-second timer enforcement
- [ ] Draft order (snake format)
- [ ] Post-draft roster review

### ✅ Weekly Gameplay
- [ ] Set starting lineup
- [ ] Bench players
- [ ] View player projections
- [ ] Check injury status
- [ ] Submit lineup before deadline

### ✅ Scoring & Elimination
- [ ] Weekly scoring calculation
- [ ] Lowest team elimination
- [ ] Tiebreaker rules
- [ ] Elimination notifications
- [ ] Standings updates

### ✅ Transactions
- [ ] Submit waiver claims
- [ ] Waiver priority order
- [ ] Free agent pickups
- [ ] Drop players
- [ ] Trade proposals
- [ ] Trade review/veto

### ✅ Communication
- [ ] League announcements
- [ ] Trade chat
- [ ] Email notifications
- [ ] In-app alerts

## Test Scenarios

### Scenario 1: Complete Season Simulation
**Goal**: Test full season from draft to champion

1. Create 8-team league
2. Complete draft (use auto-draft for speed)
3. Advance through Week 1
4. Check elimination occurred
5. Continue advancing weeks
6. Verify final champion when 1 team remains

**Expected Results**:
- One team eliminated each week
- Standings update correctly
- Champion declared at end

### Scenario 2: Draft Night Pressure Test
**Goal**: Test draft under time pressure

1. Create 12-team league
2. Start draft with multiple browser tabs
3. Let some picks timeout
4. Make some manual picks
5. Complete entire draft

**Expected Results**:
- Auto-draft activates on timeout
- No system crashes
- All rosters filled correctly

### Scenario 3: Trading System Test
**Goal**: Verify trade functionality

1. Use existing league with rosters
2. Propose player-for-player trade
3. Accept from other team
4. Propose and cancel trade
5. Test trade deadline enforcement

**Expected Results**:
- Trades process correctly
- Rosters update immediately
- Trade history maintained

### Scenario 4: Waiver Wire Test
**Goal**: Test waiver priority system

1. Advance to Tuesday (waiver day)
2. Submit multiple waiver claims
3. Check waiver priority order
4. Process waivers
5. Verify roster changes

**Expected Results**:
- Priority order respected
- Failed claims handled properly
- Notifications sent

### Scenario 5: Elimination Edge Cases
**Goal**: Test tiebreaker scenarios

1. Manually set two teams to same score
2. Process weekly elimination
3. Verify tiebreaker logic

**Expected Results**:
- Correct team eliminated
- Tiebreaker reason shown
- Database consistency maintained

## Performance Testing

### Load Testing
1. Create league with 12 teams
2. Simulate concurrent user actions:
   - Multiple roster updates
   - Simultaneous trade offers
   - Concurrent page loads

### Mobile Testing
1. Access on mobile device
2. Test all major functions:
   - Draft participation
   - Lineup management
   - Trade proposals
   - Navigation

### Browser Compatibility
Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Admin Panel Testing

### User Management
- [ ] View all users
- [ ] Ban/unban users
- [ ] Verify users
- [ ] Reset user data
- [ ] View user activity

### League Oversight
- [ ] View all leagues
- [ ] Access league details
- [ ] Resolve disputes
- [ ] Delete leagues

### Player Data Management
- [ ] Edit player information
- [ ] Update player stats
- [ ] Manage roster assignments

### System Monitoring
- [ ] Check error logs
- [ ] View performance metrics
- [ ] Database health
- [ ] Active user count

## Known Testing Limitations

### Off-Season Testing
- Player stats are simulated, not real
- No live scoring updates
- Mock injury reports

### Workarounds
- Use Testing Dashboard for time control
- Manually trigger events
- Simulate various scenarios

## Troubleshooting Test Issues

### Common Problems

**League won't create**
- Check user permissions
- Verify database connection
- Clear browser cache

**Draft won't start**
- Ensure all teams joined
- Check draft time settings
- Verify browser compatibility

**Eliminations not processing**
- Check week advancement
- Verify scoring calculations
- Review database triggers

**Trades failing**
- Confirm both rosters valid
- Check trade deadline
- Verify player availability

## Test Data Cleanup

After testing:
1. Go to Testing Dashboard
2. Use "Reset Season" to clear data
3. Or delete test leagues individually
4. Clear test notifications

## Reporting Issues

When reporting bugs:
1. Note exact steps to reproduce
2. Include browser/device info
3. Copy any error messages
4. Take screenshots
5. Check browser console for errors

### Issue Template
```
**Description**: [What happened]
**Expected**: [What should happen]
**Steps to Reproduce**:
1. [First step]
2. [Second step]
**Environment**:
- Browser: [Chrome/Firefox/etc]
- Device: [Desktop/Mobile]
- User Role: [Admin/User]
**Screenshots**: [Attach if applicable]
```

## Success Criteria

The application is ready when:
- [ ] All test scenarios pass
- [ ] No critical bugs remain
- [ ] Performance is acceptable
- [ ] Mobile experience is smooth
- [ ] Admin tools function properly
- [ ] Error handling works correctly
- [ ] Data integrity maintained

## Contact

For testing support:
- Technical Issues: dev@lastsurvive.com
- Feature Questions: product@lastsurvive.com
- General Support: support@lastsurvive.com