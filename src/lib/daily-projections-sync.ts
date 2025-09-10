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

      console.log(`📅 Updating projections for Season ${nflState.season}, Week ${nflState.week}`);

      // Get weekly projections from API
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
      
      // Get player mappings from database
      const { data: players } = await supabase
        .from('players')
        .select('id, stats_id, sportsdata_id, name, position');

      if (!players || players.length === 0) {
        throw new Error('No players found in database');
      }

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
            week: nflState.week,
            season: parseInt(nflState.season),
            
            // Update projections (keep actual stats if they exist)
            projected_points: projectedPoints,
            projected_passing_yards: stats.pass_yd || 0,
            projected_passing_td: stats.pass_td || 0,
            projected_rushing_yards: stats.rush_yd || 0,
            projected_rushing_td: stats.rush_td || 0,
            projected_receiving_yards: stats.rec_yd || 0,
            projected_receiving_td: stats.rec_td || 0,
            projected_receptions: stats.rec || 0,
            
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
      const projectionsResponse = await providerManager.getWeeklyProjections(
        season,
        week,
        seasonType
      );

      if (projectionsResponse.error) {
        throw new Error(projectionsResponse.error);
      }

      const weeklyProjections = projectionsResponse.data || {};
      
      // Get player mappings
      const { data: players } = await supabase
        .from('players')
        .select('id, stats_id, sportsdata_id, name');

      // Create mappings
      const sportsDataIdMap = new Map(
        players?.map(p => [p.sportsdata_id, p.id]).filter(([k]) => k) || []
      );
      const statsIdMap = new Map(
        players?.map(p => [p.stats_id, p.id]).filter(([k]) => k) || []
      );
      const nameMap = new Map(
        players?.map(p => [p.name?.toLowerCase(), p.id]).filter(([k]) => k) || []
      );

      // Prepare updates
      const projectionsToUpdate: any[] = [];
      
      Object.entries(weeklyProjections).forEach(([playerKey, projection]) => {
        let playerId = sportsDataIdMap.get(playerKey) || 
                       statsIdMap.get(playerKey) ||
                       nameMap.get(projection.player_name?.toLowerCase());
        
        if (playerId && projection.points) {
          const projectedPoints = projection.points.ppr || projection.points.standard || 0;
          const stats = projection.stats || {};
          
          projectionsToUpdate.push({
            player_id: playerId,
            week: week,
            season: season,
            projected_points: projectedPoints,
            projected_passing_yards: stats.pass_yd || 0,
            projected_passing_td: stats.pass_td || 0,
            projected_rushing_yards: stats.rush_yd || 0,
            projected_rushing_td: stats.rush_td || 0,
            projected_receiving_yards: stats.rec_yd || 0,
            projected_receiving_td: stats.rec_td || 0,
            projected_receptions: stats.rec || 0,
            is_projection_updated: true,
            projection_last_updated: new Date().toISOString()
          });
        }
      });

      // Update database
      if (projectionsToUpdate.length > 0) {
        const { error } = await supabase
          .from('player_stats')
          .upsert(projectionsToUpdate, {
            onConflict: 'player_id,week,season'
          });

        if (error) throw error;
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
          week = nflStateResponse.data.week;
          season = parseInt(nflStateResponse.data.season);
        } else {
          week = 2; // Current fallback
          season = 2024;
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