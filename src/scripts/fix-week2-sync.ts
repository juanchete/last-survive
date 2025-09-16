#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rwxyaofgjcrrneeqlyho.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3eHlhb2ZnamNycm5lZXFseWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MzA4MDUsImV4cCI6MjA1MDEwNjgwNX0.p-bvz_Cz0VJ7bQ3Y75E0YPE48PiKfvMQQ9oCTgJCjoU";

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const SPORTSDATA_API_KEY = 'f1826e4060774e56a6f56bae1d9eb76e';

async function fixWeek2Sync() {
  console.log('🔍 Analyzing sync problems for Week 2...');

  try {
    // 1. Get ALL players in rosters for Week 2
    const { data: rosterData, error: rosterError } = await supabase
      .from('team_rosters')
      .select('player_id')
      .eq('week', 2)
      .eq('is_active', true);

    if (rosterError) {
      console.error('❌ Roster query error:', rosterError);
      return;
    }

    if (!rosterData?.length) {
      console.log('❌ No roster found for Week 2');
      return;
    }

    const playerIds = rosterData.map(r => r.player_id);
    console.log(`🔍 Found ${playerIds.length} roster entries`);

    const { data: rosterPlayers } = await supabase
      .from('players')
      .select('id, name, sportsdata_id, position')
      .in('id', playerIds)
      .neq('position', 'DEF');

    if (!rosterPlayers?.length) {
      console.log('❌ No roster players found for Week 2');
      return;
    }

    const allPlayerIds = rosterPlayers.map(r => r.id);
    console.log(`📋 Found ${allPlayerIds.length} players in active rosters`);

    // 2. Check which players have stats
    const { data: existingStats } = await supabase
      .from('player_stats')
      .select('player_id, fantasy_points')
      .eq('week', 2)
      .eq('season', 2025)
      .in('player_id', allPlayerIds);

    const playersWithStats = new Set(existingStats?.map(s => s.player_id) || []);
    const playersWithZeroPoints = existingStats?.filter(s => s.fantasy_points === 0).map(s => s.player_id) || [];

    console.log(`✅ Players with stats: ${playersWithStats.size}`);
    console.log(`⚠️  Players with 0 points: ${playersWithZeroPoints.length}`);
    console.log(`❌ Players missing stats: ${allPlayerIds.length - playersWithStats.size}`);

    // 3. Fetch ALL Week 2 stats from SportsData API
    console.log('🌐 Fetching complete Week 2 data from SportsData API...');

    const response = await fetch(
      `https://api.sportsdata.io/v3/nfl/stats/json/FantasyGameStatsByWeek/2025REG/2?key=${SPORTSDATA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`SportsData API error: ${response.status}`);
    }

    const apiStats = await response.json();
    console.log(`📊 API returned ${apiStats.length} player records`);

    // 4. Create mapping
    const playerMap = new Map();
    rosterPlayers.forEach(player => {
      if (player.sportsdata_id) {
        playerMap.set(player.sportsdata_id, {
          id: player.id,
          name: player.name,
          position: player.position
        });
      }
    });

    // 5. Process API data and find mismatches
    const missingInAPI = [];
    const foundInAPI = [];
    const needsUpdate = [];

    // Check each roster player against API
    for (const [sportsDataId, playerInfo] of playerMap.entries()) {
      const apiRecord = apiStats.find(stat => String(stat.PlayerID) === sportsDataId);

      if (!apiRecord) {
        missingInAPI.push(playerInfo);
      } else {
        const hasStatsInDB = playersWithStats.has(playerInfo.id);
        const currentPoints = existingStats?.find(s => s.player_id === playerInfo.id)?.fantasy_points || 0;
        const apiPoints = apiRecord.FantasyPointsPPR || apiRecord.FantasyPoints || 0;

        foundInAPI.push({
          ...playerInfo,
          apiPoints,
          dbPoints: currentPoints,
          needsUpdate: !hasStatsInDB || Math.abs(currentPoints - apiPoints) > 0.01
        });

        if (!hasStatsInDB || Math.abs(currentPoints - apiPoints) > 0.01) {
          needsUpdate.push({
            player_id: playerInfo.id,
            name: playerInfo.name,
            sportsdata_id: sportsDataId,
            week: 2,
            season: 2025,
            fantasy_points: apiPoints,
            actual_points: apiPoints,
            passing_yards: apiRecord.PassingYards || 0,
            passing_td: apiRecord.PassingTouchdowns || 0,
            rushing_yards: apiRecord.RushingYards || 0,
            rushing_td: apiRecord.RushingTouchdowns || 0,
            receiving_yards: apiRecord.ReceivingYards || 0,
            receiving_td: apiRecord.ReceivingTouchdowns || 0,
            field_goals: apiRecord.FieldGoalsMade || 0,
            is_final: true
          });
        }
      }
    }

    console.log('🔍 Analysis Results:');
    console.log(`  📊 Found in API: ${foundInAPI.length}`);
    console.log(`  ❌ Missing from API: ${missingInAPI.length}`);
    console.log(`  🔄 Need updates: ${needsUpdate.length}`);

    if (missingInAPI.length > 0) {
      console.log('⚠️  Players missing from API (likely didn\'t play):');
      missingInAPI.forEach(p => console.log(`    - ${p.name} (${p.position})`));
    }

    if (needsUpdate.length > 0) {
      console.log(`\n📝 Updating ${needsUpdate.length} player stats...`);

      // Remove player_id and name before upsert
      const statsToUpdate = needsUpdate.map(({ player_id, name, sportsdata_id, ...stats }) => ({
        player_id,
        ...stats
      }));

      const { error } = await supabase
        .from('player_stats')
        .upsert(statsToUpdate, {
          onConflict: 'player_id,week,season'
        });

      if (error) {
        console.error('❌ Error updating stats:', error);
        throw error;
      }

      // Update team totals
      console.log('🔄 Recalculating team totals...');
      await supabase.rpc('update_fantasy_team_points_improved');

      console.log('✅ Sync completed successfully!');

      // Show some key updates
      const keyUpdates = needsUpdate
        .filter(p => p.fantasy_points > 5)
        .sort((a, b) => b.fantasy_points - a.fantasy_points)
        .slice(0, 10);

      if (keyUpdates.length > 0) {
        console.log('\n🌟 Key player updates:');
        keyUpdates.forEach(p => {
          console.log(`  - ${p.name}: ${p.fantasy_points} points`);
        });
      }
    } else {
      console.log('✅ All stats are already up to date!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the fix
fixWeek2Sync();