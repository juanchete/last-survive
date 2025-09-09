/**
 * Test script to verify defense stats integration
 * Run with: npx tsx src/scripts/test-defense-integration.ts
 */

import { sportsDataProvider } from "@/lib/providers/SportsDataProvider";

async function testDefenseIntegration() {
  console.log('🔍 Testing Defense Stats Integration...\n');

  try {
    // Test 1: Check if edge function defense endpoint works
    console.log('1️⃣ Testing Edge Function Defense Endpoint...');
    const edgeResponse = await sportsDataProvider.fetchFromEdgeFunction("/defense-stats", {
      season: "2025",
      week: "1"
    });
    
    console.log(`✅ Edge function returned ${Array.isArray(edgeResponse) ? edgeResponse.length : 'single'} defense record(s)`);
    
    if (Array.isArray(edgeResponse) && edgeResponse.length > 0) {
      const sample = edgeResponse[0];
      console.log('Sample defense data:', {
        Team: sample.Team,
        Opponent: sample.Opponent,
        FantasyPointsDraftKings: sample.FantasyPointsDraftKings,
        Sacks: sample.Sacks,
        Interceptions: sample.Interceptions,
        PointsAllowed: sample.PointsAllowed
      });
    }

    // Test 2: Test getDefenseStats method
    console.log('\n2️⃣ Testing getDefenseStats method...');
    const defenseResponse = await sportsDataProvider.getDefenseStats(2025, 1);
    
    if (defenseResponse.error) {
      console.error('❌ Error:', defenseResponse.error);
    } else {
      const teams = Object.keys(defenseResponse.data || {});
      console.log(`✅ Retrieved defense stats for ${teams.length} teams: ${teams.join(', ')}`);
      
      if (teams.length > 0) {
        const firstTeam = teams[0];
        const teamStats = defenseResponse.data![firstTeam];
        console.log(`Sample stats for ${firstTeam}:`, {
          FantasyPointsDraftKings: teamStats.FantasyPointsDraftKings,
          Sacks: teamStats.Sacks,
          Interceptions: teamStats.Interceptions,
          PointsAllowed: teamStats.PointsAllowed,
          IsGameOver: teamStats.IsGameOver
        });
      }
    }

    // Test 3: Test specific team defense stats
    console.log('\n3️⃣ Testing specific team defense stats (ARI)...');
    const ariDefense = await sportsDataProvider.getDefenseStats(2025, 1, 'ARI');
    
    if (ariDefense.error) {
      console.error('❌ Error:', ariDefense.error);
    } else {
      console.log('✅ ARI defense stats:', ariDefense.data);
    }

    console.log('\n✅ Defense integration test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDefenseIntegration();