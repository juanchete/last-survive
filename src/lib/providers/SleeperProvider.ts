/**
 * SleeperProvider Implementation
 * Uses Edge Function proxy for caching and reliability
 */

import { supabase } from '@/integrations/supabase/client'
import {
  BaseFantasyProvider,
  NFLState,
  PlayersMap,
  StatsMap,
  ProjectionsMap,
  ProviderResponse,
  ProviderConfig
} from './FantasyProvider'

export class SleeperProvider extends BaseFantasyProvider {
  readonly name = 'sleeper'
  private functionsUrl: string

  constructor(config: ProviderConfig = {}) {
    super(config)
    // Get the Edge Functions URL from Supabase client
    this.functionsUrl = `${supabase.supabaseUrl}/functions/v1`
  }

  /**
   * Get current NFL state
   */
  async getNFLState(): Promise<ProviderResponse<NFLState>> {
    try {
      const { data, error } = await supabase.functions.invoke('sleeper-proxy/state')
      
      if (error) {
        return { error: error.message }
      }
      
      return {
        data: data as NFLState,
        cached: data?.cached || false,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch NFL state'
      }
    }
  }

  /**
   * Get all players
   */
  async getAllPlayers(): Promise<ProviderResponse<PlayersMap>> {
    try {
      const { data, error } = await supabase.functions.invoke('sleeper-proxy/players')
      
      if (error) {
        return { error: error.message }
      }
      
      // Transform Sleeper player data to our format
      const players = this.transformSleeperPlayers(data)
      
      return {
        data: players,
        cached: data?.cached || false,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch players'
      }
    }
  }

  /**
   * Get weekly stats
   */
  async getWeeklyStats(
    season: number,
    week: number,
    seasonType: 'pre' | 'regular' | 'post' = 'regular'
  ): Promise<ProviderResponse<StatsMap>> {
    try {
      const { data, error } = await supabase.functions.invoke('sleeper-proxy/stats', {
        body: {
          season: season.toString(),
          week: week.toString(),
          season_type: seasonType
        }
      })
      
      if (error) {
        return { error: error.message }
      }
      
      // Transform Sleeper stats to our format
      const stats = this.transformSleeperStats(data)
      
      return {
        data: stats,
        cached: data?.cached || false,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch stats'
      }
    }
  }

  /**
   * Get weekly projections
   */
  async getWeeklyProjections(
    season: number,
    week: number,
    seasonType: 'pre' | 'regular' | 'post' = 'regular'
  ): Promise<ProviderResponse<ProjectionsMap>> {
    try {
      const { data, error } = await supabase.functions.invoke('sleeper-proxy/projections', {
        body: {
          season: season.toString(),
          week: week.toString(),
          season_type: seasonType
        }
      })
      
      if (error) {
        return { error: error.message }
      }
      
      // Transform Sleeper projections to our format
      const projections = this.transformSleeperProjections(data)
      
      return {
        data: projections,
        cached: data?.cached || false,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch projections'
      }
    }
  }

  /**
   * Alternative implementation using direct HTTP calls to Edge Function
   * Use this if supabase.functions.invoke is not available
   */
  private async fetchFromEdgeFunction(endpoint: string, params?: Record<string, string>): Promise<any> {
    const url = new URL(`${this.functionsUrl}/sleeper-proxy${endpoint}`)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }
    
