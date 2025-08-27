-- Script to clean all data and start fresh
-- WARNING: This will delete ALL data!

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Delete in order to avoid foreign key violations
DELETE FROM roster_moves;
DELETE FROM waiver_requests;
DELETE FROM waiver_priority;
DELETE FROM team_rosters;
DELETE FROM player_stats;
DELETE FROM draft_picks;
DELETE FROM trade_offers;
DELETE FROM trade_items;
DELETE FROM league_invitations;
DELETE FROM league_members;
DELETE FROM fantasy_teams;
DELETE FROM leagues;
DELETE FROM players;
DELETE FROM nfl_teams;
DELETE FROM weeks;
DELETE FROM notifications;
DELETE FROM admin_actions;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset sequences if needed
-- ALTER SEQUENCE players_id_seq RESTART WITH 1;
-- ALTER SEQUENCE leagues_id_seq RESTART WITH 1;
-- ALTER SEQUENCE fantasy_teams_id_seq RESTART WITH 1;

-- Verify deletion
SELECT 
    'Players' as table_name, COUNT(*) as count FROM players
UNION ALL
SELECT 'Teams', COUNT(*) FROM nfl_teams
UNION ALL
SELECT 'Leagues', COUNT(*) FROM leagues
UNION ALL
SELECT 'Fantasy Teams', COUNT(*) FROM fantasy_teams
UNION ALL
SELECT 'Player Stats', COUNT(*) FROM player_stats;