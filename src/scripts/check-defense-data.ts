/**
 * Script to check what defense data is available from SportsData API
 */

const API_KEY = 'a7fdf8e0c4914c15894d1cb3bb3c884a';

async function checkDefenseData() {
  console.log('🔍 Checking SportsData API for defense information...\n');
  
  // 1. Check if there are team defense projections
  console.log('1️⃣ Checking Fantasy Defense Projections...');
  try {
    const defenseProjectionsUrl = `https://api.sportsdata.io/v3/nfl/projections/json/FantasyDefenseProjectionsByWeek/2025REG/1?key=${API_KEY}`;
    const response = await fetch(defenseProjectionsUrl);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Found ${data.length} team defense projections`);
      if (data.length > 0) {
        console.log('Sample defense projection:', JSON.stringify(data[0], null, 2).substring(0, 500));
      }
    } else {
      console.log(`❌ Defense projections endpoint failed: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Error fetching defense projections:', error);
  }
  
  console.log('\n2️⃣ Checking Defense/Special Teams in Players endpoint...');
  try {
    const playersUrl = `https://api.sportsdata.io/v3/nfl/scores/json/PlayersByAvailable?key=${API_KEY}`;
    const response = await fetch(playersUrl);
    
    if (response.ok) {
      const data = await response.json();
      const defPlayers = data.filter((p: any) => 
        p.Position === 'DEF' || 
        p.Position === 'DST' || 
        p.FantasyPosition === 'DEF' ||
        p.FantasyPosition === 'DST'
      );
      
      console.log(`✅ Found ${defPlayers.length} DEF/DST entries in players`);
      if (defPlayers.length > 0) {
        console.log('Sample DEF player:', JSON.stringify(defPlayers[0], null, 2));
      }
    } else {
      console.log(`❌ Players endpoint failed: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Error fetching players:', error);
  }
  
  console.log('\n3️⃣ Checking Individual Defensive Players (IDP)...');
  try {
    const playersUrl = `https://api.sportsdata.io/v3/nfl/scores/json/PlayersByAvailable?key=${API_KEY}`;
    const response = await fetch(playersUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      // Check defensive positions
      const defensivePositions = ['CB', 'SS', 'FS', 'LB', 'ILB', 'OLB', 'MLB', 'DE', 'DT', 'NT', 'DL', 'DB', 'SAF'];
      const idpPlayers = data.filter((p: any) => 
        defensivePositions.includes(p.Position) || defensivePositions.includes(p.FantasyPosition)
      );
      
      console.log(`✅ Found ${idpPlayers.length} individual defensive players (IDP)`);
      
      // Count by position
      const positionCounts: Record<string, number> = {};
      idpPlayers.forEach((p: any) => {
        const pos = p.Position || p.FantasyPosition;
        positionCounts[pos] = (positionCounts[pos] || 0) + 1;
      });
      
      console.log('IDP breakdown by position:');
      Object.entries(positionCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([pos, count]) => {
          console.log(`  ${pos}: ${count} players`);
        });
    } else {
      console.log(`❌ Players endpoint failed: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Error checking IDP:', error);
  }
  
  console.log('\n4️⃣ Checking Defense Stats endpoint...');
  try {
    const defenseStatsUrl = `https://api.sportsdata.io/v3/nfl/stats/json/FantasyDefenseByWeek/2025REG/1?key=${API_KEY}`;
    const response = await fetch(defenseStatsUrl);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Found ${data.length} team defense stats`);
      if (data.length > 0) {
        console.log('Sample defense stats:', JSON.stringify(data[0], null, 2).substring(0, 500));
      }
    } else {
      console.log(`❌ Defense stats endpoint failed: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Error fetching defense stats:', error);
  }
  
  console.log('\n5️⃣ Checking IDP Projections...');
  try {
    const projectionUrl = `https://api.sportsdata.io/v3/nfl/projections/json/PlayerGameProjectionStatsByWeek/2025REG/1?key=${API_KEY}`;
    const response = await fetch(projectionUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      // Find projections with defensive stats
      const defensiveProjections = data.filter((p: any) => 
        (p.DefensiveTouchdowns > 0) ||
        (p.Sacks > 0) ||
        (p.Interceptions > 0) ||
        (p.FumblesRecovered > 0) ||
        (p.SoloTackles > 0) ||
        (p.AssistedTackles > 0) ||
        (p.TacklesForLoss > 0) ||
        (p.PassesDefended > 0)
      );
      
      console.log(`✅ Found ${defensiveProjections.length} players with defensive projections`);
      
      if (defensiveProjections.length > 0) {
        const sample = defensiveProjections[0];
        console.log('Sample defensive projection:', {
          PlayerID: sample.PlayerID,
          Name: sample.Name,
          Position: sample.Position,
          Team: sample.Team,
          DefensiveTouchdowns: sample.DefensiveTouchdowns,
          Sacks: sample.Sacks,
          Interceptions: sample.Interceptions,
          FumblesRecovered: sample.FumblesRecovered,
          SoloTackles: sample.SoloTackles,
          AssistedTackles: sample.AssistedTackles,
          TacklesForLoss: sample.TacklesForLoss,
          PassesDefended: sample.PassesDefended,
          FantasyPointsDraftKings: sample.FantasyPointsDraftKings
        });
      }
    } else {
      console.log(`❌ Projections endpoint failed: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Error checking IDP projections:', error);
  }
}

// Run the check
checkDefenseData().then(() => {
  console.log('\n✅ Defense data check complete!');
}).catch(error => {
  console.error('Script failed:', error);
});