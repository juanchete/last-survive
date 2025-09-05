// Script to fix ALL ADP values with fresh data from SportsData
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tvzktsamnoiyjbayimvh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2emt0c2Ftbm9peWpiYXlpbXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTc2MzYsImV4cCI6MjA2MjMzMzYzNn0.Gcf1g2hLfUIFwO80mSxi34gbmCyZpu5L6qpH9ZCmqq0';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixAllADP() {
  console.log('\n🔄 Starting COMPLETE ADP correction...');
  
  try {
    // Get fresh data directly from SportsData API
    console.log('🌐 Fetching fresh data from SportsData FantasyPlayers...');
    const response = await fetch('https://api.sportsdata.io/v3/nfl/stats/json/FantasyPlayers?key=f1826e4060774e56a6f56bae1d9eb76e');
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const apiData = await response.json();
    console.log(`📊 Received ${apiData?.length || 0} players from API`);
    
    if (!apiData || !Array.isArray(apiData)) {
      throw new Error('Invalid API response');
    }
    
    // Filter players with teams and ADP data
    const validPlayers = apiData.filter(player => 
      player.PlayerID && 
      player.Name && 
      player.Team &&
      player.Team !== null &&
      player.Team !== "" &&
      player.AverageDraftPosition !== null &&
      player.AverageDraftPosition !== undefined
    );
    
    console.log(`🎯 Found ${validPlayers.length} players with valid ADP data`);
    
    if (validPlayers.length === 0) {
      console.warn('⚠️ No valid players found');
      return false;
    }
    
    // Show first 5 players to verify data
    console.log('\n📋 First 5 players from API:');
    validPlayers.slice(0, 5).forEach(p => {
      console.log(`  ${p.Name} (${p.Position}) - ADP: ${p.AverageDraftPosition}, Projected: ${p.ProjectedFantasyPoints}`);
    });
    
    // Update all players
    let updatedCount = 0;
    let errorCount = 0;
    
    console.log('\n🔄 Starting updates...');
    
    for (const player of validPlayers) {
      try {
        const { data, error } = await supabase
          .from('players')
          .update({
            adp_standard: player.AverageDraftPosition,
            last_season_points: player.ProjectedFantasyPoints || 0
          })
          .eq('sportsdata_id', String(player.PlayerID))
          .select('name, sportsdata_id');
        
        if (error) {
          console.error(`❌ Failed to update ${player.Name}:`, error.message);
          errorCount++;
        } else if (data && data.length > 0) {
          updatedCount++;
          if (updatedCount <= 10) {
            console.log(`✅ Updated: ${data[0].name} - ADP: ${player.AverageDraftPosition}`);
          } else if (updatedCount % 50 === 0) {
            console.log(`📊 Progress: ${updatedCount} players updated...`);
          }
        } else {
          // No matching record found
          if (updatedCount <= 5) {
            console.log(`⚠️ No match found for ${player.Name} (ID: ${player.PlayerID})`);
          }
        }
      } catch (err) {
        console.error(`💥 Error updating ${player.Name}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Final Results:');
    console.log(`✅ Successfully updated: ${updatedCount} players`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`🎯 API had: ${validPlayers.length} valid players`);
    
    return updatedCount > 0;
  } catch (err) {
    console.error('💥 Critical error:', err);
    return false;
  }
}

// Run the fix
fixAllADP()
  .then(result => {
    console.log('\n🏁 ADP correction completed:', result ? 'SUCCESS' : 'FAILED');
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });