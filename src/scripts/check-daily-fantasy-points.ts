/**
 * Script to check DailyFantasyPoints endpoint for defense data
 */

const API_KEY = 'a7fdf8e0c4914c15894d1cb3bb3c884a';

async function checkDailyFantasyPoints() {
  console.log('🔍 Checking DailyFantasyPoints endpoint...\n');
  
  try {
    // Use the date format from the URL you provided
    const url = `https://api.sportsdata.io/v3/nfl/stats/json/DailyFantasyPoints/2025-08-25?key=${API_KEY}`;
    console.log('Fetching from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`❌ Endpoint failed with status: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ Found ${data.length} total entries\n`);
    
    // Group by position
    const positionGroups: Record<string, any[]> = {};
    
    data.forEach((player: any) => {
      const pos = player.Position || 'UNKNOWN';
      if (!positionGroups[pos]) {
        positionGroups[pos] = [];
      }
      positionGroups[pos].push(player);
    });
    
    // Show position breakdown
    console.log('📊 Position Breakdown:');
    console.log('=' .repeat(50));
    Object.entries(positionGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([position, players]) => {
        console.log(`${position}: ${players.length} entries`);
      });
    
    // Check for team defenses (DEF/DST)
    console.log('\n🛡️ Team Defenses:');
    console.log('=' .repeat(50));
    const defenses = data.filter((p: any) => 
      p.Position === 'DEF' || 
      p.Position === 'DST' ||
      p.Name?.includes('Defense') ||
      p.Name?.includes('DST')
    );
    
    if (defenses.length > 0) {
      console.log(`Found ${defenses.length} team defenses:`);
      defenses.slice(0, 5).forEach((def: any) => {
        console.log(`\n${def.Name || def.Team}:`);
        console.log(`  Position: ${def.Position}`);
        console.log(`  Team: ${def.Team}`);
        console.log(`  PlayerID: ${def.PlayerID}`);
        console.log(`  FantasyPoints: ${def.FantasyPoints || 0}`);
        console.log(`  FantasyPointsPPR: ${def.FantasyPointsPPR || 0}`);
        console.log(`  FantasyPointsDraftKings: ${def.FantasyPointsDraftKings || 0}`);
        if (def.PointsAllowed !== undefined) console.log(`  PointsAllowed: ${def.PointsAllowed}`);
        if (def.Sacks !== undefined) console.log(`  Sacks: ${def.Sacks}`);
        if (def.Interceptions !== undefined) console.log(`  Interceptions: ${def.Interceptions}`);
        if (def.FumblesRecovered !== undefined) console.log(`  FumblesRecovered: ${def.FumblesRecovered}`);
        if (def.DefensiveTouchdowns !== undefined) console.log(`  DefensiveTouchdowns: ${def.DefensiveTouchdowns}`);
      });
    } else {
      console.log('❌ No team defenses found');
    }
    
    // Check for individual defensive players (IDP)
    console.log('\n🏈 Individual Defensive Players (IDP):');
    console.log('=' .repeat(50));
    const defensivePositions = ['CB', 'S', 'SS', 'FS', 'LB', 'ILB', 'OLB', 'MLB', 'DE', 'DT', 'NT', 'DL', 'DB'];
    const idpPlayers = data.filter((p: any) => defensivePositions.includes(p.Position));
    
    if (idpPlayers.length > 0) {
      console.log(`Found ${idpPlayers.length} IDP players`);
      
      // Show top IDP by fantasy points
      const topIDP = idpPlayers
        .filter((p: any) => p.FantasyPoints > 0)
        .sort((a: any, b: any) => b.FantasyPoints - a.FantasyPoints)
        .slice(0, 5);
      
      if (topIDP.length > 0) {
        console.log('\nTop 5 IDP by fantasy points:');
        topIDP.forEach((player: any) => {
          console.log(`\n${player.Name} (${player.Position} - ${player.Team}):`);
          console.log(`  FantasyPoints: ${player.FantasyPoints}`);
          console.log(`  FantasyPointsPPR: ${player.FantasyPointsPPR}`);
          if (player.SoloTackles > 0) console.log(`  SoloTackles: ${player.SoloTackles}`);
          if (player.AssistedTackles > 0) console.log(`  AssistedTackles: ${player.AssistedTackles}`);
          if (player.Sacks > 0) console.log(`  Sacks: ${player.Sacks}`);
          if (player.Interceptions > 0) console.log(`  Interceptions: ${player.Interceptions}`);
          if (player.FumblesRecovered > 0) console.log(`  FumblesRecovered: ${player.FumblesRecovered}`);
          if (player.DefensiveTouchdowns > 0) console.log(`  DefensiveTouchdowns: ${player.DefensiveTouchdowns}`);
        });
      }
      
      // Count by defensive position
      const idpPositionCounts: Record<string, number> = {};
      idpPlayers.forEach((p: any) => {
        idpPositionCounts[p.Position] = (idpPositionCounts[p.Position] || 0) + 1;
      });
      
      console.log('\nIDP breakdown by position:');
      Object.entries(idpPositionCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([pos, count]) => {
          console.log(`  ${pos}: ${count} players`);
        });
    } else {
      console.log('❌ No IDP players found');
    }
    
    // Check for any entries with "DP" position
    console.log('\n🎯 Checking for DP (Defensive Player) position:');
    console.log('=' .repeat(50));
    const dpPlayers = data.filter((p: any) => p.Position === 'DP');
    if (dpPlayers.length > 0) {
      console.log(`Found ${dpPlayers.length} players with DP position`);
      dpPlayers.slice(0, 3).forEach((player: any) => {
        console.log(`  - ${player.Name} (${player.Team})`);
      });
    } else {
      console.log('❌ No players with DP position found');
    }
    
    // Sample of data structure
    console.log('\n📄 Sample data structure (first entry):');
    console.log('=' .repeat(50));
    if (data.length > 0) {
      const sample = data[0];
      console.log(JSON.stringify(sample, null, 2).substring(0, 1000));
    }
    
  } catch (error) {
    console.error('❌ Error fetching data:', error);
  }
}

// Run the check
checkDailyFantasyPoints().then(() => {
  console.log('\n✅ Check complete!');
}).catch(error => {
  console.error('Script failed:', error);
});