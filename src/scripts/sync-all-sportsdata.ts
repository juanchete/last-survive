/**
 * Script to sync all data from SportsData.io
 * This performs a complete sync of teams, players, and projections
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tvzktsamnoiyjbayimvh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2emt0c2Ftbm9peWpiYXlpbXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTc2MzYsImV4cCI6MjA2MjMzMzYzNn0.Gcf1g2hLfUIFwO80mSxi34gbmCyZpu5L6qpH9ZCmqq0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function syncNFLTeams() {
  console.log('\n📋 Starting NFL Teams sync...');
  
  try {
    // Fetch teams directly from SportsData API
    const response = await fetch('https://api.sportsdata.io/v3/nfl/scores/json/Teams?key=a7fdf8e0c4914c15894d1cb3bb3c884a');
    
    if (!response.ok) {
      console.error('Error fetching teams:', response.status);
      return false;
    }
    
    const data = await response.json();
    
    if (!data || !Array.isArray(data)) {
      console.error('Invalid teams response');
      return false;
    }
    
    console.log(`Found ${data.length} NFL teams from SportsData`);
    
    // Map teams to our database format
    const teams = data.map((team: any) => ({
      abbreviation: team.Key || team.TeamID,
      name: team.Name || team.FullName,
      logo_url: team.WikipediaLogoUrl || team.LogoUrl || null
    }));
    
    // Insert teams into database
    const { error: insertError } = await supabase
      .from('nfl_teams')
      .upsert(teams, { 
        onConflict: 'abbreviation'
      });
    
    if (insertError) {
      console.error('Error inserting teams:', insertError);
      return false;
    }
    
    console.log(`✅ Successfully synced ${teams.length} NFL teams`);
    return true;
  } catch (err) {
    console.error('Error in syncNFLTeams:', err);
    return false;
  }
}

async function syncTeamDefenses() {
  console.log('\n🛡️ Starting Team Defenses sync...');
  
  try {
    // Get all NFL teams to create defense "players"
    const { data: nflTeams } = await supabase
      .from('nfl_teams')
      .select('id, abbreviation, name');
    
    if (!nflTeams || nflTeams.length === 0) {
      console.error('No NFL teams found. Please sync teams first.');
      return false;
    }
    
    // Create defense "players" for each team
    const defenses = nflTeams.map(team => ({
      name: `${team.name} Defense`,
      position: 'DEF',
      nfl_team_id: team.id,
      status: 'Healthy',
      years_exp: 0,
      photo_url: null,
      sportsdata_id: `DEF_${team.abbreviation}`, // Special ID for defenses
      age: null,
      height: null,
      weight: null,
      college: null,
      is_team_defense: true // Mark as team defense
    }));
    
    // Insert team defenses (without upsert since sportsdata_id is not unique)
    const { error: insertError } = await supabase
      .from('players')
      .insert(defenses);
    
    if (insertError) {
      console.error('Error inserting team defenses:', insertError);
      return false;
    }
    
    console.log(`✅ Successfully synced ${defenses.length} team defenses`);
    return true;
  } catch (err) {
    console.error('Error in syncTeamDefenses:', err);
    return false;
  }
}

async function syncPlayers() {
  console.log('\n👥 Starting Players sync...');
  
  try {
    // Fetch players directly from SportsData API
    const response = await fetch('https://api.sportsdata.io/v3/nfl/scores/json/PlayersByAvailable?key=a7fdf8e0c4914c15894d1cb3bb3c884a');
    
    if (!response.ok) {
      console.error('Error fetching players:', response.status);
      return false;
    }
    
    const data = await response.json();
    
    if (!data || !Array.isArray(data)) {
      console.error('Invalid players response');
      return false;
    }
    
    // Filter only active players
    const activePlayers = data.filter((p: any) => p.Status === 'Active');
    console.log(`Found ${activePlayers.length} active players from SportsData`);
    
    // Get NFL teams for mapping
    const { data: nflTeams } = await supabase
      .from('nfl_teams')
      .select('id, abbreviation');
    
    const teamMap = new Map(
      nflTeams?.map(t => [t.abbreviation, t.id]) || []
    );
    
    // Position mapping from SportsData to our database
    const positionMap: Record<string, string> = {
      // Offense
      'QB': 'QB',
      'RB': 'RB', 
      'FB': 'RB', // Fullback to RB
      'WR': 'WR',
      'TE': 'TE',
      'K': 'K',
      // ALL defensive positions map to DP (Defensive Player)
      'DE': 'DP', // Defensive End
      'DT': 'DP', // Defensive Tackle
      'NT': 'DP', // Nose Tackle
      'LB': 'DP', // Linebacker
      'ILB': 'DP', // Inside Linebacker
      'OLB': 'DP', // Outside Linebacker
      'MLB': 'DP', // Middle Linebacker
      'CB': 'DP', // Cornerback
      'SS': 'DP', // Strong Safety
      'FS': 'DP', // Free Safety
      'S': 'DP', // Safety
      'SAF': 'DP', // Safety
      'DB': 'DP', // Defensive Back
      'DL': 'DP', // Defensive Line
      'DEF': 'DEF', // Defense/Special Teams (this stays as DEF)
      // Offensive Line (not fantasy relevant, filter out)
      'OT': null,
      'OG': null,
      'C': null,
      'G': null,
      'T': null,
      'OL': null,
      // Special Teams
      'P': null, // Punter
      'LS': null, // Long Snapper
    };
    
    // Map and filter players to our database format
    const players = activePlayers
      .map((player: any) => {
        const mappedPosition = positionMap[player.Position] || positionMap[player.FantasyPosition] || null;
        
        // Skip players with unmapped positions (mostly offensive line)
        if (!mappedPosition) {
          return null;
        }
        
        return {
          name: player.Name,
          position: mappedPosition,
          nfl_team_id: teamMap.get(player.Team) || null,
          status: player.InjuryStatus || 'Healthy',
          years_exp: player.Experience || 0,
          photo_url: player.PhotoUrl || null,
          sportsdata_id: String(player.PlayerID),
          age: player.Age || null,
          height: player.Height || null,
          weight: player.Weight || null,
          college: player.College || null
        };
      })
      .filter(p => p !== null);
    
    // Insert players in batches
    const batchSize = 100;
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('players')
        .insert(batch);
      
      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
      } else {
        console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} players)`);
      }
    }
    
    console.log(`✅ Successfully synced ${players.length} players`);
    return true;
  } catch (err) {
    console.error('Error in syncPlayers:', err);
    return false;
  }
}

async function syncProjections(week: number = 1, season: number = 2025) {
  console.log(`\n📊 Starting Projections sync for ${season} Week ${week}...`);
  
  try {
    // Fetch projections directly from SportsData API
    const response = await fetch(`https://api.sportsdata.io/v3/nfl/projections/json/PlayerGameProjectionStatsByWeek/${season}REG/${week}?key=a7fdf8e0c4914c15894d1cb3bb3c884a`);
    
    if (!response.ok) {
      console.error('Error fetching projections:', response.status);
      return false;
    }
    
    const data = await response.json();
    
    if (!data || !Array.isArray(data)) {
      console.error('Invalid projections response');
      return false;
    }
    
    console.log(`Found ${data.length} projections from SportsData`);
    
    // Get all players with sportsdata_id
    const { data: players } = await supabase
      .from('players')
      .select('id, sportsdata_id')
      .not('sportsdata_id', 'is', null);
    
    if (!players || players.length === 0) {
      console.error('No players with sportsdata_id found');
      return false;
    }
    
    // Create mapping from sportsdata_id to player id
    const playerMap = new Map(
      players.map(p => [p.sportsdata_id, p.id])
    );
    
    console.log(`Mapping projections to ${playerMap.size} players`);
    
    // Map projections to our database format
    const projections = data
      .filter((proj: any) => proj.PlayerID && playerMap.has(String(proj.PlayerID)))
      .map((proj: any) => ({
        player_id: playerMap.get(String(proj.PlayerID)),
        week,
        season,
        // Projected stats
        projected_points: proj.FantasyPointsPPR || 0,
        projected_passing_yards: Math.round(proj.PassingYards || 0),
        projected_passing_td: Math.round(proj.PassingTouchdowns || 0),
        projected_rushing_yards: Math.round(proj.RushingYards || 0),
        projected_rushing_td: Math.round(proj.RushingTouchdowns || 0),
        projected_receptions: proj.Receptions || 0,
        projected_receiving_yards: Math.round(proj.ReceivingYards || 0),
        projected_receiving_td: Math.round(proj.ReceivingTouchdowns || 0),
        // Initialize actual stats to 0
        fantasy_points: 0,
        passing_yards: 0,
        passing_td: 0,
        interceptions: Math.round(proj.PassingInterceptions || 0),
        rushing_yards: 0,
        rushing_td: 0,
        receiving_yards: 0,
        receiving_td: 0,
        field_goals: 0,
        tackles: 0,
        sacks: 0,
        // Flags
        is_projection_updated: true,
        projection_last_updated: new Date().toISOString(),
        is_final: false
      }));
    
    console.log(`Mapped ${projections.length} projections to players`);
    
    if (projections.length === 0) {
      console.error('No projections mapped to players');
      return false;
    }
    
    // Insert projections
    const { error: insertError } = await supabase
      .from('player_stats')
      .upsert(projections, {
        onConflict: 'player_id,week,season'
      });
    
    if (insertError) {
      console.error('Error inserting projections:', insertError);
      return false;
    }
    
    console.log(`✅ Successfully synced ${projections.length} projections`);
    return true;
  } catch (err) {
    console.error('Error in syncProjections:', err);
    return false;
  }
}

async function verifySync() {
  console.log('\n🔍 Verifying sync...');
  
  try {
    // Count teams
    const { count: teamsCount } = await supabase
      .from('nfl_teams')
      .select('*', { count: 'exact', head: true });
    
    // Count players
    const { count: playersCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });
    
    // Count players with sportsdata_id
    const { count: playersWithId } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .not('sportsdata_id', 'is', null);
    
    // Count by position
    const { data: positionCounts } = await supabase
      .from('players')
      .select('position')
      .not('sportsdata_id', 'is', null);
    
    const positionBreakdown: Record<string, number> = {};
    if (positionCounts) {
      positionCounts.forEach((p: any) => {
        positionBreakdown[p.position] = (positionBreakdown[p.position] || 0) + 1;
      });
    }
    
    // Count projections
    const { count: projectionsCount } = await supabase
      .from('player_stats')
      .select('*', { count: 'exact', head: true })
      .gt('projected_points', 0);
    
    console.log('\n📊 Sync Summary:');
    console.log(`- NFL Teams: ${teamsCount}`);
    console.log(`- Total Players: ${playersCount}`);
    console.log(`- Players with SportsData ID: ${playersWithId}`);
    console.log(`- Projections: ${projectionsCount}`);
    
    console.log('\n📈 Players by Position:');
    Object.entries(positionBreakdown)
      .sort(([,a], [,b]) => b - a)
      .forEach(([pos, count]) => {
        console.log(`  ${pos}: ${count} players`);
      });
    
    return {
      teams: teamsCount,
      players: playersCount,
      playersWithId,
      projections: projectionsCount
    };
  } catch (err) {
    console.error('Error verifying sync:', err);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting comprehensive SportsData sync...');
  console.log('================================');
  
  // Step 1: Sync NFL Teams
  const teamsSuccess = await syncNFLTeams();
  if (!teamsSuccess) {
    console.error('❌ Failed to sync teams. Aborting.');
    process.exit(1);
  }
  
  // Step 2: Sync Players (including defensive players as DP)
  const playersSuccess = await syncPlayers();
  if (!playersSuccess) {
    console.error('❌ Failed to sync players. Aborting.');
    process.exit(1);
  }
  
  // Step 3: Sync Team Defenses
  const defensesSuccess = await syncTeamDefenses();
  if (!defensesSuccess) {
    console.error('❌ Failed to sync team defenses. Aborting.');
    process.exit(1);
  }
  
  // Step 4: Sync Projections for Week 1, 2025
  const projectionsSuccess = await syncProjections(1, 2025);
  if (!projectionsSuccess) {
    console.error('❌ Failed to sync projections. Aborting.');
    process.exit(1);
  }
  
  // Step 5: Verify everything
  const summary = await verifySync();
  
  console.log('\n================================');
  console.log('✅ Sync completed successfully!');
  
  if (summary && summary.projections && summary.projections < 500) {
    console.log('\n⚠️ Warning: Less than 500 projections were synced.');
    console.log('This might indicate a player mapping issue.');
  }
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});