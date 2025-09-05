// Quick script to sync only ADP data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tvzktsamnoiyjbayimvh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2emt0c2Ftbm9peWpiYXlpbXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTc2MzYsImV4cCI6MjA2MjMzMzYzNn0.Gcf1g2hLfUIFwO80mSxi34gbmCyZpu5L6qpH9ZCmqq0';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function syncADPQuick() {
  console.log('\n📈 Starting ADP sync...');
  
  try {
    // Call the edge function directly
    const response = await fetch('https://tvzktsamnoiyjbayimvh.supabase.co/functions/v1/sportsdata-proxy/fantasy-players', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge function error: ${response.status} ${errorText}`);
    }
    
    const playersData = await response.json();
    console.log('Received players data:', playersData?.length || 'No data');
    
    if (!playersData || !Array.isArray(playersData)) {
      console.error('Invalid players data response');
      return false;
    }
    
    // Filter players that have ADP data and are on teams
    const playersWithADP = playersData.filter(player => 
      player.PlayerID && 
      player.Name && 
      player.Team &&
      player.Team !== null &&
      player.Team !== "" &&
      player.AverageDraftPosition
    );
    
    console.log(`Found ${playersWithADP.length} players with ADP data out of ${playersData.length} total players`);
    
    if (playersWithADP.length === 0) {
      console.warn('No players found with ADP data');
      return false;
    }
    
    // Update players with ADP data
    let updatedCount = 0;
    
    for (const player of playersWithADP) {
      const updateData = {};
      
      // Only save AverageDraftPosition and ProjectedFantasyPoints as requested
      if (player.AverageDraftPosition) updateData.adp_standard = player.AverageDraftPosition;
      if (player.ProjectedFantasyPoints) updateData.last_season_points = player.ProjectedFantasyPoints;
      
      // Skip if no data to update
      if (Object.keys(updateData).length === 0) continue;
      
      const { error } = await supabase
        .from('players')
        .update(updateData)
        .eq('sportsdata_id', String(player.PlayerID));
        
      if (!error) {
        updatedCount++;
        if (updatedCount <= 5) {
          console.log(`✅ Updated ${player.Name} - ADP: ${player.AverageDraftPosition}, Projected: ${player.ProjectedFantasyPoints}`);
        }
      } else {
        console.log(`❌ Failed to update player ${player.Name} (${player.PlayerID}):`, error);
      }
    }
    
    console.log(`✅ Successfully updated ADP for ${updatedCount} players`);
    return updatedCount > 0;
  } catch (err) {
    console.error('Error in syncADP:', err);
    return false;
  }
}

// Run the sync
syncADPQuick()
  .then(result => {
    console.log('Sync completed:', result ? 'SUCCESS' : 'FAILED');
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });