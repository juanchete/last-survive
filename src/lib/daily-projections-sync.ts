/**
 * Daily Projections Sync Service
 * Updates player projections every day at 6 AM
 * Fetches latest projections from SportsData API
 */

import { providerManager } from './providers/ProviderManager';
import { supabase } from '@/integrations/supabase/client';

export class DailyProjectionsSync {
  private static instance: DailyProjectionsSync;
  
  private constructor() {}

  public static getInstance(): DailyProjectionsSync {
    if (!DailyProjectionsSync.instance) {
      DailyProjectionsSync.instance = new DailyProjectionsSync();
    }
    return DailyProjectionsSync.instance;
  }

  /**
   * Update projections for current week
   */
  public async updateCurrentWeekProjections(): Promise<{
    success: boolean;
    message: string;
    updatedPlayers: number;
    week: number;
    season: number;
  }> {
    try {
      console.log('🔄 Starting daily projections update...');
      
      // Get current NFL state
      const nflStateResponse = await providerManager.getNFLState();
      if (nflStateResponse.error) {
        throw new Error(nflStateResponse.error);
      }
      
      const nflState = nflStateResponse.data;
      if (!nflState) {
        throw new Error('No NFL state available');
      }

      // Use current week for projections
      console.log(`📅 Updating projections for Season ${nflState.season}, Week ${nflState.week}`);

      // Get weekly projections from API for current week
      const projectionsResponse = await providerManager.getWeeklyProjections(
        parseInt(nflState.season),
        nflState.week,
        nflState.season_type
      );

      if (projectionsResponse.error) {
        throw new Error(projectionsResponse.error);
      }

      const weeklyProjections = projectionsResponse.data || {};
      console.log(`📊 Received projections for ${Object.keys(weeklyProjections).length} players`);
      
      // Get player mappings from database - need to get ALL players in batches
      const allPlayers: any[] = [];
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;

      console.log('🔄 Fetching all players from database in batches...');

      while (hasMore) {
        const { data: batch, error: playersError } = await supabase
          .from('players')
          .select('id, stats_id, sportsdata_id, name, position')
          .range(offset, offset + batchSize - 1);

        if (playersError) {
          console.error('❌ Error fetching players:', playersError);
          throw playersError;
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

      const players = allPlayers;

      if (!players || players.length === 0) {
        throw new Error('No players found in database');
      }

      console.log(`📊 Found ${players.length} total players in database for mapping`);

      // Create mapping strategies (SportsData ID is most reliable)
      const sportsDataIdMap = new Map(
        players?.map(p => [p.sportsdata_id, p]).filter(([k]) => k) || []
      );
      const statsIdMap = new Map(
        players?.map(p => [p.stats_id, p]).filter(([k]) => k) || []
      );
      const nameMap = new Map(
        players?.map(p => [p.name?.toLowerCase(), p]).filter(([k]) => k) || []
      );

      console.log(`🗺️ Created mappings: ${sportsDataIdMap.size} SportsData IDs, ${statsIdMap.size} Stats IDs, ${nameMap.size} names`);

      // Prepare projection updates
      const projectionsToUpdate: any[] = [];
      let updatedCount = 0;
      let notFoundCount = 0;
      
      Object.entries(weeklyProjections).forEach(([playerKey, projection]) => {
        // Find player using multiple mapping strategies
        let player = sportsDataIdMap.get(playerKey) || 
                     statsIdMap.get(playerKey) ||
                     nameMap.get(projection.player_name?.toLowerCase());
        
        if (player && projection.stats && projection.points) {
          // Calculate projected points (prefer PPR, fallback to standard)
          const projectedPoints = projection.points.ppr || projection.points.standard || 0;
          
          // Extract projection stats
          const stats = projection.stats;
          
          projectionsToUpdate.push({
            player_id: player.id,
            week: nflState.week, // Use current week for projections
            season: parseInt(nflState.season),
            
            // Update projections (keep actual stats if they exist)
            projected_points: Number(projectedPoints) || 0,
            projected_passing_yards: Math.round(Number(stats.pass_yd) || 0),
            projected_passing_td: Math.round(Number(stats.pass_td) || 0),
            projected_rushing_yards: Math.round(Number(stats.rush_yd) || 0),
            projected_rushing_td: Math.round(Number(stats.rush_td) || 0),
            projected_receiving_yards: Math.round(Number(stats.rec_yd) || 0),
            projected_receiving_td: Math.round(Number(stats.rec_td) || 0),
            projected_receptions: Math.round(Number(stats.rec) || 0),
            
            // Mark as updated
            is_projection_updated: true,
            projection_last_updated: new Date().toISOString()
          });
          
          updatedCount++;
        } else {
          notFoundCount++;
          if (projection.player_name) {
            console.log(`❓ Player not found: ${projection.player_name} (${playerKey})`);
          }
        }
      });

      console.log(`📈 Prepared ${projectionsToUpdate.length} projection updates (${notFoundCount} players not found)`);

      // Batch update projections in database
      if (projectionsToUpdate.length > 0) {
        const chunkSize = 500;
        
        for (let i = 0; i < projectionsToUpdate.length; i += chunkSize) {
          const chunk = projectionsToUpdate.slice(i, i + chunkSize);
          
          const { error } = await supabase
            .from('player_stats')
            .upsert(chunk, {
              onConflict: 'player_id,week,season'
            });

          if (error) {
            console.error(`❌ Error updating projections batch ${i + 1}-${i + chunk.length}:`, error);
            throw error;
          }
          
          console.log(`✅ Updated projections batch ${i + 1}-${Math.min(i + chunk.length, projectionsToUpdate.length)}`);
        }
      }

      const result = {
        success: true,
        message: `Successfully updated projections for ${updatedCount} players (Week ${nflState.week}, Season ${nflState.season})`,
        updatedPlayers: updatedCount,
        week: nflState.week,
        season: parseInt(nflState.season)
      };

      console.log('✅ Daily projections update completed:', result.message);
      return result;
      
    } catch (error) {
      const errorMessage = `Failed to update daily projections: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ Daily projections sync error:', error);
      
      return {
        success: false,
        message: errorMessage,
        updatedPlayers: 0,
        week: 0,
        season: 0
      };
    }
  }

  /**
   * Update projections for a specific week (useful for testing or catch-up)
   */
  public async updateProjectionsForWeek(
    season: number,
    week: number,
    seasonType: string = 'Regular'
  ): Promise<{
    success: boolean;
    message: string;
    updatedPlayers: number;
  }> {
    try {
      console.log(`🔄 Updating projections for Season ${season}, Week ${week}...`);

      // Get weekly projections from API
      let projectionsResponse = await providerManager.getWeeklyProjections(
        season,
        week,
        seasonType
      );

      // Use direct API for projections to ensure fresh, accurate data
      console.log(`🔧 [updateProjectionsForWeek] Using direct API for most reliable data`);
      const forceDirectApi = true;

      // If provider fails OR we're forcing direct API, try direct API call as fallback
      if (projectionsResponse.error || forceDirectApi) {
        console.log(`🎯 [updateProjectionsForWeek] Using direct SportsData API for reliable projections data`);

        try {
          const directApiUrl = `https://api.sportsdata.io/v3/nfl/projections/json/PlayerGameProjectionStatsByWeek/${season}REG/${week}?key=f1826e4060774e56a6f56bae1d9eb76e`;
          console.log(`🔄 [updateProjectionsForWeek] Calling direct API: ${directApiUrl}`);

          const response = await fetch(directApiUrl);
          const apiData = await response.json();

          if (apiData && Array.isArray(apiData)) {
            console.log(`✅ [updateProjectionsForWeek] Direct API returned ${apiData.length} projections`);

            // Convert API data to the same format as provider
            const directProjections: any = {};
            apiData.forEach((playerProjection: any) => {
              const playerId = String(playerProjection.PlayerID);

              // Use FantasyPointsPPR as main scoring
              const points: any = {};
              if (playerProjection.FantasyPointsPPR !== undefined) {
                points.ppr = playerProjection.FantasyPointsPPR;
                points.standard = playerProjection.FantasyPointsPPR;
                points.half_ppr = playerProjection.FantasyPointsPPR;
              }

              const projectionData: any = {};
              if (playerProjection.ReceivingYards !== undefined) projectionData.rec_yd = playerProjection.ReceivingYards;
              if (playerProjection.Receptions !== undefined) projectionData.rec = playerProjection.Receptions;
              if (playerProjection.ReceivingTouchdowns !== undefined) projectionData.rec_td = playerProjection.ReceivingTouchdowns;
              if (playerProjection.RushingYards !== undefined) projectionData.rush_yd = playerProjection.RushingYards;
              if (playerProjection.RushingTouchdowns !== undefined) projectionData.rush_td = playerProjection.RushingTouchdowns;
              if (playerProjection.PassingYards !== undefined) projectionData.pass_yd = playerProjection.PassingYards;
              if (playerProjection.PassingTouchdowns !== undefined) projectionData.pass_td = playerProjection.PassingTouchdowns;

              if (playerProjection.Name) projectionData.player_name = playerProjection.Name;

              directProjections[playerId] = {
                player_id: playerId,
                stats: projectionData,
                points: Object.keys(points).length > 0 ? points : undefined,
                player_name: playerProjection.Name,
              };
            });

            projectionsResponse = { data: directProjections, error: null };
            console.log(`📊 [updateProjectionsForWeek] Direct API fallback successful: ${Object.keys(directProjections).length} projections converted`);
          } else {
            throw new Error('Invalid response from direct API');
          }
        } catch (directApiError) {
          console.error(`❌ [updateProjectionsForWeek] Direct API fallback failed:`, directApiError);
          throw new Error(`Both provider and direct API failed: ${projectionsResponse.error}`);
        }
      }

      if (projectionsResponse.error) {
        throw new Error(projectionsResponse.error);
      }

      const weeklyProjections = projectionsResponse.data || {};
      console.log(`📊 [updateProjectionsForWeek] Received projections for ${Object.keys(weeklyProjections).length} players`);

      // Get player mappings - need to get ALL players in batches of 1000
      const allPlayers: any[] = [];
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;

      console.log('🔄 [updateProjectionsForWeek] Fetching all players from database in batches...');

      while (hasMore) {
        const { data: batch, error: playersError } = await supabase
          .from('players')
          .select('id, stats_id, sportsdata_id, name')
          .range(offset, offset + batchSize - 1);

        if (playersError) {
          console.error('❌ [updateProjectionsForWeek] Error fetching players:', playersError);
          throw playersError;
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

      const players = allPlayers;
      console.log(`👥 [updateProjectionsForWeek] Found ${players?.length || 0} total players in database`);

      // Create mappings - handle both string and number keys for SportsData ID
      const sportsDataIdMap = new Map();
      const statsIdMap = new Map();
      const nameMap = new Map();

      players?.forEach(p => {
        if (p.sportsdata_id) {
          // Add both string and number versions of sportsdata_id
          sportsDataIdMap.set(p.sportsdata_id, p.id); // String version
          sportsDataIdMap.set(parseInt(p.sportsdata_id), p.id); // Number version
        }
        if (p.stats_id) {
          statsIdMap.set(p.stats_id, p.id);
        }
        if (p.name) {
          nameMap.set(p.name.toLowerCase(), p.id);
        }
      });

      console.log(`🗺️ [updateProjectionsForWeek] Created mappings: ${sportsDataIdMap.size} SportsData IDs, ${statsIdMap.size} Stats IDs, ${nameMap.size} names`);

      // Debug specific test players mapping - including Ja'Marr Chase
      const testPlayers = ['Bucky Irving', 'Dylan Sampson', 'Tyler Warren', 'C.J. Stroud', "Ja'Marr Chase"];
      testPlayers.forEach(playerName => {
        const player = players?.find(p => p.name === playerName);
        if (player) {
          console.log(`🔧 [updateProjectionsForWeek] ${playerName}: DB ID=${player.id}, SportsData ID="${player.sportsdata_id}"`);
          console.log(`   - String key "${player.sportsdata_id}" maps to: ${sportsDataIdMap.get(player.sportsdata_id)}`);
          console.log(`   - Number key ${parseInt(player.sportsdata_id)} maps to: ${sportsDataIdMap.get(parseInt(player.sportsdata_id))}`);
        }
      });

      // Debug what's actually in the Map for our test IDs
      console.log(`🔍 [updateProjectionsForWeek] Map contents for test IDs:`);
      ['23239', '24967', '25874', '25889', '22564'].forEach(testId => {
        console.log(`   - "${testId}": ${sportsDataIdMap.get(testId)}`);
        console.log(`   - ${parseInt(testId)}: ${sportsDataIdMap.get(parseInt(testId))}`);
      });

      // Show first few entries of the Map to see the structure
      const mapEntries = Array.from(sportsDataIdMap.entries()).slice(0, 10);
      console.log(`🗺️ [updateProjectionsForWeek] First 10 map entries:`);
      mapEntries.forEach(([key, value], index) => {
        console.log(`   ${index + 1}. "${key}" (${typeof key}) -> ${value}`);
      });

      // Let's also check if our test players are in the database query result
      testPlayers.forEach(playerName => {
        const player = players?.find(p => p.name === playerName);
        console.log(`🔧 [updateProjectionsForWeek] ${playerName} in DB:`, player ? `ID=${player.id}, SportsDataID="${player.sportsdata_id}"` : 'NOT FOUND');
      });
      console.log('🔍 [updateProjectionsForWeek] Checking for test players in projections...');

      // First, let's see the structure of the API response
      const apiKeys = Object.keys(weeklyProjections).slice(0, 5);
      console.log(`🔧 [updateProjectionsForWeek] Sample API keys (first 5):`, apiKeys);
      console.log(`🔧 [updateProjectionsForWeek] Sample API key types:`, apiKeys.map(k => typeof k));

      // Check specific test player keys
      testPlayers.forEach(playerName => {
        const foundInProjections = Object.values(weeklyProjections).find((p: any) =>
          p.player_name && p.player_name.toLowerCase().includes(playerName.toLowerCase())
        );

        if (foundInProjections) {
          // Find the key for this player
          const playerKey = Object.keys(weeklyProjections).find(key =>
            weeklyProjections[key] === foundInProjections
          );
          console.log(`✅ [updateProjectionsForWeek] ${playerName}:`);
          console.log(`   - API key: "${playerKey}" (type: ${typeof playerKey})`);
          console.log(`   - Points:`, (foundInProjections as any).points);
          console.log(`   - Player name in API: "${(foundInProjections as any).player_name}"`);
        } else {
          console.log(`❌ [updateProjectionsForWeek] ${playerName}: Not found in API projections`);
        }
      });

      // Prepare updates
      const projectionsToUpdate: any[] = [];
      let foundCount = 0;
      let notFoundCount = 0;

      Object.entries(weeklyProjections).forEach(([playerKey, projection]) => {
        let playerId = sportsDataIdMap.get(playerKey) ||
                       statsIdMap.get(playerKey) ||
                       nameMap.get(projection.player_name?.toLowerCase());

        // Check for test players specifically
        const isTestPlayer = testPlayers.some(name =>
          projection.player_name && projection.player_name.toLowerCase().includes(name.toLowerCase())
        );

        if (isTestPlayer) {
          console.log(`🎯 [updateProjectionsForWeek] Processing test player ${projection.player_name}:`);
          console.log(`   - Player Key: "${playerKey}" (type: ${typeof playerKey})`);
          console.log(`   - SportsData ID found: ${sportsDataIdMap.has(playerKey)}`);
          console.log(`   - Stats ID found: ${statsIdMap.has(playerKey)}`);
          console.log(`   - Name found: ${nameMap.has(projection.player_name?.toLowerCase())}`);
          console.log(`   - Testing string version: ${sportsDataIdMap.has(String(playerKey))}`);
          console.log(`   - Testing number version: ${sportsDataIdMap.has(Number(playerKey))}`);
          console.log(`   - Manual lookup by string: ${sportsDataIdMap.get(String(playerKey))}`);
          console.log(`   - Manual lookup by number: ${sportsDataIdMap.get(Number(playerKey))}`);
          console.log(`   - Final Player ID: ${playerId}`);
          console.log(`   - Has projection points: ${!!projection.points}`);
        }

        if (playerId && projection.points) {
          const projectedPoints = projection.points.ppr || projection.points.standard || 0;
          const stats = projection.stats || {};

          if (isTestPlayer) {
            console.log(`✅ [updateProjectionsForWeek] Adding ${projection.player_name} to update list with ${projectedPoints} points`);
          }

          projectionsToUpdate.push({
            player_id: playerId,
            week: week,
            season: season,
            projected_points: Number(projectedPoints) || 0,
            projected_passing_yards: Math.round(Number(stats.pass_yd) || 0),
            projected_passing_td: Math.round(Number(stats.pass_td) || 0),
            projected_rushing_yards: Math.round(Number(stats.rush_yd) || 0),
            projected_rushing_td: Math.round(Number(stats.rush_td) || 0),
            projected_receiving_yards: Math.round(Number(stats.rec_yd) || 0),
            projected_receiving_td: Math.round(Number(stats.rec_td) || 0),
            projected_receptions: Math.round(Number(stats.rec) || 0),
            is_projection_updated: true,
            projection_last_updated: new Date().toISOString()
          });
          foundCount++;
        } else {
          if (isTestPlayer) {
            console.log(`❌ [updateProjectionsForWeek] Skipping ${projection.player_name}: playerId=${playerId}, points=${!!projection.points}`);
          }
          notFoundCount++;
        }
      });

      console.log(`📈 [updateProjectionsForWeek] Prepared ${projectionsToUpdate.length} updates (${foundCount} found, ${notFoundCount} not found)`);

      // Update database - Use a more robust approach for batch updates
      if (projectionsToUpdate.length > 0) {
        console.log(`💾 [updateProjectionsForWeek] Updating ${projectionsToUpdate.length} projections in database...`);

        // Process in smaller batches to avoid conflicts and improve success rate
        const batchSize = 100;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < projectionsToUpdate.length; i += batchSize) {
          const batch = projectionsToUpdate.slice(i, i + batchSize);
          console.log(`   📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(projectionsToUpdate.length / batchSize)} (${batch.length} players)`);

          try {
            // Try upsert first
            const { error: upsertError } = await supabase
              .from('player_stats')
              .upsert(batch, {
                onConflict: 'player_id,week,season',
                ignoreDuplicates: false
              });

            if (upsertError) {
              console.warn(`⚠️ [updateProjectionsForWeek] Upsert failed for batch, trying individual updates:`, upsertError.message);

              // If batch upsert fails, try individual updates
              for (const projection of batch) {
                try {
                  // Delete existing record first
                  await supabase
                    .from('player_stats')
                    .delete()
                    .eq('player_id', projection.player_id)
                    .eq('week', projection.week)
                    .eq('season', projection.season);

                  // Insert new record
                  const { error: insertError } = await supabase
                    .from('player_stats')
                    .insert(projection);

                  if (insertError) {
                    console.error(`❌ [updateProjectionsForWeek] Failed to update player ${projection.player_id}:`, insertError.message);
                    errorCount++;
                  } else {
                    successCount++;
                  }
                } catch (individualError) {
                  console.error(`❌ [updateProjectionsForWeek] Individual update failed for player ${projection.player_id}:`, individualError);
                  errorCount++;
                }
              }
            } else {
              successCount += batch.length;
              console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1} completed successfully`);
            }
          } catch (batchError) {
            console.error(`❌ [updateProjectionsForWeek] Batch error:`, batchError);
            errorCount += batch.length;
          }

          // Small delay between batches to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`✅ [updateProjectionsForWeek] Update completed: ${successCount} successful, ${errorCount} failed`);

        if (errorCount > 0) {
          console.warn(`⚠️ [updateProjectionsForWeek] ${errorCount} projections failed to update`);
        }
      } else {
        console.log(`⚠️ [updateProjectionsForWeek] No projections to update`);
      }

      return {
        success: true,
        message: `Updated projections for ${projectionsToUpdate.length} players`,
        updatedPlayers: projectionsToUpdate.length
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Failed to update projections: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updatedPlayers: 0
      };
    }
  }

  /**
   * Get the status of projection updates
   */
  public async getProjectionStatus(week?: number, season?: number): Promise<{
    totalPlayers: number;
    playersWithProjections: number;
    lastUpdated: string | null;
    updatePercentage: number;
  }> {
    try {
      // Get current NFL state if no week/season provided
      if (!week || !season) {
        const nflStateResponse = await providerManager.getNFLState();
        if (nflStateResponse.data) {
          // Use current week for projections
          week = nflStateResponse.data.week;
          season = parseInt(nflStateResponse.data.season);
        } else {
          // Fallback: use current date to determine next week
          const currentDate = new Date();
          const currentYear = currentDate.getFullYear();
          const currentMonth = currentDate.getMonth() + 1;

          // Estimate current week based on date (September = week 1)
          let estimatedWeek = 1;
          if (currentMonth === 9) {
            const dayOfMonth = currentDate.getDate();
            estimatedWeek = Math.ceil(dayOfMonth / 7);
          } else if (currentMonth === 10) {
            estimatedWeek = 4 + Math.ceil(currentDate.getDate() / 7);
          } else if (currentMonth === 11) {
            estimatedWeek = 8 + Math.ceil(currentDate.getDate() / 7);
          } else if (currentMonth === 12) {
            estimatedWeek = 12 + Math.ceil(currentDate.getDate() / 7);
          }

          week = estimatedWeek; // Current week for projections
          season = currentYear;
        }
      }

      // Get stats for the specified week
      const { data: stats, error } = await supabase
        .from('player_stats')
        .select('is_projection_updated, projection_last_updated')
        .eq('week', week)
        .eq('season', season);

      if (error) throw error;

      const totalPlayers = stats?.length || 0;
      const playersWithProjections = stats?.filter(s => s.is_projection_updated).length || 0;
      const lastUpdated = stats?.find(s => s.projection_last_updated)?.projection_last_updated || null;
      const updatePercentage = totalPlayers > 0 ? Math.round((playersWithProjections / totalPlayers) * 100) : 0;

      return {
        totalPlayers,
        playersWithProjections,
        lastUpdated,
        updatePercentage
      };
      
    } catch (error) {
      console.error('Error getting projection status:', error);
      return {
        totalPlayers: 0,
        playersWithProjections: 0,
        lastUpdated: null,
        updatePercentage: 0
      };
    }
  }
}

// Export singleton instance
export const dailyProjectionsSync = DailyProjectionsSync.getInstance();

// Export for direct use
export default dailyProjectionsSync;