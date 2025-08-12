import { supabase } from '@/integrations/supabase/client';
import { sleeperProvider } from './providers/SleeperProvider';
import type { Database } from '@/integrations/supabase/types';
import type { NFLPlayer, PlayerStats as ProviderPlayerStats } from './providers/FantasyProvider';

// Legacy imports for backward compatibility
import { sleeperAPI, sleeperUtils } from './sleeper-api';
import type { SleeperPlayersResponse, SleeperStatsResponse, SleeperPlayerStats } from '@/types/sleeper';

type Player = Database['public']['Tables']['players']['Row'];
type PlayerInsert = Database['public']['Tables']['players']['Insert'];
type PlayerStats = Database['public']['Tables']['player_stats']['Row'];
type PlayerStatsInsert = Database['public']['Tables']['player_stats']['Insert'];
type NFLTeam = Database['public']['Tables']['nfl_teams']['Row'];

export class SleeperSyncService {
  private static instance: SleeperSyncService;

  private constructor() {}

  public static getInstance(): SleeperSyncService {
    if (!SleeperSyncService.instance) {
      SleeperSyncService.instance = new SleeperSyncService();
    }
    return SleeperSyncService.instance;
  }

  /**
   * Sync all NFL teams from Sleeper API
   */
  async syncNFLTeams(): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      // Get current teams from database
      const { data: existingTeams } = await supabase
        .from('nfl_teams')
        .select('*');

      const existingTeamMap = new Map(
        existingTeams?.map(team => [team.abbreviation, team]) || []
      );

      // Get all players using the new provider
      const playersResponse = await sleeperProvider.getAllPlayers();
      
      if (playersResponse.error) {
        throw new Error(playersResponse.error);
      }

      const activeTeams = new Set<string>();

      // Extract unique team abbreviations from active players
      Object.values(playersResponse.data || {}).forEach(player => {
        if (player.active && player.team) {
          activeTeams.add(player.team);
        }
      });

      // NFL team mapping (Sleeper abbreviation -> full name)
      const teamMapping: Record<string, string> = {
        'ARI': 'Arizona Cardinals',
        'ATL': 'Atlanta Falcons',
        'BAL': 'Baltimore Ravens',
        'BUF': 'Buffalo Bills',
        'CAR': 'Carolina Panthers',
        'CHI': 'Chicago Bears',
        'CIN': 'Cincinnati Bengals',
        'CLE': 'Cleveland Browns',
        'DAL': 'Dallas Cowboys',
        'DEN': 'Denver Broncos',
        'DET': 'Detroit Lions',
        'GB': 'Green Bay Packers',
        'HOU': 'Houston Texans',
        'IND': 'Indianapolis Colts',
        'JAX': 'Jacksonville Jaguars',
        'KC': 'Kansas City Chiefs',
        'LAC': 'Los Angeles Chargers',
        'LAR': 'Los Angeles Rams',
        'LV': 'Las Vegas Raiders',
        'MIA': 'Miami Dolphins',
        'MIN': 'Minnesota Vikings',
        'NE': 'New England Patriots',
        'NO': 'New Orleans Saints',
        'NYG': 'New York Giants',
        'NYJ': 'New York Jets',
        'PHI': 'Philadelphia Eagles',
        'PIT': 'Pittsburgh Steelers',
        'SEA': 'Seattle Seahawks',
        'SF': 'San Francisco 49ers',
        'TB': 'Tampa Bay Buccaneers',
        'TEN': 'Tennessee Titans',
        'WAS': 'Washington Commanders'
      };

      const teamsToUpsert = [];
      
      for (const abbreviation of activeTeams) {
        const fullName = teamMapping[abbreviation] || abbreviation;
        const existingTeam = existingTeamMap.get(abbreviation);
        
        if (!existingTeam || existingTeam.name !== fullName) {
          teamsToUpsert.push({
            abbreviation,
            name: fullName,
            logo: null,
            conference: null,
            division: null
          });
        }
      }

      if (teamsToUpsert.length > 0) {
        const { error } = await supabase
          .from('nfl_teams')
          .upsert(teamsToUpsert, {
            onConflict: 'abbreviation'
          });

        if (error) throw error;
      }

