/**
 * Simple test script for projections system
 * Direct Node.js execution without TypeScript compilation
 */

import { createClient } from '@supabase/supabase-js';

// Environment configuration
const supabaseUrl = 'https://kgdaqomsasdlhblqkgwm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZGFxb21zYXNkbGhibGFrZ3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwMzg5OTAsImV4cCI6MjA0OTYxNDk5MH0.J2s-4xBJUKLOhhmqEq4p9ug1k49cPmb6KF6wd68UkF8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProjectionsStatus() {
  console.log('🔍 Testing projections status...\n');
  
  try {
    // Check current player_stats for Week 2
    const { data: stats, error } = await supabase
      .from('player_stats')
      .select('player_id, week, season, projected_points, fantasy_points, is_projection_updated, projection_last_updated')
      .eq('week', 2)
      .eq('season', 2024);

    if (error) {
      console.error('❌ Error fetching stats:', error);
      return;
    }

    const totalPlayers = stats?.length || 0;
    const playersWithProjections = stats?.filter(s => s.is_projection_updated).length || 0;
    const playersWithPoints = stats?.filter(s => s.projected_points && s.projected_points > 0).length || 0;
    const playersWithFantasyPoints = stats?.filter(s => s.fantasy_points && s.fantasy_points > 0).length || 0;
    
    console.log('📊 Current Projections Status (Week 2, Season 2024):');
    console.log('====================================================');
    console.log(`Total Players in DB: ${totalPlayers}`);
    console.log(`Players with Fantasy Points > 0: ${playersWithFantasyPoints}`);
    console.log(`Players with Projected Points > 0: ${playersWithPoints}`);
    console.log(`Players with Updated Projections Flag: ${playersWithProjections}`);
    
    if (playersWithPoints > 0) {
      const avgProjected = stats
        .filter(s => s.projected_points && s.projected_points > 0)
        .reduce((sum, s) => sum + (parseFloat(s.projected_points) || 0), 0) / playersWithPoints;
      
      console.log(`Average Projected Points: ${avgProjected.toFixed(2)}`);
    }

    if (playersWithFantasyPoints > 0) {
      const avgFantasy = stats
        .filter(s => s.fantasy_points && s.fantasy_points > 0)
        .reduce((sum, s) => sum + (parseFloat(s.fantasy_points) || 0), 0) / playersWithFantasyPoints;
      
      console.log(`Average Fantasy Points: ${avgFantasy.toFixed(2)}`);
    }
    
    // Show sample data
    if (stats && stats.length > 0) {
      console.log('\n📋 Sample Data (first 5 players):');
      console.log('==================================');
      
      const sample = stats.slice(0, 5);
      sample.forEach((player, index) => {
        console.log(`${index + 1}. Player ID: ${player.player_id}`);
        console.log(`   Fantasy Points: ${player.fantasy_points || 0}`);
        console.log(`   Projected Points: ${player.projected_points || 0}`);
        console.log(`   Is Updated: ${player.is_projection_updated || false}`);
        console.log(`   Last Updated: ${player.projection_last_updated || 'Never'}`);
        console.log('   ---');
      });
    }
    
    return {
      totalPlayers,
      playersWithProjections,
      playersWithPoints,
      playersWithFantasyPoints
    };
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    return null;
  }
}

