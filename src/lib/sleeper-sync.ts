import { sleeperAPI, sleeperUtils } from './sleeper-api';
import { supabase } from '@/integrations/supabase/client';
import type { SleeperPlayersResponse, SleeperStatsResponse, SleeperPlayerStats } from '@/types/sleeper';
import type { Database } from '@/integrations/supabase/types';

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

      // Get all players to extract team information
      const players = await sleeperAPI.getAllPlayers();
      const activeTeams = new Set<string>();

      // Extract unique team abbreviations from active players
      Object.values(players).forEach(player => {
        if (player.active && player.team) {
          activeTeams.add(player.team);
        }
      });

      // NFL team mapping (Sleeper abbreviation -> full name)
      const nflTeamNames: { [key: string]: string } = {
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
        'LV': 'Las Vegas Raiders',
        'LAC': 'Los Angeles Chargers',
        'LAR': 'Los Angeles Rams',
        'MIA': 'Miami Dolphins',
        'MIN': 'Minnesota Vikings',
        'NE': 'New England Patriots',
        'NO': 'New Orleans Saints',
        'NYG': 'New York Giants',
        'NYJ': 'New York Jets',
        'PHI': 'Philadelphia Eagles',
        'PIT': 'Pittsburgh Steelers',
        'SF': 'San Francisco 49ers',
        'SEA': 'Seattle Seahawks',
        'TB': 'Tampa Bay Buccaneers',
        'TEN': 'Tennessee Titans',
        'WAS': 'Washington Commanders',
      };

      let teamsUpdated = 0;
      let teamsInserted = 0;

      // Process each active team
      for (const teamAbbr of activeTeams) {
        const teamName = nflTeamNames[teamAbbr];
        if (!teamName) continue;

        const existingTeam = existingTeamMap.get(teamAbbr);
        
        if (existingTeam) {
          // Update existing team if name has changed
          if (existingTeam.name !== teamName) {
            const { error: updateError } = await supabase
              .from('nfl_teams')
              .update({ name: teamName })
              .eq('id', existingTeam.id);
            
            if (updateError) throw updateError;
            teamsUpdated++;
          }
        } else {
          // Try to insert new team, but handle conflicts gracefully
          const { error: insertError } = await supabase
            .from('nfl_teams')
            .insert({
              name: teamName,
              abbreviation: teamAbbr,
            });
          
          if (insertError) {
            // If insertion fails due to conflict, try to update by abbreviation
            if (insertError.code === '23505') {
              const { error: updateError } = await supabase
                .from('nfl_teams')
                .update({ name: teamName })
                .eq('abbreviation', teamAbbr);
              
              if (!updateError) {
                teamsUpdated++;
              }
            } else {
              throw insertError;
            }
          } else {
            teamsInserted++;
          }
        }
      }

      
      return {
        success: true,
        message: `Successfully synced ${teamsInserted + teamsUpdated} teams`,
        count: teamsInserted + teamsUpdated,
      };
    } catch (error) {
      console.error('❌ NFL teams sync failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during team sync',
      };
    }
  }

  /**
   * Sync players from Sleeper API to database
   */
  async syncPlayers(
    fantasyPositionsOnly: boolean = true,
    activeOnly: boolean = true
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      
      // Ensure teams are synced first
      await this.syncNFLTeams();

      // Get current players from database
      const { data: existingPlayers } = await supabase
        .from('players')
        .select('*');

      const existingPlayerMap = new Map(
        existingPlayers?.map(player => [player.sleeper_id, player]) || []
      );

      // Get NFL teams mapping
      const { data: nflTeams } = await supabase
        .from('nfl_teams')
        .select('*');

      const teamMap = new Map(
        nflTeams?.map(team => [team.abbreviation, team.id]) || []
      );

      // Get all players from Sleeper
      const sleeperPlayers = await sleeperAPI.getAllPlayers();

      // Filter players based on criteria
      const fantasyPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
      const filteredPlayers = Object.entries(sleeperPlayers).filter(([_, player]) => {
        // Check if player data is valid
        if (!player || !player.position) return false;
        
        // Filter by active status
        if (activeOnly && !sleeperUtils.isActivePlayer(player)) return false;
        
        // Filter by fantasy positions
        if (fantasyPositionsOnly) {
          return player.fantasy_positions && player.fantasy_positions.some(pos => fantasyPositions.includes(pos));
        }
        
        return true;
      });

      const playersToInsert: PlayerInsert[] = [];
      const playersToUpdate: { id: number; updates: Partial<Player> }[] = [];

      // Process each player
      filteredPlayers.forEach(([sleeperId, player]) => {
        // Additional validation
        if (!player || !player.position || !player.full_name) {
          return;
        }
        
        const position = sleeperUtils.mapPosition(player.position);
        const nflTeamId = player.team ? teamMap.get(player.team) : null;
        
        const playerData = {
          sleeper_id: sleeperId,
          name: player.full_name,
          position: position as Player['position'],
          nfl_team_id: nflTeamId,
          photo_url: null, // Sleeper doesn't provide photo URLs directly
        };

        const existingPlayer = existingPlayerMap.get(sleeperId);
        
        if (existingPlayer) {
          // Check if player needs updating
          const needsUpdate = 
            existingPlayer.name !== playerData.name ||
            existingPlayer.position !== playerData.position ||
            existingPlayer.nfl_team_id !== playerData.nfl_team_id;

          if (needsUpdate) {
            playersToUpdate.push({
              id: existingPlayer.id,
              updates: {
                name: playerData.name,
                position: playerData.position,
                nfl_team_id: playerData.nfl_team_id,
              },
            });
          }
        } else {
          // New player to insert
          playersToInsert.push(playerData);
        }
      });

      let playersInserted = 0;
      let playersUpdated = 0;

      // Use upsert to handle conflicts automatically
      if (playersToInsert.length > 0) {
        
        const batchSize = 100;
        for (let i = 0; i < playersToInsert.length; i += batchSize) {
          const batch = playersToInsert.slice(i, i + batchSize);
          
          // Try regular insert first
          const { error: insertError } = await supabase
            .from('players')
            .insert(batch);
          
          if (insertError) {
            // If batch insert fails, handle conflicts individually
            
            for (const playerData of batch) {
              const { error: singleInsertError } = await supabase
                .from('players')
                .insert(playerData);
              
              if (singleInsertError) {
                if (singleInsertError.code === '23505') {
                  // Try to update existing player by sleeper_id if it exists
                  const { error: updateError } = await supabase
                    .from('players')
                    .update({
                      name: playerData.name,
                      position: playerData.position,
                      nfl_team_id: playerData.nfl_team_id,
                    })
                    .eq('sleeper_id', playerData.sleeper_id);
                  
                  if (!updateError) {
                    playersUpdated++;
                  } else {
                    // If update by sleeper_id fails, skip this player
                  }
                } else {
                  console.error(`Error with player ${playerData.name}:`, singleInsertError);
                }
              } else {
                playersInserted++;
              }
            }
          } else {
            playersInserted += batch.length;
          }
        }
      }

      // Update existing players
      for (const playerUpdate of playersToUpdate) {
        const { error: updateError } = await supabase
          .from('players')
          .update(playerUpdate.updates)
          .eq('id', playerUpdate.id);
        
        if (!updateError) {
          playersUpdated++;
        }
      }

      
      return {
        success: true,
        message: `Successfully synced ${playersInserted + playersUpdated} players`,
        count: playersInserted + playersUpdated,
      };
    } catch (error) {
      console.error('❌ Players sync failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during player sync',
      };
    }
  }

  /**
   * Sync weekly stats for all players
   */
  async syncWeeklyStats(
    season: number,
    week: number,
    scoringType: 'std' | 'ppr' | 'half_ppr' = 'std'
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      
      // Get current players from database
      const { data: players } = await supabase
        .from('players')
        .select('id, sleeper_id')
        .not('sleeper_id', 'is', null);

      if (!players || players.length === 0) {
        return {
          success: false,
          message: 'No players found in database. Please sync players first.',
        };
      }

      const playerMap = new Map(
        players.map(player => [player.sleeper_id, player.id])
      );

      // Get weekly stats from Sleeper
      const sleeperStats = await sleeperAPI.getWeeklyStats(season, week);

      // Check if we have existing stats for this week
      const { data: existingStats } = await supabase
        .from('player_stats')
        .select('player_id')
        .eq('week', week)
        .eq('season', season);

      const existingStatsSet = new Set(
        existingStats?.map(stat => stat.player_id) || []
      );

      const statsToInsert: PlayerStatsInsert[] = [];
      const statsToUpdate: { player_id: number; updates: Partial<PlayerStats> }[] = [];

      // Process each player's stats
      Object.values(sleeperStats).forEach(statEntry => {
        const playerId = playerMap.get(statEntry.player_id);
        if (!playerId) return; // Player not in our database

        const fantasyPoints = sleeperUtils.getFantasyPoints(statEntry.stats, scoringType);
        
        const statsData = {
          player_id: playerId,
          week: week,
          season: season,
          fantasy_points: fantasyPoints,
          passing_yards: statEntry.stats.pass_yd || 0,
          passing_td: statEntry.stats.pass_td || 0,
          rushing_yards: statEntry.stats.rush_yd || 0,
          rushing_td: statEntry.stats.rush_td || 0,
          receiving_yards: statEntry.stats.rec_yd || 0,
          receiving_td: statEntry.stats.rec_td || 0,
          interceptions: statEntry.stats.pass_int || 0,
          field_goals: statEntry.stats.fgm || 0,
          sacks: statEntry.stats.def_sack || 0,
          tackles: statEntry.stats.def_tkl || 0,
        };

        if (existingStatsSet.has(playerId)) {
          // Update existing stats
          statsToUpdate.push({
            player_id: playerId,
            updates: {
              fantasy_points: statsData.fantasy_points,
              passing_yards: statsData.passing_yards,
              passing_td: statsData.passing_td,
              rushing_yards: statsData.rushing_yards,
              rushing_td: statsData.rushing_td,
              receiving_yards: statsData.receiving_yards,
              receiving_td: statsData.receiving_td,
              interceptions: statsData.interceptions,
              field_goals: statsData.field_goals,
              sacks: statsData.sacks,
              tackles: statsData.tackles,
            },
          });
        } else {
          // Insert new stats
          statsToInsert.push(statsData);
        }
      });

      // Insert new stats in batches
      if (statsToInsert.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < statsToInsert.length; i += batchSize) {
          const batch = statsToInsert.slice(i, i + batchSize);
          const { error: insertError } = await supabase
            .from('player_stats')
            .insert(batch);
          
          if (insertError) throw insertError;
        }
      }

      // Update existing stats
      for (const statsUpdate of statsToUpdate) {
        const { error: updateError } = await supabase
          .from('player_stats')
          .update(statsUpdate.updates)
          .eq('player_id', statsUpdate.player_id)
          .eq('week', week)
          .eq('season', season);
        
        if (updateError) throw updateError;
      }

      
      return {
        success: true,
        message: `Successfully synced ${statsToInsert.length + statsToUpdate.length} player stats`,
        count: statsToInsert.length + statsToUpdate.length,
      };
    } catch (error) {
      console.error('❌ Weekly stats sync failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during stats sync',
      };
    }
  }

  /**
   * Map existing players without sleeper_id to Sleeper API data
   */
  async mapExistingPlayersToSleeper(): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      
      // Get existing players without sleeper_id
      const { data: existingPlayers } = await supabase
        .from('players')
        .select('*')
        .is('sleeper_id', null);

      if (!existingPlayers || existingPlayers.length === 0) {
        return {
          success: true,
          message: 'No players found without sleeper_id',
          count: 0,
        };
      }


      // Get all players from Sleeper
      const sleeperPlayers = await sleeperAPI.getAllPlayers();
      
      let mappedCount = 0;
      const unmappedPlayers: string[] = [];

      // Map each existing player
      for (const player of existingPlayers) {
        let sleeperMatch: string | null = null;
        
        // Try to find match by name
        const playerEntries = Object.entries(sleeperPlayers);
        
        // Direct name match first
        for (const [sleeperId, sleeperPlayer] of playerEntries) {
          if (sleeperPlayer && sleeperPlayer.full_name) {
            // Normalize names for comparison
            const normalizedExisting = this.normalizeName(player.name);
            const normalizedSleeper = this.normalizeName(sleeperPlayer.full_name);
            
            if (normalizedExisting === normalizedSleeper && 
                sleeperUtils.mapPosition(sleeperPlayer.position) === player.position) {
              sleeperMatch = sleeperId;
              break;
            }
          }
        }
        
        // If no direct match, try partial matches for common variations
        if (!sleeperMatch) {
          for (const [sleeperId, sleeperPlayer] of playerEntries) {
            if (sleeperPlayer && sleeperPlayer.full_name) {
              if (this.isNameMatch(player.name, sleeperPlayer.full_name, sleeperPlayer.position, player.position)) {
                sleeperMatch = sleeperId;
                break;
              }
            }
          }
        }
        
        if (sleeperMatch) {
          // Check if this sleeper_id is already used by another player
          const { data: existingPlayerWithSleeperId } = await supabase
            .from('players')
            .select('id, name')
            .eq('sleeper_id', sleeperMatch)
            .single();

          if (existingPlayerWithSleeperId) {
            // Sleeper ID already exists - this is a duplicate player
            unmappedPlayers.push(`${player.name} (duplicate - Sleeper ID ${sleeperMatch} already used by player ID ${existingPlayerWithSleeperId.id})`);
          } else {
            // No duplicate, safe to update
            const { error: updateError } = await supabase
              .from('players')
              .update({ sleeper_id: sleeperMatch })
              .eq('id', player.id);
            
            if (updateError) {
              console.error(`Error updating player ${player.name}:`, updateError);
              unmappedPlayers.push(`${player.name} (update failed)`);
            } else {
              mappedCount++;
            }
          }
        } else {
          unmappedPlayers.push(player.name);
        }
      }

      
      return {
        success: true,
        message: `Successfully mapped ${mappedCount} players to Sleeper IDs`,
        count: mappedCount,
      };
    } catch (error) {
      console.error('❌ Player mapping failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during player mapping',
      };
    }
  }

  /**
   * Decide which player to keep when duplicates are found
   */
  private shouldKeepExistingPlayer(oldPlayer: any, existingPlayer: any): boolean {
    // Keep the player that already has sleeper_id (more complete data)
    if (existingPlayer.sleeper_id && !oldPlayer.sleeper_id) {
      return true;
    }
    
    // Keep the player with a photo URL
    if (existingPlayer.photo_url && !oldPlayer.photo_url) {
      return true;
    }
    
    // Keep the player with a more recent team assignment
    if (existingPlayer.nfl_team_id && !oldPlayer.nfl_team_id) {
      return true;
    }
    
    // Default to keeping the existing player (the one with sleeper_id)
    return true;
  }

  /**
   * Normalize player name for comparison
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[.,]/g, '') // Remove periods and commas
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Check if two names match (including common variations)
   */
  private isNameMatch(existingName: string, sleeperName: string, sleeperPosition: string, existingPosition: string): boolean {
    // Position must match
    if (sleeperUtils.mapPosition(sleeperPosition) !== existingPosition) {
      return false;
    }

    const normalized1 = this.normalizeName(existingName);
    const normalized2 = this.normalizeName(sleeperName);
    
    // Handle defense naming
    if (existingPosition === 'DEF') {
      // "Chiefs Defense" vs "Kansas City Chiefs"
      const teamWords1 = normalized1.replace('defense', '').split(' ').filter(w => w.length > 2);
      const teamWords2 = normalized2.split(' ').filter(w => w.length > 2);
      
      return teamWords1.some(word1 => 
        teamWords2.some(word2 => 
          word1.includes(word2) || word2.includes(word1)
        )
      );
    }
    
    // Handle common name variations
    const firstLast1 = normalized1.split(' ');
    const firstLast2 = normalized2.split(' ');
    
    if (firstLast1.length >= 2 && firstLast2.length >= 2) {
      const firstName1 = firstLast1[0];
      const lastName1 = firstLast1[firstLast1.length - 1];
      const firstName2 = firstLast2[0];
      const lastName2 = firstLast2[firstLast2.length - 1];
      
      // Last name must match exactly
      if (lastName1 === lastName2) {
        // First name can be initial or full match
        return firstName1.startsWith(firstName2.charAt(0)) || 
               firstName2.startsWith(firstName1.charAt(0)) ||
               firstName1 === firstName2;
      }
    }
    
    return false;
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus(): Promise<{
    totalPlayers: number;
    totalTeams: number;
    lastStatsWeek: { season: number; week: number } | null;
    playersWithStats: number;
  }> {
    try {
      // Get total players
      const { count: totalPlayers } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true });

      // Get total teams
      const { count: totalTeams } = await supabase
        .from('nfl_teams')
        .select('*', { count: 'exact', head: true });

      // Get last stats week
      const { data: lastStats } = await supabase
        .from('player_stats')
        .select('season, week')
        .order('season', { ascending: false })
        .order('week', { ascending: false })
        .limit(1);

      // Get players with stats
      const { count: playersWithStats } = await supabase
        .from('player_stats')
        .select('player_id', { count: 'exact', head: true });

      return {
        totalPlayers: totalPlayers || 0,
        totalTeams: totalTeams || 0,
        lastStatsWeek: lastStats && lastStats.length > 0 ? lastStats[0] : null,
        playersWithStats: playersWithStats || 0,
      };
    } catch (error) {
      console.error('❌ Failed to get sync status:', error);
      return {
        totalPlayers: 0,
        totalTeams: 0,
        lastStatsWeek: null,
        playersWithStats: 0,
      };
    }
  }
}

// Export singleton instance
export const sleeperSync = SleeperSyncService.getInstance();