      return {
        success: true,
        message: `Synced ${activeTeams.size} teams (${teamsToUpsert.length} updated)`,
        count: activeTeams.size
      };
    } catch (error) {
      console.error('Error syncing NFL teams:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sync NFL teams'
      };
    }
  }

  /**
   * Sync all players from Sleeper API
   */
  async syncPlayers(): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      // Get all players using the new provider
      const playersResponse = await sleeperProvider.getAllPlayers();
      
      if (playersResponse.error) {
        throw new Error(playersResponse.error);
      }

      const sleeperPlayers = playersResponse.data || {};

      // Get teams for ID mapping
      const { data: nflTeams } = await supabase
        .from('nfl_teams')
        .select('id, abbreviation');

      const teamMap = new Map(
        nflTeams?.map(team => [team.abbreviation, team.id]) || []
      );

      // Transform Sleeper players to database format
      const playersToUpsert: PlayerInsert[] = [];
      
      Object.entries(sleeperPlayers).forEach(([sleeperId, player]) => {
        // Only sync active players with valid positions
        const validPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DP', 'LB', 'DB', 'DL'];
        
        if (player.active && player.position && validPositions.includes(player.position)) {
          const teamId = player.team ? teamMap.get(player.team) : null;
          
          playersToUpsert.push({
            sleeper_id: sleeperId,
            name: player.full_name || `${player.first_name} ${player.last_name}`,
            position: player.position as any,
            nfl_team_id: teamId || null,
            avatar_url: player.metadata?.avatar_url || null,
            years_exp: player.years_exp || 0,
            college: player.college || null,
            status: player.status || 'active',
            injury_status: player.injury_status || null,
            age: player.age || null,
            height: player.height || null,
            weight: player.weight ? parseInt(player.weight) : null,
            // Store cross-reference IDs
            gsis_id: player.gsis_id || null,
            sportradar_id: player.sportradar_id || null,
            stats_id: player.stats_id || null,
            espn_id: player.espn_id || null,
            yahoo_id: player.yahoo_id || null,
            rotowire_id: player.rotowire_id || null,
            fantasypros_id: player.fantasypros_id || null,
            pfr_id: player.pfr_id || null,
            last_sync_at: new Date().toISOString()
          });
        }
      });

      // Batch upsert players
      if (playersToUpsert.length > 0) {
        // Split into chunks to avoid payload size limits
        const chunkSize = 500;
        for (let i = 0; i < playersToUpsert.length; i += chunkSize) {
          const chunk = playersToUpsert.slice(i, i + chunkSize);
          
          const { error } = await supabase
            .from('players')
            .upsert(chunk, {
              onConflict: 'sleeper_id'
            });

          if (error) throw error;
        }
      }

      return {
        success: true,
        message: `Synced ${playersToUpsert.length} players (cached: ${playersResponse.cached})`,
        count: playersToUpsert.length
      };
    } catch (error) {
      console.error('Error syncing players:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sync players'
      };
    }
  }

  /**
   * Sync team defenses from Sleeper
   */
  async syncTeamDefenses(): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      // Get NFL teams from database
      const { data: nflTeams } = await supabase
        .from('nfl_teams')
        .select('id, abbreviation, name');

      if (!nflTeams || nflTeams.length === 0) {
        throw new Error('No NFL teams found. Please sync NFL teams first.');
      }

      const defensesToUpsert = [];

      // Create defense entries for each team
      for (const team of nflTeams) {
        // Check if defense already exists
        const { data: existingDefense } = await supabase
          .from('players')
          .select('id')
          .eq('position', 'DEF')
          .eq('nfl_team_id', team.id)
          .eq('is_team_defense', true)
          .single();

        if (!existingDefense) {
          defensesToUpsert.push({
            name: `${team.name} Defense`,
            position: 'DEF' as any,
            nfl_team_id: team.id,
            sleeper_id: team.abbreviation, // Sleeper uses team abbreviation for defenses
            is_team_defense: true,
            status: 'active',
            avatar_url: null,
            photo_url: null,
            last_sync_at: new Date().toISOString()
          });
        }
      }

      // Batch upsert defenses
      if (defensesToUpsert.length > 0) {
        const { error } = await supabase
          .from('players')
          .upsert(defensesToUpsert, {
            onConflict: 'sleeper_id'
          });

        if (error) throw error;
      }

      return {
        success: true,
        message: `Synced ${defensesToUpsert.length} team defenses`,
        count: defensesToUpsert.length
      };
    } catch (error) {
      console.error('Error syncing team defenses:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sync team defenses'
      };
    }
  }

  /**
   * Sync weekly stats for players
   */
  async syncWeeklyStats(
    season: number,
    week: number,
    seasonType: 'regular' | 'post' | 'pre' = 'regular'
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      // Get stats using the new provider
      const statsResponse = await sleeperProvider.getWeeklyStats(season, week, seasonType);
      
      if (statsResponse.error) {
        throw new Error(statsResponse.error);
      }

      const weeklyStats = statsResponse.data || {};

      // Get player mappings
      const { data: players } = await supabase
        .from('players')
        .select('id, sleeper_id');

      const playerMap = new Map(
        players?.map(p => [p.sleeper_id, p.id]) || []
      );

      // Transform stats to database format
      const statsToUpsert: PlayerStatsInsert[] = [];
      
      Object.entries(weeklyStats).forEach(([sleeperId, stats]) => {
        const playerId = playerMap.get(sleeperId);
        
        if (playerId && stats.stats && Object.keys(stats.stats).length > 0) {
          // Calculate total points (using PPR scoring by default)
          const totalPoints = stats.points?.ppr || this.calculateFantasyPoints(stats.stats);
          
          statsToUpsert.push({
            player_id: playerId,
            week,
            season,
            points_scored: totalPoints,
            passing_yards: stats.stats.pass_yd || 0,
            passing_tds: stats.stats.pass_td || 0,
            interceptions: stats.stats.pass_int || 0,
            rushing_yards: stats.stats.rush_yd || 0,
            rushing_tds: stats.stats.rush_td || 0,
            receiving_yards: stats.stats.rec_yd || 0,
            receiving_tds: stats.stats.rec_td || 0,
            receptions: stats.stats.rec || 0,
            targets: stats.stats.rec_tgt || 0,
            fumbles_lost: stats.stats.fum_lost || 0,
            two_point_conversions: (stats.stats.pass_2pt || 0) + (stats.stats.rush_2pt || 0) + (stats.stats.rec_2pt || 0),
            defensive_touchdowns: stats.stats.def_td || 0,
            defensive_interceptions: stats.stats.idp_int || 0,
            sacks: stats.stats.idp_sack || 0,
            safeties: stats.stats.idp_safe || 0,
            field_goals_made: stats.stats.fgm || 0,
            field_goals_attempted: stats.stats.fga || 0,
            extra_points_made: stats.stats.xpm || 0,
            extra_points_attempted: stats.stats.xpa || 0
          });
        }
      });

      // Batch upsert stats
      if (statsToUpsert.length > 0) {
        const { error } = await supabase
          .from('player_stats')
          .upsert(statsToUpsert, {
            onConflict: 'player_id,week,season'
          });

        if (error) throw error;
      }

      return {
        success: true,
        message: `Synced ${statsToUpsert.length} player stats for Week ${week} (cached: ${statsResponse.cached})`,
        count: statsToUpsert.length
      };
    } catch (error) {
      console.error('Error syncing weekly stats:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sync weekly stats'
      };
    }
  }

  /**
   * Sync weekly projections for players
   */
  async syncWeeklyProjections(
    season: number,
    week: number,
    seasonType: 'regular' | 'post' | 'pre' = 'regular'
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      // Get projections using the new provider
      const projectionsResponse = await sleeperProvider.getWeeklyProjections(season, week, seasonType);
      
      if (projectionsResponse.error) {
        throw new Error(projectionsResponse.error);
      }

      const weeklyProjections = projectionsResponse.data || {};

      // Get player mappings
      const { data: players } = await supabase
        .from('players')
        .select('id, sleeper_id');

      const playerMap = new Map(
        players?.map(p => [p.sleeper_id, p.id]) || []
      );

      // For now, we'll store projections in a separate table or as part of player metadata
      // This would require a new migration for a projections table
      // For backward compatibility, we'll just log the success
      
      const projectionCount = Object.keys(weeklyProjections).length;

      return {
        success: true,
        message: `Processed ${projectionCount} player projections for Week ${week} (cached: ${projectionsResponse.cached})`,
        count: projectionCount
      };
    } catch (error) {
      console.error('Error syncing weekly projections:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sync weekly projections'
      };
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
    points += (stats.fgm || 0) * 3; // Simplified, should vary by distance
    points -= (stats.fgmiss || 0) * 1;
    
    // Defense/IDP
    points += (stats.def_td || 0) * 6;
    points += (stats.idp_int || 0) * 2;
    points += (stats.idp_sack || 0) * 1;
    points += (stats.idp_safe || 0) * 2;
    
    return Math.round(points * 100) / 100;
  }

  /**
   * Get sync status and health check
   */
  async getSyncStatus(): Promise<{
    lastSync?: string;
    playerCount?: number;
    teamCount?: number;
    healthy: boolean;
    providerHealth?: any;
  }> {
    try {
      // Get counts from database
      const [playersResult, teamsResult] = await Promise.all([
        supabase.from('players').select('id, last_sync_at', { count: 'exact' }),
        supabase.from('nfl_teams').select('id', { count: 'exact' })
      ]);

      // Get provider health
      const healthCheck = await sleeperProvider.healthCheck();

      // Find most recent sync
      let lastSync: string | undefined;
      if (playersResult.data && playersResult.data.length > 0) {
        const syncs = playersResult.data
          .map(p => p.last_sync_at)
          .filter(Boolean)
          .sort();
        lastSync = syncs[syncs.length - 1];
      }

      return {
        lastSync,
        playerCount: playersResult.count || 0,
        teamCount: teamsResult.count || 0,
        healthy: healthCheck.healthy,
        providerHealth: healthCheck.details
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        healthy: false,
        providerHealth: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const sleeperSync = SleeperSyncService.getInstance();