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
   * Get current NFL week from SportsData API
   */
  private async getCurrentNFLWeek(): Promise<{ week: number; season: number }> {
    try {
      const SPORTSDATA_API_KEY = 'f1826e4060774e56a6f56bae1d9eb76e';
      const response = await fetch(`https://api.sportsdata.io/v3/nfl/scores/json/CurrentWeek?key=${SPORTSDATA_API_KEY}`);

      if (!response.ok) {
        throw new Error(`CurrentWeek API error: ${response.status}`);
      }

      const currentWeek = await response.json();
      const currentSeason = new Date().getFullYear();

      console.log(`🏈 Retrieved from API: ${currentSeason} Week ${currentWeek}`);

      return { week: currentWeek, season: currentSeason };
    } catch (error) {
      console.warn('Failed to fetch current week from API, using fallback:', error);

      // Intelligent fallback based on current date
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
      } else if (currentMonth >= 1 && currentMonth <= 2) {
        // Playoffs period - use week 18+
        estimatedWeek = 18;
      }

      return { week: estimatedWeek, season: currentYear };
    }
  }

  /**
   * Sync current week's stats (players + defenses)
   */
  private async syncStats(): Promise<void> {
    try {
      console.log('Syncing real-time stats (players + defenses)...');

      // Get current NFL week dynamically from API
      const { week: currentWeek, season: currentYear } = await this.getCurrentNFLWeek();
      console.log(`📅 Syncing for ${currentYear} Week ${currentWeek}`);

      // Create nflState object for compatibility
      const nflState = {
        week: currentWeek,
        season: currentYear.toString(),
        season_type: 'REG'
      };

      // Sync both player stats and defense stats in parallel
      const [playerUpdates, defenseUpdates] = await Promise.all([
        this.syncPlayerStats(nflState),
        this.syncDefenseStats(nflState)
      ]);

      const totalUpdated = playerUpdates + defenseUpdates;
      this.lastSyncTime = new Date();
      console.log(`Real-time sync completed: ${playerUpdates} players + ${defenseUpdates} defenses = ${totalUpdated} total updated at ${this.lastSyncTime.toLocaleTimeString()}`);

      // Emit event for UI updates
      window.dispatchEvent(new CustomEvent('statsUpdated', {
        detail: {
          updatedCount: totalUpdated,
          playerUpdates,
          defenseUpdates,
          week: nflState.week,
          timestamp: this.lastSyncTime
        }
      }));

    } catch (error) {
      console.error('Error in real-time stats sync:', error);
    }
  }

  /**
   * Sync player stats
   */
  private async syncPlayerStats(nflState: any): Promise<number> {
    try {
      const SPORTSDATA_API_KEY = 'f1826e4060774e56a6f56bae1d9eb76e';

      // Fetch stats directly from SportsData API
      const response = await fetch(`https://api.sportsdata.io/v3/nfl/stats/json/FantasyGameStatsByWeek/${nflState.season}REG/${nflState.week}?key=${SPORTSDATA_API_KEY}`);

      if (!response.ok) {
        console.error('Error fetching stats:', response.status);
        return 0;
      }

      const apiStats = await response.json();

      if (!apiStats || !Array.isArray(apiStats)) {
        console.error('Invalid stats response');
        return 0;
      }

      console.log(`Found ${apiStats.length} stat records from SportsData`);

      // Get player mappings - fetch ALL players in batches to handle 1800+ players
      const allPlayers: any[] = [];
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;

      console.log('🔄 Fetching all players from database in batches...');

      while (hasMore) {
        const { data: batch, error: playersError } = await supabase
          .from('players')
          .select('id, sportsdata_id, name')
          .neq('position', 'DEF') // Exclude defenses
          .range(offset, offset + batchSize - 1);

        if (playersError) {
          console.error('❌ Error fetching players:', playersError);
          return 0;
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
        console.error('No players found in database');
        return 0;
      }

      console.log(`📊 Found ${players.length} total players for mapping`)

      // Create mapping from sportsdata_id to database id
      const playerMap = new Map(
        players.map(p => [String(p.sportsdata_id), { id: p.id, name: p.name }])
      );

      // Prepare stats updates
      const statsToUpdate: any[] = [];
      let updatedCount = 0;

      apiStats.forEach((stat: any) => {
        const playerInfo = playerMap.get(String(stat.PlayerID));

        if (playerInfo) {
          const fantasyPoints = stat.FantasyPointsPPR || stat.FantasyPoints || 0;

          statsToUpdate.push({
            player_id: playerInfo.id,
            week: nflState.week,
            season: parseInt(nflState.season),
            fantasy_points: fantasyPoints,
            actual_points: fantasyPoints,
            passing_yards: stat.PassingYards || 0,
            passing_td: stat.PassingTouchdowns || 0,
            rushing_yards: stat.RushingYards || 0,
            rushing_td: stat.RushingTouchdowns || 0,
            receiving_yards: stat.ReceivingYards || 0,
            receiving_td: stat.ReceivingTouchdowns || 0,
            field_goals: stat.FieldGoalsMade || 0,
            tackles: stat.Tackles || 0,
            sacks: stat.Sacks || 0,
            interceptions: stat.Interceptions || 0,
            opponent: stat.Opponent || null,
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
            console.error('Error updating player stats:', error);
            throw error;
          }
        }
      }

      return updatedCount;
    } catch (error) {
      console.error('Error syncing player stats:', error);
      return 0;
    }
  }

  /**
   * Sync defense stats using SportsData API
   */
  private async syncDefenseStats(nflState: any): Promise<number> {
    try {
      const SPORTSDATA_API_KEY = 'f1826e4060774e56a6f56bae1d9eb76e';

      // Fetch defense stats from SportsData API
      const response = await fetch(
        `https://api.sportsdata.io/v3/nfl/stats/json/FantasyDefenseByGame/${nflState.season}REG/${nflState.week}?key=${SPORTSDATA_API_KEY}`
      );

      if (!response.ok) {
        console.error(`Defense API error: ${response.status}`);
        return 0;
      }

      const defenseData = await response.json();
      console.log(`Found ${defenseData.length} defense records for real-time sync`);

      // Get all defense players
      const { data: defensePlayers } = await supabase
        .from('players')
        .select(`
          id,
          name,
          nfl_teams!inner (abbreviation)
        `)
        .eq('position', 'DEF');

      if (!defensePlayers || defensePlayers.length === 0) {
        console.warn('No defense players found');
        return 0;
      }

      // Create lookup maps
      const defensePlayerMap = new Map();
      defensePlayers.forEach((player: any) => {
        const teamAbbr = player.nfl_teams?.abbreviation;
        if (teamAbbr) {
          defensePlayerMap.set(teamAbbr, player);
        }
      });

      const defenseStatsMap = new Map();
      defenseData.forEach((team: any) => {
        defenseStatsMap.set(team.Team, team);
      });

      // Prepare defense stats updates
      const defenseStatsToUpdate: any[] = [];
      let updatedCount = 0;

      for (const [teamAbbr, player] of defensePlayerMap.entries()) {
        const teamStats = defenseStatsMap.get(teamAbbr);

        if (teamStats) {
          const fantasyPoints = teamStats.FantasyPointsDraftKings || 0;

          defenseStatsToUpdate.push({
            player_id: player.id,
            week: nflState.week,
            season: parseInt(nflState.season),
            fantasy_points: fantasyPoints,
            actual_points: fantasyPoints,
            tackles: teamStats.Tackles || 0,
            sacks: teamStats.Sacks || 0,
            interceptions: teamStats.Interceptions || 0,
            passing_yards: 0,
            passing_td: 0,
            rushing_yards: 0,
            rushing_td: 0,
            receiving_yards: 0,
            receiving_td: 0,
            field_goals: 0,
            // Don't mark as final during live games
            is_final: false
          });
          updatedCount++;
        }
      }

      // Update defense stats
      if (defenseStatsToUpdate.length > 0) {
        const { error } = await supabase
          .from('player_stats')
          .upsert(defenseStatsToUpdate, {
            onConflict: 'player_id,week,season'
          });

        if (error) {
          console.error('Error updating defense stats:', error);
          return 0;
        }
      }

      return updatedCount;
    } catch (error) {
      console.error('Error syncing defense stats:', error);
      return 0;
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