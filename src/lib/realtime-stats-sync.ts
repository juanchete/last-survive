/**
 * Real-time Stats Sync Service
 * Automatically syncs player stats during game time
 * Updates every minute while games are active
 */

import { providerManager } from './providers/ProviderManager';
import { supabase } from '@/integrations/supabase/client';

export class RealtimeStatsSync {
  private static instance: RealtimeStatsSync;
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastSyncTime: Date | null = null;
  
  // Sync every 60 seconds during games
  private readonly SYNC_INTERVAL_MS = 60 * 1000;
  
  // Game day hours (Sunday 1 PM - 11 PM ET, Monday/Thursday 8 PM - 11:30 PM ET)
  private readonly GAME_WINDOWS = {
    0: { start: 13, end: 23 }, // Sunday
    1: { start: 20, end: 23.5 }, // Monday
    4: { start: 20, end: 23.5 }, // Thursday
  };

  private constructor() {}

  public static getInstance(): RealtimeStatsSync {
    if (!RealtimeStatsSync.instance) {
      RealtimeStatsSync.instance = new RealtimeStatsSync();
    }
    return RealtimeStatsSync.instance;
  }

  /**
   * Start the real-time sync service
   */
  public start(): void {
    if (this.isRunning) {
      console.log('Real-time sync already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting real-time stats sync service');
    
    // Initial sync
    this.syncStats();
    
    // Set up interval
    this.syncInterval = setInterval(() => {
      if (this.isGameTime()) {
        this.syncStats();
      }
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Stop the real-time sync service
   */
  public stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('Stopped real-time stats sync service');
  }

  /**
   * Check if current time is during game hours
   */
  private isGameTime(): boolean {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours() + (now.getMinutes() / 60);
    
    const gameWindow = this.GAME_WINDOWS[day as keyof typeof this.GAME_WINDOWS];
    if (!gameWindow) return false;
    
    return hour >= gameWindow.start && hour <= gameWindow.end;
  }

  /**
   * Force a sync regardless of game time
   */
  public async forceSyncNow(): Promise<void> {
    await this.syncStats();
  }

  /**
   * Sync current week's stats
   */
  private async syncStats(): Promise<void> {
    try {
      console.log('Syncing real-time stats...');
      
      // Get current NFL state
      const nflStateResponse = await providerManager.getNFLState();
      if (nflStateResponse.error) {
        throw new Error(nflStateResponse.error);
      }
      
      const nflState = nflStateResponse.data;
      if (!nflState) {
        console.error('No NFL state available');
        return;
      }

      // Get current week's stats
      const statsResponse = await providerManager.getWeeklyStats(
        parseInt(nflState.season),
        nflState.week,
        nflState.season_type
      );

      if (statsResponse.error) {
        throw new Error(statsResponse.error);
      }

      const weeklyStats = statsResponse.data || {};
      
      // Get player mappings
      const { data: players } = await supabase
        .from('players')
        .select('id, sleeper_id, stats_id, name');

      // Create mapping strategies
      const sleeperIdMap = new Map(
        players?.map(p => [p.sleeper_id, p.id]).filter(([k]) => k) || []
      );
      const statsIdMap = new Map(
        players?.map(p => [p.stats_id, p.id]).filter(([k]) => k) || []
      );
      const nameMap = new Map(
        players?.map(p => [p.name?.toLowerCase(), p.id]).filter(([k]) => k) || []
      );

      // Prepare stats updates
      const statsToUpdate: any[] = [];
      let updatedCount = 0;
      
      Object.entries(weeklyStats).forEach(([playerKey, stats]) => {
        // Find player ID
        let playerId = sleeperIdMap.get(playerKey) || 
                       statsIdMap.get(playerKey) ||
                       nameMap.get(stats.player_name?.toLowerCase());
        
        if (playerId && stats.stats && Object.keys(stats.stats).length > 0) {
          // Calculate fantasy points
          const totalPoints = stats.points?.ppr || this.calculateFantasyPoints(stats.stats);
          
          statsToUpdate.push({
            player_id: playerId,
            week: nflState.week,
            season: parseInt(nflState.season),
            // Update actual stats (don't overwrite projections)
            passing_yards: stats.stats.pass_yd || 0,
            passing_td: stats.stats.pass_td || 0,
            rushing_yards: stats.stats.rush_yd || 0,
            rushing_td: stats.stats.rush_td || 0,
            receiving_yards: stats.stats.rec_yd || 0,
            receiving_td: stats.stats.rec_td || 0,
            field_goals: stats.stats.fgm || 0,
            tackles: stats.stats.idp_tkl || 0,
            sacks: stats.stats.idp_sack || 0,
            interceptions: stats.stats.pass_int || stats.stats.idp_int || 0,
            fantasy_points: totalPoints,
            actual_points: totalPoints,
            // Don't mark as final during live games
            is_final: false
          });
          updatedCount++;
        }
      });

      // Batch update stats
      if (statsToUpdate.length > 0) {
        const chunkSize = 500;
        for (let i = 0; i < statsToUpdate.length; i += chunkSize) {
          const chunk = statsToUpdate.slice(i, i + chunkSize);
          
          const { error } = await supabase
            .from('player_stats')
            .upsert(chunk, {
              onConflict: 'player_id,week,season'
            });

          if (error) {
            console.error('Error updating real-time stats:', error);
            throw error;
          }
        }
      }

      this.lastSyncTime = new Date();
      console.log(`Real-time sync completed: ${updatedCount} players updated at ${this.lastSyncTime.toLocaleTimeString()}`);
      
      // Emit event for UI updates
      window.dispatchEvent(new CustomEvent('statsUpdated', { 
        detail: { 
          updatedCount, 
          week: nflState.week,
          timestamp: this.lastSyncTime 
        } 
      }));
      
    } catch (error) {
      console.error('Error in real-time stats sync:', error);
    }
  }

  /**
   * Calculate fantasy points from stats (PPR scoring)
   */
  private calculateFantasyPoints(stats: Record<string, number>): number {
    let points = 0;
    
    // Passing
    points += (stats.pass_yd || 0) * 0.04;
    points += (stats.pass_td || 0) * 4;
    points -= (stats.pass_int || 0) * 2;
    
    // Rushing
    points += (stats.rush_yd || 0) * 0.1;
    points += (stats.rush_td || 0) * 6;
    
    // Receiving (PPR)
    points += (stats.rec || 0) * 1;
    points += (stats.rec_yd || 0) * 0.1;
    points += (stats.rec_td || 0) * 6;
    
    // Misc
    points -= (stats.fum_lost || 0) * 2;
    points += (stats.pass_2pt || 0) * 2;
    points += (stats.rush_2pt || 0) * 2;
    points += (stats.rec_2pt || 0) * 2;
    
    // Kicking
    points += (stats.xpm || 0) * 1;
    points -= (stats.xpmiss || 0) * 1;
    points += (stats.fgm || 0) * 3; // Simplified
    points -= (stats.fgmiss || 0) * 1;
    
    // Defense/IDP
    points += (stats.def_td || 0) * 6;
    points += (stats.idp_int || 0) * 2;
    points += (stats.idp_sack || 0) * 1;
    points += (stats.idp_safe || 0) * 2;
    
    return Math.round(points * 100) / 100;
  }

  /**
   * Get sync status
   */
  public getStatus(): {
    isRunning: boolean;
    lastSyncTime: Date | null;
    isGameTime: boolean;
    nextSyncIn: number | null;
  } {
    const nextSyncIn = this.isRunning && this.lastSyncTime 
      ? Math.max(0, this.SYNC_INTERVAL_MS - (Date.now() - this.lastSyncTime.getTime()))
      : null;

    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      isGameTime: this.isGameTime(),
      nextSyncIn
    };
  }
}

// Export singleton instance
export const realtimeStatsSync = RealtimeStatsSync.getInstance();