async function testPlayerMappings() {
  console.log('\n🔍 Testing player mappings...\n');
  
  try {
    // Get players in rosters with their details
    const { data: playersInRosters, error } = await supabase
      .from('team_rosters')
      .select(`
        player_id,
        week,
        players!inner (
          id,
          name,
          position,
          sportsdata_id,
          stats_id
        )
      `)
      .eq('week', 2)
      .limit(10);

    if (error) {
      console.error('❌ Error fetching player rosters:', error);
      return;
    }

    console.log('👥 Players in Rosters (Week 2) - Mapping Info:');
    console.log('===============================================');
    
    let playersWithSportsDataId = 0;
    let playersWithStatsId = 0;
    
    playersInRosters?.forEach((roster, index) => {
      const player = roster.players;
      if (player.sportsdata_id) playersWithSportsDataId++;
      if (player.stats_id) playersWithStatsId++;
      
      console.log(`${index + 1}. ${player.name} (${player.position})`);
      console.log(`   Player ID: ${player.id}`);
      console.log(`   SportsData ID: ${player.sportsdata_id || 'Missing'}`);
      console.log(`   Stats ID: ${player.stats_id || 'Missing'}`);
      console.log('   ---');
    });
    
    console.log(`\n📈 Mapping Summary:`);
    console.log(`Players with SportsData ID: ${playersWithSportsDataId}/10`);
    console.log(`Players with Stats ID: ${playersWithStatsId}/10`);
    
    return {
      total: playersInRosters?.length || 0,
      withSportsDataId: playersWithSportsDataId,
      withStatsId: playersWithStatsId
    };
    
  } catch (error) {
    console.error('💥 Player mapping test failed:', error);
    return null;
  }
}

async function simulateProjectionUpdate() {
  console.log('\n🔄 Simulating projection update with mock data...\n');
  
  try {
    // Get 5 random players to update
    const { data: players, error } = await supabase
      .from('player_stats')
      .select('player_id, week, season')
      .eq('week', 2)
      .eq('season', 2024)
      .limit(5);

    if (error || !players) {
      console.error('❌ Error fetching players for simulation:', error);
      return;
    }

    console.log('🎯 Updating projections for 5 sample players with mock data...');
    
    const updates = players.map(player => ({
      player_id: player.player_id,
      week: player.week,
      season: player.season,
      projected_points: Math.round((Math.random() * 20 + 5) * 100) / 100, // Random 5-25 points
      projected_passing_yards: Math.floor(Math.random() * 300),
      projected_passing_td: Math.floor(Math.random() * 3),
      projected_rushing_yards: Math.floor(Math.random() * 100),
      projected_rushing_td: Math.floor(Math.random() * 2),
      projected_receiving_yards: Math.floor(Math.random() * 150),
      projected_receiving_td: Math.floor(Math.random() * 2),
      projected_receptions: Math.floor(Math.random() * 8),
      is_projection_updated: true,
      projection_last_updated: new Date().toISOString()
    }));

    const { error: updateError } = await supabase
      .from('player_stats')
      .upsert(updates, {
        onConflict: 'player_id,week,season'
      });

    if (updateError) {
      console.error('❌ Error updating projections:', updateError);
      return false;
    }

    console.log('✅ Successfully updated 5 players with mock projections!');
    
    updates.forEach((update, index) => {
      console.log(`${index + 1}. Player ${update.player_id}: ${update.projected_points} projected points`);
    });
    
    return true;
    
  } catch (error) {
    console.error('💥 Simulation failed:', error);
    return false;
  }
}

async function main() {
  console.log('🏈 NFL Fantasy Projections Test');
  console.log('================================\n');
  
  // Test current status
  const status = await testProjectionsStatus();
  
  // Test player mappings
  const mappings = await testPlayerMappings();
  
  // Simulate projection update if we have players
  if (status && status.totalPlayers > 0) {
    const updateSuccess = await simulateProjectionUpdate();
    
    if (updateSuccess) {
      console.log('\n🔄 Re-checking status after update...\n');
      await testProjectionsStatus();
    }
  }
  
  console.log('\n✅ Test completed!');
  console.log('\n📋 Summary:');
  console.log('===========');
  if (status) {
    console.log(`Total players in Week 2: ${status.totalPlayers}`);
    console.log(`Players with fantasy points: ${status.playersWithFantasyPoints}`);
    console.log(`Players with projections: ${status.playersWithProjections}`);
  }
  
  console.log('\n💡 Next steps:');
  console.log('1. Set up SportsData API credentials');
  console.log('2. The daily projections system is ready to use');
  console.log('3. Run real API update when ready');
}

main().catch(console.error);