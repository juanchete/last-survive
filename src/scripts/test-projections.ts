/**
 * Simple test script for projections system
 * Run this to test the daily projections functionality
 */

import { createClient } from '@supabase/supabase-js';

// Use environment variables or hardcode for testing
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kgdaqomsasdlhblqkgwm.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZGFxb21zYXNkbGhibGFrZ3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwMzg5OTAsImV4cCI6MjA0OTYxNDk5MH0.J2s-4xBJUKLOhhmqEq4p9ug1k49cPmb6KF6wd68UkF8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProjectionsStatus() {
  console.log('🔍 Testing projections status...\n');
  
  try {
    // Check current player_stats
    const { data: stats, error } = await supabase
      .from('player_stats')
      .select('player_id, week, season, projected_points, is_projection_updated, projection_last_updated')
      .eq('week', 2)
      .eq('season', 2024);

    if (error) {
      console.error('❌ Error fetching stats:', error);
      return;
    }

    const totalPlayers = stats?.length || 0;
    const playersWithProjections = stats?.filter(s => s.is_projection_updated).length || 0;
    const playersWithPoints = stats?.filter(s => s.projected_points && s.projected_points > 0).length || 0;
    
    console.log('📊 Current Projections Status:');
    console.log('==============================');
    console.log(`Week: 2, Season: 2024`);
    console.log(`Total Players: ${totalPlayers}`);
    console.log(`Players with Updated Projections: ${playersWithProjections}`);
    console.log(`Players with Projected Points > 0: ${playersWithPoints}`);
    
    if (totalPlayers > 0) {
      const avgPoints = stats
        .filter(s => s.projected_points && s.projected_points > 0)
        .reduce((sum, s) => sum + (s.projected_points || 0), 0) / playersWithPoints || 0;
      
      console.log(`Average Projected Points: ${avgPoints.toFixed(2)}`);
    }
    
    // Show sample data
    if (stats && stats.length > 0) {
      console.log('\n📋 Sample Data (first 5 players):');
      console.log('==================================');
      
      const sample = stats.slice(0, 5);
      sample.forEach(player => {
        console.log(`Player ID: ${player.player_id}`);
        console.log(`  Projected Points: ${player.projected_points || 0}`);
        console.log(`  Is Updated: ${player.is_projection_updated || false}`);
        console.log(`  Last Updated: ${player.projection_last_updated || 'Never'}`);
        console.log('---');
      });
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('==================');
    if (playersWithProjections === 0) {
      console.log('🔄 Run the daily projections update to get real projections from API');
      console.log('   Command: npm run update-projections');
    } else if (playersWithProjections < totalPlayers) {
      console.log(`📈 ${totalPlayers - playersWithProjections} players need projection updates`);
    } else {
      console.log('✅ All players have updated projections!');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

async function testPlayerData() {
  console.log('\n🔍 Testing player data...\n');
  
  try {
    // Get some players with rosters
    const { data: playersInRosters, error: rostersError } = await supabase
      .from('team_rosters')
      .select(`
        player_id,
        week,
        players!inner (
          name,
          position,
          sportsdata_id
        )
      `)
      .eq('week', 2)
      .limit(10);

    if (rostersError) {
      console.error('❌ Error fetching player rosters:', rostersError);
      return;
    }

    console.log('👥 Players in Rosters (Week 2):');
    console.log('===============================');
    
    playersInRosters?.forEach(roster => {
      console.log(`${roster.players.name} (${roster.players.position})`);
      console.log(`  Player ID: ${roster.player_id}`);
      console.log(`  SportsData ID: ${roster.players.sportsdata_id || 'None'}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('💥 Player data test failed:', error);
  }
}

async function main() {
  console.log('🏈 NFL Fantasy Projections Test');
  console.log('================================\n');
  
  await testProjectionsStatus();
  await testPlayerData();
  
  console.log('\n✅ Test completed!');
  console.log('\nNext steps:');
  console.log('1. Ensure SportsData API credentials are configured');
  console.log('2. Run: npm run update-projections');
  console.log('3. Check updated status: npm run projections-status');
}

main().catch(console.error);