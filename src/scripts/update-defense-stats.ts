/**
 * Script to manually update defense stats for the OG LEAGUE
 * This will test the defense integration and update the database
 */

import { supabase } from "@/integrations/supabase/client";

// Manually fetch from SportsData API
async function fetchDefenseStats(week: number = 2) {
  const API_KEY = 'f1826e4060774e56a6f56bae1d9eb76e';

  try {
    // Use the correct FantasyDefenseByGame endpoint
    const url = `https://api.sportsdata.io/v3/nfl/stats/json/FantasyDefenseByGame/2025REG/${week}?key=${API_KEY}`;
    console.log('🔗 Fetching from:', url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📊 Received ${data.length} defense records for week ${week}`);

    return data;
  } catch (error) {
    console.error('❌ Failed to fetch defense stats:', error);
    return null;
  }
}

async function updateDefenseStats(week: number = 2) {
  console.log(`🏈 Updating Defense Stats for OG LEAGUE - Week ${week}...\n`);

  // 1. Fetch defense stats from API
  const defenseData = await fetchDefenseStats(week);
  if (!defenseData) {
    console.log('❌ No defense data received');
    return;
  }
  
  // Create lookup map
  const defenseMap = new Map();
  defenseData.forEach((team: any) => {
    defenseMap.set(team.Team, team);
  });
  
  // 2. Get all defense players from OG LEAGUE
  const { data: defensePlayers, error: playersError } = await supabase
    .from('team_rosters')
    .select(`
      fantasy_team_id,
      week,
      player_id,
      players!inner (
        id,
        name,
        position,
        nfl_teams (abbreviation)
      )
    `)
    .eq('week', week)
    .eq('players.position', 'DEF')
    .in('fantasy_team_id', [
      '08a1b542-4cd0-4d49-b22c-72b8311b34be',
      '2574eb9d-02f4-4f28-aeb1-37d590c7733c', 
      '28a86952-ae40-4c30-bb0d-381207fcddfc',
      '3ae33f8d-40b1-419b-8748-be98e4a86f7b',
      '5c24b7a9-eb89-40c6-972f-794c101904e4',
      '5c4b1d4f-7b02-4153-8f56-1f27741630df',
      '6900428b-27f4-438c-8350-344497284c21',
      '72ff0e98-565f-44c0-ad3b-150a9cd3e2bd',
      'a31a9119-5948-41c9-92b2-4bd49b5c2c10',
      'b790bdaf-9994-4438-bbca-30494455849b',
      'f15b5227-77b6-4595-a144-1beb09bd8b6a'
    ]);
  
  if (playersError) {
    console.error('❌ Failed to fetch defense players:', playersError);
    return;
  }
  
  console.log(`🔍 Found ${defensePlayers?.length || 0} defense players to update`);
  
  // 3. Update each defense player's stats
  const updates = [];
  
  for (const roster of defensePlayers || []) {
    const player = roster.players as any;
    const teamAbbr = player.nfl_teams?.abbreviation;
    const defenseStats = defenseMap.get(teamAbbr);
    
    if (defenseStats) {
      const fantasyPoints = defenseStats.FantasyPointsDraftKings;
      console.log(`📈 ${player.name} (${teamAbbr}): ${fantasyPoints} points`);
      
      updates.push({
        player_id: player.id,
        season: 2025,
        week: week,
        fantasy_points: fantasyPoints
      });
    } else {
      console.warn(`⚠️  No stats found for ${player.name} (${teamAbbr})`);
    }
  }
  
  // 4. Bulk update player_stats
  if (updates.length > 0) {
    console.log(`\n💾 Updating ${updates.length} defense stats...`);
    
    const { error: updateError } = await supabase
      .from('player_stats')
      .upsert(updates);
    
    if (updateError) {
      console.error('❌ Failed to update stats:', updateError);
    } else {
      console.log('✅ Defense stats updated successfully!');
      
      // Verify updates
      const { data: verification } = await supabase
        .from('player_stats')
        .select('player_id, fantasy_points')
        .eq('week', week)
        .eq('season', 2025)
        .in('player_id', updates.map(u => u.player_id));
      
      console.log('\n🔍 Verification:');
      verification?.forEach(stat => {
        const update = updates.find(u => u.player_id === stat.player_id);
        console.log(`  Player ${stat.player_id}: ${stat.fantasy_points} points`);
      });
    }
  }
  
  console.log('\n🎉 Defense stats update complete!');
}

// Export for use
export { updateDefenseStats };

// Run if executed directly
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  updateDefenseStats();
}