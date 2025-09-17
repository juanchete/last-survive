/**
 * Script to update existing players with SportsData IDs
 * This will help map projections correctly
 */

import { supabase } from '../integrations/supabase/client';

async function updateSportsDataIds() {
  console.log('Starting SportsData ID update...');
  
  try {
    // First, get all players from SportsData
    console.log('Fetching players from SportsData API...');
    
    // Fetch directly from SportsData API
    const response = await fetch('https://api.sportsdata.io/v3/nfl/scores/json/PlayersByAvailable?key=f1826e4060774e56a6f56bae1d9eb76e');
    
    if (!response.ok) {
      console.error('Failed to fetch players from SportsData:', response.status);
      return;
    }
    
    const sportsDataPlayers = await response.json();
    
    if (!sportsDataPlayers || !Array.isArray(sportsDataPlayers)) {
      console.error('Invalid response from SportsData');
      return;
    }
    
    // Filter only active players
    const activePlayers = sportsDataPlayers.filter((p: any) => p.Status === 'Active');
    
    console.log(`Found ${activePlayers.length} active players from SportsData`);
    
    // Get player mappings from database - need to get ALL players in batches
    console.log('Fetching players from database...');
    const allPlayers: any[] = [];
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    console.log('🔄 Fetching all players from database in batches...');

    while (hasMore) {
      const { data: batch, error: playersError } = await supabase
        .from('players')
        .select('id, name, sportsdata_id')
        .range(offset, offset + batchSize - 1);

      if (playersError) {
        console.error('❌ Error fetching players:', playersError);
        return;
      }

      if (batch && batch.length > 0) {
        allPlayers.push(...batch);
        console.log(`   📦 Batch ${Math.floor(offset / batchSize) + 1}: ${batch.length} players (total: ${allPlayers.length})`);

        if (batch.length < batchSize) {
          hasMore = false; // Less than full batch means we've reached the end
        } else {
          offset += batchSize;
        }
      } else {
        hasMore = false;
      }
    }

    const dbPlayers = allPlayers;

    console.log(`Found ${dbPlayers?.length || 0} players in database`);
    
    // Create a map of database players by name (lowercase for matching)
    const dbPlayerMap = new Map(
      dbPlayers?.map(p => [p.name?.toLowerCase(), p]) || []
    );
    
    // Track updates
    let updateCount = 0;
    let matchedCount = 0;
    const updates: Array<{ id: number; sportsdata_id: string }> = [];
    
    // Match SportsData players to database players
    for (const sdPlayer of activePlayers) {
      if (!sdPlayer.PlayerID || !sdPlayer.Name) continue;
      
      const playerName = sdPlayer.Name.toLowerCase();
      const dbPlayer = dbPlayerMap.get(playerName);
      
      if (dbPlayer) {
        matchedCount++;
        
        // Only update if the player doesn't have a sportsdata_id yet
        if (!dbPlayer.sportsdata_id) {
          updates.push({
            id: dbPlayer.id,
            sportsdata_id: String(sdPlayer.PlayerID)
          });
        }
      } else {
        // Try alternative name matching (last name, first name)
        const nameParts = sdPlayer.Name.split(' ');
        if (nameParts.length >= 2) {
          // Try "Firstname Lastname" and "Lastname, Firstname" formats
          const altName1 = `${nameParts[nameParts.length - 1]}, ${nameParts.slice(0, -1).join(' ')}`.toLowerCase();
          const altName2 = `${nameParts.slice(1).join(' ')} ${nameParts[0]}`.toLowerCase();
          
          const altDbPlayer = dbPlayerMap.get(altName1) || dbPlayerMap.get(altName2);
          if (altDbPlayer && !altDbPlayer.sportsdata_id) {
            matchedCount++;
            updates.push({
              id: altDbPlayer.id,
              sportsdata_id: String(sdPlayer.PlayerID)
            });
          }
        }
      }
    }
    
    console.log(`Matched ${matchedCount} players`);
    console.log(`Will update ${updates.length} players with SportsData IDs`);
    
    // Batch update players
    if (updates.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize);
        
        // Update each player individually (Supabase doesn't support batch updates well)
        for (const update of chunk) {
          const { error } = await supabase
            .from('players')
            .update({ sportsdata_id: update.sportsdata_id })
            .eq('id', update.id);
          
          if (error) {
            console.error(`Error updating player ${update.id}:`, error);
          } else {
            updateCount++;
          }
        }
        
        console.log(`Updated ${Math.min(i + chunkSize, updates.length)}/${updates.length} players...`);
      }
    }
    
    console.log(`✅ Successfully updated ${updateCount} players with SportsData IDs`);
    
    // Verify the update
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .not('sportsdata_id', 'is', null);
    
    console.log(`Total players with SportsData IDs: ${count}`);
    
  } catch (error) {
    console.error('Error updating SportsData IDs:', error);
  }
}

// Run the script
updateSportsDataIds().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});