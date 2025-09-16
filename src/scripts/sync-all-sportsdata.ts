/**
 * Script to sync all data from SportsData.io
 * This performs a complete sync of teams, players, and projections
 */

import { createClient } from '@supabase/supabase-js';
import { providerManager } from '../lib/providers/ProviderManager';

const supabaseUrl = 'https://tvzktsamnoiyjbayimvh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2emt0c2Ftbm9peWpiYXlpbXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTc2MzYsImV4cCI6MjA2MjMzMzYzNn0.Gcf1g2hLfUIFwO80mSxi34gbmCyZpu5L6qpH9ZCmqq0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function syncNFLTeams() {
  console.log('\n📋 Starting NFL Teams sync...');
  
  try {
    // Fetch teams directly from SportsData API
    const response = await fetch('https://api.sportsdata.io/v3/nfl/scores/json/Teams?key=f1826e4060774e56a6f56bae1d9eb76e');
    
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
    
    // Deduplicate defenses using sportsdata_id
    const defensesMap = new Map();
    defenses.forEach(defense => {
      defensesMap.set(defense.sportsdata_id, defense);
    });
    const deduplicatedDefenses = Array.from(defensesMap.values());
    
    // Upsert team defenses to avoid duplicates
    const { error: insertError } = await supabase
      .from('players')
      .upsert(deduplicatedDefenses, { 
        onConflict: 'sportsdata_id',
        ignoreDuplicates: false
      });
    
    if (insertError) {
      console.error('Error inserting team defenses:', insertError);
      return false;
    }
    
    console.log(`✅ Successfully synced ${deduplicatedDefenses.length}/${defenses.length} team defenses after deduplication`);
    return true;
  } catch (err) {
    console.error('Error in syncTeamDefenses:', err);
    return false;
  }
}

