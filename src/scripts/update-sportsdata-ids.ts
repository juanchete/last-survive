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
    const response = await fetch('https://api.sportsdata.io/v3/nfl/scores/json/PlayersByAvailable?key=a7fdf8e0c4914c15894d1cb3bb3c884a');
    
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
    
    // Get all players from our database
    console.log('Fetching players from database...');
    const { data: dbPlayers, error: dbError } = await supabase
      .from('players')
      .select('id, name, sportsdata_id');
    
    if (dbError) {
      console.error('Error fetching players from database:', dbError);
      return;
    }
    
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