    const response = await this.fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabase.auth.session()?.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || `HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    // Check if response includes cache metadata
    const cached = response.headers.get('X-Cache-Hit') === 'true'
    
    return { ...data, cached }
  }

  /**
   * Transform Sleeper player data to our format
   */
  private transformSleeperPlayers(sleeperData: any): PlayersMap {
    const players: PlayersMap = {}
    
    if (!sleeperData || typeof sleeperData !== 'object') {
      return players
    }
    
    Object.entries(sleeperData).forEach(([playerId, playerData]: [string, any]) => {
      players[playerId] = {
        player_id: playerId,
        first_name: playerData.first_name,
        last_name: playerData.last_name,
        full_name: playerData.full_name || `${playerData.first_name} ${playerData.last_name}`,
        search_full_name: playerData.search_full_name,
        position: playerData.position,
        team: playerData.team,
        status: playerData.status,
        active: playerData.active,
        age: playerData.age,
        years_exp: playerData.years_exp,
        college: playerData.college,
        height: playerData.height,
        weight: playerData.weight,
        birth_date: playerData.birth_date,
        birth_city: playerData.birth_city,
        birth_state: playerData.birth_state,
        birth_country: playerData.birth_country,
        fantasy_positions: playerData.fantasy_positions,
        depth_chart_position: playerData.depth_chart_position,
        depth_chart_order: playerData.depth_chart_order,
        injury_status: playerData.injury_status,
        injury_body_part: playerData.injury_body_part,
        injury_start_date: playerData.injury_start_date,
        injury_notes: playerData.injury_notes,
        practice_participation: playerData.practice_participation,
        practice_description: playerData.practice_description,
        news_updated: playerData.news_updated,
        metadata: playerData.metadata,
        // Cross-reference IDs from metadata if available
        gsis_id: playerData.gsis_id || playerData.metadata?.gsis_id,
        sportradar_id: playerData.sportradar_id || playerData.metadata?.sportradar_id,
        stats_id: playerData.stats_id || playerData.metadata?.stats_id,
        espn_id: playerData.espn_id || playerData.metadata?.espn_id,
        yahoo_id: playerData.yahoo_id || playerData.metadata?.yahoo_id,
        rotowire_id: playerData.rotowire_id || playerData.metadata?.rotowire_id,
        fantasypros_id: playerData.fantasypros_id || playerData.metadata?.fantasypros_id,
        pfr_id: playerData.pfr_id || playerData.metadata?.pfr_id
      }
    })
    
    return players
  }

  /**
   * Transform Sleeper stats to our format
   */
  private transformSleeperStats(sleeperData: any): StatsMap {
    const stats: StatsMap = {}
    
    if (!sleeperData || typeof sleeperData !== 'object') {
      return stats
    }
    
    Object.entries(sleeperData).forEach(([playerId, playerStats]: [string, any]) => {
      if (!playerStats || typeof playerStats !== 'object') {
        return
      }
      
      // Extract points if available
      const points: any = {}
      if (playerStats.pts_ppr !== undefined) points.ppr = playerStats.pts_ppr
      if (playerStats.pts_half_ppr !== undefined) points.half_ppr = playerStats.pts_half_ppr
      if (playerStats.pts_std !== undefined) points.standard = playerStats.pts_std
      
      // Remove points from stats object
      const statsData = { ...playerStats }
      delete statsData.pts_ppr
      delete statsData.pts_half_ppr
      delete statsData.pts_std
      
      stats[playerId] = {
        player_id: playerId,
        stats: statsData,
        points: Object.keys(points).length > 0 ? points : undefined
      }
    })
    
    return stats
  }

  /**
   * Transform Sleeper projections to our format
   */
  private transformSleeperProjections(sleeperData: any): ProjectionsMap {
    const projections: ProjectionsMap = {}
    
    if (!sleeperData || typeof sleeperData !== 'object') {
      return projections
    }
    
    Object.entries(sleeperData).forEach(([playerId, playerProjection]: [string, any]) => {
      if (!playerProjection || typeof playerProjection !== 'object') {
        return
      }
      
      // Extract points if available
      const points: any = {}
      if (playerProjection.pts_ppr !== undefined) points.ppr = playerProjection.pts_ppr
      if (playerProjection.pts_half_ppr !== undefined) points.half_ppr = playerProjection.pts_half_ppr
      if (playerProjection.pts_std !== undefined) points.standard = playerProjection.pts_std
      
      // Remove points from projection object
      const projectionData = { ...playerProjection }
      delete projectionData.pts_ppr
      delete projectionData.pts_half_ppr
      delete projectionData.pts_std
      
      projections[playerId] = {
        player_id: playerId,
        stats: projectionData,
        points: Object.keys(points).length > 0 ? points : undefined
      }
    })
    
    return projections
  }

  /**
   * Health check for Sleeper provider
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    try {
      const { data, error } = await supabase.functions.invoke('sleeper-proxy/health')
      
      if (error) {
        return { 
          healthy: false,
          details: error.message
        }
      }
      
      return {
        healthy: data?.status === 'healthy',
        details: data
      }
    } catch (error) {
      return {
        healthy: false,
        details: error instanceof Error ? error.message : 'Health check failed'
      }
    }
  }
}

// Export singleton instance for convenience
export const sleeperProvider = new SleeperProvider()

// Export factory function for testing
export function createSleeperProvider(config?: ProviderConfig): SleeperProvider {
  return new SleeperProvider(config)
}