async function syncPlayers() {
  console.log('\n👥 Starting Players sync...');
  
  try {
    // Fetch players directly from SportsData API (basic player data)
    const response = await fetch('https://api.sportsdata.io/v3/nfl/scores/json/Players?key=f1826e4060774e56a6f56bae1d9eb76e');
    
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
        
        // Get team ID
        const nflTeamId = teamMap.get(player.Team) || null;
        
        // Skip players without a valid NFL team (free agents, etc.)
        if (!nflTeamId && player.Team && player.Team !== '') {
          console.log(`⚠️ Skipping player ${player.Name} - unknown team: ${player.Team}`);
          return null;
        }
        
        // Skip players with no team at all
        if (!player.Team || player.Team === '' || player.Team === 'FA') {
          console.log(`⚠️ Skipping free agent: ${player.Name}`);
          return null;
        }
        
        return {
          name: player.Name,
          position: mappedPosition,
          nfl_team_id: nflTeamId,
          status: player.Status || 'Active',
          years_exp: player.Experience || 0,
          photo_url: player.PhotoUrl || null,
          sportsdata_id: String(player.PlayerID),
          age: player.Age || null,
          height: player.Height || null,
          weight: player.Weight || null,
          college: player.College || null
          // ADP data will be updated separately via syncADP()
        };
      })
      .filter(p => p !== null);
    
    // Insert players in batches
    const batchSize = 100;
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      
      // Deduplicate within the batch using sportsdata_id
      const batchMap = new Map();
      batch.forEach(player => {
        batchMap.set(player.sportsdata_id, player);
      });
      const deduplicatedBatch = Array.from(batchMap.values());
      
      const { error: insertError } = await supabase
        .from('players')
        .upsert(deduplicatedBatch, { 
          onConflict: 'sportsdata_id',
          ignoreDuplicates: false
        });
      
      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
      } else {
        console.log(`Inserted batch ${i / batchSize + 1} (${deduplicatedBatch.length}/${batch.length} players after deduplication)`);
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
    const response = await fetch(`https://api.sportsdata.io/v3/nfl/projections/json/PlayerGameProjectionStatsByWeek/${season}REG/${week}?key=f1826e4060774e56a6f56bae1d9eb76e`);
    
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

async function syncADP() {
  console.log('\n📈 Starting ADP sync...');
  
  try {
    // Use the fantasy-players endpoint for ADP data
    const { sportsDataProvider } = await import('../lib/providers/SportsDataProvider');
    console.log('Fetching ADP data via edge function...');
    const playersData = await sportsDataProvider.fetchFromEdgeFunction('/fantasy-players');
    console.log('Received players data:', playersData?.length || 'No data');
    
    if (!playersData || !Array.isArray(playersData)) {
      console.error('Invalid players data response');
      return false;
    }
    
    // Filter players that have ADP data - FantasyPlayers should all have ADP data
    const playersWithADP = playersData.filter((player: any) => 
      player.PlayerID && player.Name && (
        player.AverageDraftPosition || 
        player.AverageDraftPositionPPR || 
        player.AverageDraftPosition2QB ||
        player.AverageDraftPositionRookie ||
        player.AverageDraftPositionDynasty
      )
    );
    
    console.log(`Found ${playersWithADP.length} players with ADP data out of ${playersData.length} total players`);
    
    if (playersWithADP.length === 0) {
      console.warn('No players found with ADP data');
      return false;
    }
    
    // Update players with ADP data in batches
    const batchSize = 50;
    let updatedCount = 0;
    
    for (let i = 0; i < playersWithADP.length; i += batchSize) {
      const batch = playersWithADP.slice(i, i + batchSize);
      
      for (const player of batch) {
        // FantasyPlayers endpoint might use different field names
        if (!player.Team || player.Team === null || player.Team === "") continue;
        
        const updateData: any = {};
        
        // Only save AverageDraftPosition and ProjectedFantasyPoints as requested
        if (player.AverageDraftPosition) updateData.adp_standard = player.AverageDraftPosition;
        if (player.ProjectedFantasyPoints) updateData.last_season_points = player.ProjectedFantasyPoints;
        
        // Skip if no ADP data to update
        if (Object.keys(updateData).length === 0) continue;
        
        const { error } = await supabase
          .from('players')
          .update(updateData)
          .eq('sportsdata_id', String(player.PlayerID));
          
        if (!error) {
          updatedCount++;
        } else {
          console.log(`Failed to update player ${player.Name} (${player.PlayerID}):`, error);
        }
      }
      
      console.log(`Updated ADP batch ${i / batchSize + 1}/${Math.ceil(playersWithADP.length / batchSize)}`);
    }
    
    console.log(`✅ Successfully updated ADP for ${updatedCount} players`);
    return updatedCount > 0;
  } catch (err) {
    console.error('Error in syncADP:', err);
    return false;
  }
}

async function syncStats(week: number = 1, season: number = 2025) {
  console.log(`\n📊 Starting Stats sync for ${season} Week ${week}...`);

  try {
    // Fetch stats directly from SportsData API
    const response = await fetch(`https://api.sportsdata.io/v3/nfl/stats/json/FantasyGameStatsByWeek/${season}REG/${week}?key=f1826e4060774e56a6f56bae1d9eb76e`);

    if (!response.ok) {
      console.error('Error fetching stats:', response.status);
      return false;
    }

    const data = await response.json();

    if (!data || !Array.isArray(data)) {
      console.error('Invalid stats response');
      return false;
    }

    console.log(`Found ${data.length} stat records from SportsData`);

    // Get all players with sportsdata_id
    const { data: players } = await supabase
      .from('players')
      .select('id, sportsdata_id');

    if (!players) {
      console.error('No players found in database');
      return false;
    }

    // Create mapping from sportsdata_id to database id
    const playerMap = new Map(
      players.map(p => [p.sportsdata_id, p.id])
    );

    // Map stats to our database format
    const stats = data
      .map((stat: any) => {
        const playerId = playerMap.get(String(stat.PlayerID));
        if (!playerId) return null;

        return {
          player_id: playerId,
          week: week,
          season: season,
          fantasy_points: stat.FantasyPointsPPR || stat.FantasyPoints || 0,
          actual_points: stat.FantasyPointsPPR || stat.FantasyPoints || 0,
          passing_yards: stat.PassingYards || 0,
          passing_td: stat.PassingTouchdowns || 0,
          rushing_yards: stat.RushingYards || 0,
          rushing_td: stat.RushingTouchdowns || 0,
          receiving_yards: stat.ReceivingYards || 0,
          receiving_td: stat.ReceivingTouchdowns || 0,
          field_goals: stat.FieldGoalsMade || 0,
          tackles: stat.Tackles || 0,
          sacks: stat.Sacks || 0,
          interceptions: stat.Interceptions || 0,
          is_final: true
        };
      })
      .filter(s => s !== null);

    // Insert stats in batches
    const batchSize = 100;
    for (let i = 0; i < stats.length; i += batchSize) {
      const batch = stats.slice(i, i + batchSize);

      const { error: insertError } = await supabase
        .from('player_stats')
        .upsert(batch, {
          onConflict: 'player_id,week,season'
        });

      if (insertError) {
        console.error(`Error inserting stats batch ${i / batchSize + 1}:`, insertError);
      } else {
        console.log(`Inserted stats batch ${i / batchSize + 1} (${batch.length} records)`);
      }
    }

    console.log(`✅ Successfully synced ${stats.length} stat records`);
    return true;
  } catch (err) {
    console.error('Error in syncStats:', err);
    return false;
  }
}

async function syncDefenseStats(week: number = 1, season: number = 2025) {
  console.log(`\n🛡️ Starting Defense Stats sync for ${season} Week ${week}...`);

  try {
    // Fetch defense stats from SportsData API
    const response = await fetch(`https://api.sportsdata.io/v3/nfl/stats/json/FantasyDefenseByGame/${season}REG/${week}?key=f1826e4060774e56a6f56bae1d9eb76e`);

    if (!response.ok) {
      console.error('Error fetching defense stats:', response.status);
      return false;
    }

    const data = await response.json();

    if (!data || !Array.isArray(data)) {
      console.error('Invalid defense stats response');
      return false;
    }

    console.log(`Found ${data.length} defense records from SportsData`);

    // Get all defense players
    const { data: defensePlayers } = await supabase
      .from('players')
      .select(`
        id,
        name,
        nfl_teams!inner (abbreviation)
      `)
      .eq('position', 'DEF');

    if (!defensePlayers || defensePlayers.length === 0) {
      console.error('No defense players found in database');
      return false;
    }

    // Create lookup map from team abbreviation to defense player
    const defensePlayerMap = new Map();
    defensePlayers.forEach((player: any) => {
      const teamAbbr = player.nfl_teams?.abbreviation;
      if (teamAbbr) {
        defensePlayerMap.set(teamAbbr, player);
      }
    });

    // Create lookup map from API data
    const defenseStatsMap = new Map();
    data.forEach((team: any) => {
      defenseStatsMap.set(team.Team, team);
    });

    console.log(`Mapping defense stats to ${defensePlayerMap.size} defense players`);

    // Map defense stats to our database format
    const defenseStats = [];
    for (const [teamAbbr, player] of defensePlayerMap.entries()) {
      const teamStats = defenseStatsMap.get(teamAbbr);

      if (teamStats) {
        const fantasyPoints = teamStats.FantasyPointsDraftKings || 0;
        console.log(`📈 ${player.name} (${teamAbbr}): ${fantasyPoints} points`);

        defenseStats.push({
          player_id: player.id,
          week: week,
          season: season,
          fantasy_points: fantasyPoints,
          actual_points: fantasyPoints,
          // Defense-specific stats (if available in API)
          tackles: teamStats.Tackles || 0,
          sacks: teamStats.Sacks || 0,
          interceptions: teamStats.Interceptions || 0,
          // Initialize other stats to 0 for defenses
          passing_yards: 0,
          passing_td: 0,
          rushing_yards: 0,
          rushing_td: 0,
          receiving_yards: 0,
          receiving_td: 0,
          field_goals: 0,
          is_final: true
        });
      } else {
        console.warn(`⚠️ No stats found for ${player.name} (${teamAbbr})`);
      }
    }

    if (defenseStats.length === 0) {
      console.warn('No defense stats mapped to players');
      return false;
    }

    // Insert defense stats
    const { error: insertError } = await supabase
      .from('player_stats')
      .upsert(defenseStats, {
        onConflict: 'player_id,week,season'
      });

    if (insertError) {
      console.error('Error inserting defense stats:', insertError);
      return false;
    }

    console.log(`✅ Successfully synced ${defenseStats.length} defense stat records`);
    return true;
  } catch (err) {
    console.error('Error in syncDefenseStats:', err);
    return false;
  }
}

async function syncAllStats(week: number = 1, season: number = 2025) {
  console.log(`\n📊 Starting complete stats sync (players + defenses) for ${season} Week ${week}...`);

  // Step 1: Sync regular player stats
  const statsSuccess = await syncStats(week, season);
  if (!statsSuccess) {
    console.error('❌ Failed to sync player stats');
    return false;
  }

  // Step 2: Sync defense stats
  const defenseSuccess = await syncDefenseStats(week, season);
  if (!defenseSuccess) {
    console.error('❌ Failed to sync defense stats');
    return false;
  }

  console.log(`✅ Successfully synced all stats for Week ${week}`);
  return true;
}

// Function specifically for weekly stats updates (for Edge Functions)
async function syncWeeklyStats(week: number, season: number = 2025) {
  console.log(`\n⚡ Starting weekly stats update for ${season} Week ${week}...`);

  try {
    const success = await syncAllStats(week, season);
    if (success) {
      console.log(`⚡ Weekly stats sync completed successfully for Week ${week}`);
      return { success: true, message: `Successfully synced stats for Week ${week}` };
    } else {
      const errorMsg = `Failed to sync stats for Week ${week}`;
      console.error(`❌ ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    const errorMsg = `Error syncing weekly stats: ${error}`;
    console.error(`❌ ${errorMsg}`);
    return { success: false, error: errorMsg };
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
  
  // Step 4: Sync ADP (Average Draft Position) data
  const adpSuccess = await syncADP();
  if (!adpSuccess) {
    console.error('❌ Failed to sync ADP data. Continuing anyway...');
    // Don't abort, ADP is nice to have but not critical
  }
  
  // Step 5: Sync Projections for Week 1, 2025
  const projectionsSuccess = await syncProjections(1, 2025);
  if (!projectionsSuccess) {
    console.error('❌ Failed to sync projections. Aborting.');
    process.exit(1);
  }
  
  // Step 6: Verify everything
  const summary = await verifySync();
  
  console.log('\n================================');
  console.log('✅ Sync completed successfully!');
  
  if (summary && summary.projections && summary.projections < 500) {
    console.log('\n⚠️ Warning: Less than 500 projections were synced.');
    console.log('This might indicate a player mapping issue.');
  }
}

// Export functions for use in UI components
export { syncNFLTeams, syncPlayers, syncTeamDefenses, syncProjections, syncStats, syncDefenseStats, syncAllStats, syncWeeklyStats, syncADP, verifySync };

// Run the script only if called directly (not when imported)
if (typeof window === 'undefined') {
  main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}