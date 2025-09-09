/**
 * Simple test to verify defense points are being fetched and stored
 */

import { sportsDataProvider } from "@/lib/providers/SportsDataProvider";
import { supabase } from "@/integrations/supabase/client";

async function testDefensePoints() {
  console.log('🏈 Testing Defense Points Integration...\n');
  
  try {
    const currentYear = new Date().getFullYear();
    const week = 1;
    
    // 1. Test SportsData API call
    console.log('1️⃣ Fetching defense stats from SportsData API...');
    const defenseResponse = await sportsDataProvider.getDefenseStats(currentYear, week);
    
    if (defenseResponse.error) {
      console.error('❌ API Error:', defenseResponse.error);
      return;
    }
    
    const defenseData = defenseResponse.data || {};
    const teams = Object.keys(defenseData);
    console.log(`✅ Fetched defense stats for ${teams.length} teams`);
    
    // Show sample data
    if (teams.length > 0) {
      const sampleTeam = teams[0];
      const sampleData = defenseData[sampleTeam];
      console.log(`📊 Sample: ${sampleTeam} = ${sampleData.FantasyPointsDraftKings} fantasy points`);
    }
    
    // 2. Test database update
    console.log('\n2️⃣ Testing database update...');
    
    // Get a defense player from database
    const { data: defensePlayers } = await supabase
      .from('players')
      .select('id, name, position, nfl_team_id, nfl_teams(abbreviation)')
      .eq('position', 'DEF')
      .limit(1);
    
    if (!defensePlayers || defensePlayers.length === 0) {
      console.error('❌ No defense players found in database');
      return;
    }
    
    const defensePlayer = defensePlayers[0] as any;
    const teamAbbr = defensePlayer.nfl_teams?.abbreviation;
    
    console.log(`🔍 Testing with: ${defensePlayer.name} (${teamAbbr})`);
    
    // Check if we have stats for this team
    const teamDefenseData = defenseData[teamAbbr];
    if (teamDefenseData) {
      const fantasyPoints = teamDefenseData.FantasyPointsDraftKings;
      console.log(`📈 ${teamAbbr} Defense Points: ${fantasyPoints}`);
      
      // Update player_stats
      const { error: updateError } = await supabase
        .from('player_stats')
        .upsert({
          player_id: defensePlayer.id,
          season: currentYear,
          week: week,
          fantasy_points: fantasyPoints,
          updated_at: new Date().toISOString()
        });
      
      if (updateError) {
        console.error('❌ Database update error:', updateError);
      } else {
        console.log('✅ Database updated successfully');
        
        // Verify the update
        const { data: updatedStat } = await supabase
          .from('player_stats')
          .select('fantasy_points')
          .eq('player_id', defensePlayer.id)
          .eq('week', week)
          .eq('season', currentYear)
          .single();
        
        if (updatedStat) {
          console.log(`✅ Verified: ${defensePlayer.name} now has ${updatedStat.fantasy_points} fantasy points`);
        }
      }
    } else {
      console.warn(`⚠️ No defense data found for ${teamAbbr}`);
    }
    
    console.log('\n🎉 Defense points test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testDefensePoints();
}

export { testDefensePoints };