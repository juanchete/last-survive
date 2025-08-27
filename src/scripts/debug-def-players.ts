/**
 * Script to debug why only 2 DEF players appear in draft
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tvzktsamnoiyjbayimvh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2emt0c2Ftbm9peWpiYXlpbXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTc2MzYsImV4cCI6MjA2MjMzMzYzNn0.Gcf1g2hLfUIFwO80mSxi34gbmCyZpu5L6qpH9ZCmqq0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugDefPlayers() {
  console.log('🔍 Debugging DEF players issue...\n');
  
  // 1. Try the exact query from useAvailablePlayers
  console.log('1️⃣ Testing the exact query from useAvailablePlayers...');
  const { data: players, error: playersError, count } = await supabase
    .from("players")
    .select("id, name, position, nfl_team_id, photo_url, last_season_points", { count: 'exact' });
  
  if (playersError) {
    console.error('Error:', playersError);
    return;
  }
  
  console.log(`Total players fetched: ${players?.length}`);
  console.log(`Total count: ${count}`);
  
  // Filter DEF players
  const defPlayers = players?.filter(p => p.position === 'DEF') || [];
  console.log(`DEF players found: ${defPlayers.length}`);
  
  if (defPlayers.length > 0) {
    console.log('DEF players:', defPlayers.map(p => p.name).join(', '));
  }
  
  // 2. Check if there's a default limit
  console.log('\n2️⃣ Testing with explicit no limit...');
  const { data: allPlayers, error: allError } = await supabase
    .from("players")
    .select("id, name, position")
    .eq("position", "DEF");
  
  if (!allError) {
    console.log(`DEF players with direct query: ${allPlayers?.length}`);
    if (allPlayers) {
      console.log('All DEF names:', allPlayers.map(p => p.name).sort().join(', '));
    }
  }
  
  // 3. Check with range
  console.log('\n3️⃣ Testing with range to ensure we get all...');
  const { data: rangeData, error: rangeError } = await supabase
    .from("players")
    .select("id, name, position")
    .range(0, 5000);
  
  if (!rangeError) {
    const rangeDef = rangeData?.filter(p => p.position === 'DEF') || [];
    console.log(`DEF players with range(0,5000): ${rangeDef.length}`);
  }
  
  // 4. Check the actual league data
  const leagueId = '198e1368-2b3c-41e4-9e08-3693e607e003';
  console.log(`\n4️⃣ Checking for league ${leagueId}...`);
  
  // Get NFL teams
  const { data: nflTeams, error: teamsError } = await supabase
    .from("nfl_teams")
    .select("id, name, abbreviation, eliminated");
  
  if (teamsError) {
    console.error('Teams error:', teamsError);
    return;
  }
  
  const teamMap = new Map(nflTeams.map((t) => [t.id, t]));
  
  // Get rosters for week 1
  const { data: rosters, error: rostersError } = await supabase
    .from("team_rosters")
    .select("player_id, fantasy_team:fantasy_teams(league_id)")
    .eq("week", 1);
  
  if (rostersError) {
    console.error('Rosters error:', rostersError);
    return;
  }
  
  const draftedIds = new Set(
    rosters
      ?.filter((r) => r.fantasy_team?.league_id === leagueId)
      .map((r) => r.player_id)
  );
  
  console.log(`Drafted players in league: ${draftedIds.size}`);
  
  // Process all players like the hook does
  const availablePlayers = players?.map((player) => {
    const nflTeam = teamMap.get(player.nfl_team_id);
    return {
      id: String(player.id),
      name: player.name,
      position: player.position,
      team: nflTeam?.abbreviation || "",
      available: !draftedIds.has(player.id),
      eliminated: nflTeam?.eliminated || false,
      points: player.last_season_points || 0,
      photo: player.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=1a1a1a&color=fff`,
    };
  })
  .filter((p) => p.available) || [];
  
  const availableDef = availablePlayers.filter(p => p.position === 'DEF');
  console.log(`Available DEF players: ${availableDef.length}`);
  if (availableDef.length > 0) {
    console.log('Available DEF:', availableDef.map(p => `${p.name} (${p.team})`).join(', '));
  }
  
  // 5. Check if it's a pagination issue
  console.log('\n5️⃣ Checking Supabase default limits...');
  console.log('Note: Supabase by default returns 1000 rows unless specified otherwise');
  
  if (players && players.length === 1000) {
    console.log('⚠️ WARNING: Exactly 1000 players returned - likely hitting default limit!');
  }
}

// Run the debug
debugDefPlayers().then(() => {
  console.log('\n✅ Debug complete!');
}).catch(error => {
  console.error('Script failed:', error);
});