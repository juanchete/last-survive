/**
 * FantasyProvider Interface
 * Abstraction layer for fantasy football data providers
 */

export interface NFLState {
  week: number
  season_type: 'pre' | 'regular' | 'post'
  season: string
  previous_season: string
  display_week: number
  leg: number
  league_create_season: string
  league_season: string
  week_date?: string
  season_start_date?: string
}

export interface NFLPlayer {
  player_id: string
  first_name?: string
  last_name?: string
  full_name?: string
  search_full_name?: string
  position?: string
  team?: string
  status?: string
  active?: boolean
  age?: number
  years_exp?: number
  college?: string
  height?: string
  weight?: string
  birth_date?: string
  birth_city?: string
  birth_state?: string
  birth_country?: string
  fantasy_positions?: string[]
  depth_chart_position?: string
  depth_chart_order?: number
  injury_status?: string
  injury_body_part?: string
  injury_start_date?: string
  injury_notes?: string
  practice_participation?: string
  practice_description?: string
  news_updated?: number
  metadata?: {
    [key: string]: any
  }
  // Cross-reference IDs
  gsis_id?: string
  sportradar_id?: string
  stats_id?: string
  espn_id?: string
  yahoo_id?: string
  rotowire_id?: string
  fantasypros_id?: string
  pfr_id?: string
}

export interface PlayerStats {
  player_id: string
  stats: {
    [key: string]: number
  }
  points?: {
    ppr?: number
    half_ppr?: number
    standard?: number
  }
}

export interface PlayerProjection {
  player_id: string
  stats: {
    [key: string]: number | string
  }
  points?: {
    ppr?: number
    half_ppr?: number
    standard?: number
  }
  player_name?: string
}

export interface PlayersMap {
  [player_id: string]: NFLPlayer
}

export interface StatsMap {
  [player_id: string]: PlayerStats
}

export interface ProjectionsMap {
  [player_id: string]: PlayerProjection
}

export interface ProviderResponse<T> {
  data?: T
  error?: string
  cached?: boolean
  timestamp?: string
}

export interface ProviderConfig {
  baseUrl?: string
  apiKey?: string
  timeout?: number
  retryAttempts?: number
  cacheEnabled?: boolean
}

/**
 * Base interface for all fantasy data providers
 */
export interface FantasyProvider {
  /**
   * Provider name for identification
   */
  readonly name: string

  /**
   * Get current NFL state including week, season, etc.
   */
  getNFLState(): Promise<ProviderResponse<NFLState>>

  /**
   * Get all NFL players with metadata
   */
  getAllPlayers(): Promise<ProviderResponse<PlayersMap>>

  /**
   * Get player by ID
   */
  getPlayer(playerId: string): Promise<ProviderResponse<NFLPlayer>>

  /**
   * Get weekly stats for all players
   */
  getWeeklyStats(
    season: number,
    week: number,
    seasonType?: 'pre' | 'regular' | 'post'
  ): Promise<ProviderResponse<StatsMap>>

  /**
   * Get weekly projections for all players
   */
  getWeeklyProjections(
    season: number,
    week: number,
    seasonType?: 'pre' | 'regular' | 'post'
  ): Promise<ProviderResponse<ProjectionsMap>>

  /**
   * Get player stats
   */
  getPlayerStats(
    playerId: string,
    season: number,
    week: number,
    seasonType?: 'pre' | 'regular' | 'post'
  ): Promise<ProviderResponse<PlayerStats>>

  /**
   * Get player projection
   */
  getPlayerProjection(
    playerId: string,
    season: number,
    week: number,
    seasonType?: 'pre' | 'regular' | 'post'
  ): Promise<ProviderResponse<PlayerProjection>>

  /**
   * Search players by name
   */
  searchPlayers(query: string): Promise<ProviderResponse<NFLPlayer[]>>

  /**
   * Get players by position
   */
  getPlayersByPosition(position: string): Promise<ProviderResponse<NFLPlayer[]>>

  /**
   * Get players by team
   */
  getPlayersByTeam(team: string): Promise<ProviderResponse<NFLPlayer[]>>

  /**
   * Health check for provider
   */
  healthCheck(): Promise<{ healthy: boolean; details?: any }>
}

/**
 * Base abstract class for providers with common functionality
 */
export abstract class BaseFantasyProvider implements FantasyProvider {
  abstract readonly name: string
  protected config: ProviderConfig

  constructor(config: ProviderConfig = {}) {
    this.config = {
      timeout: 15000,
      retryAttempts: 3,
      cacheEnabled: true,
      ...config
    }
  }

  abstract getNFLState(): Promise<ProviderResponse<NFLState>>
  abstract getAllPlayers(): Promise<ProviderResponse<PlayersMap>>
  abstract getWeeklyStats(
    season: number,
    week: number,
    seasonType?: 'pre' | 'regular' | 'post'
  ): Promise<ProviderResponse<StatsMap>>
  abstract getWeeklyProjections(
    season: number,
    week: number,
    seasonType?: 'pre' | 'regular' | 'post'
  ): Promise<ProviderResponse<ProjectionsMap>>

  /**
   * Default implementation for getPlayer using getAllPlayers
   */
  async getPlayer(playerId: string): Promise<ProviderResponse<NFLPlayer>> {
    const response = await this.getAllPlayers()
    if (response.error) {
      return { error: response.error }
    }
    
    const player = response.data?.[playerId]
    if (!player) {
      return { error: `Player ${playerId} not found` }
    }
    
    return { 
      data: player,
      cached: response.cached,
      timestamp: response.timestamp
    }
  }

  /**
   * Default implementation for getPlayerStats using getWeeklyStats
   */
  async getPlayerStats(
    playerId: string,
    season: number,
    week: number,
    seasonType?: 'pre' | 'regular' | 'post'
  ): Promise<ProviderResponse<PlayerStats>> {
    const response = await this.getWeeklyStats(season, week, seasonType)
    if (response.error) {
      return { error: response.error }
    }
    
    const stats = response.data?.[playerId]
    if (!stats) {
      return { error: `Stats for player ${playerId} not found` }
    }
    
    return { 
      data: stats,
      cached: response.cached,
      timestamp: response.timestamp
    }
  }

  /**
   * Default implementation for getPlayerProjection using getWeeklyProjections
   */
  async getPlayerProjection(
    playerId: string,
    season: number,
    week: number,
    seasonType?: 'pre' | 'regular' | 'post'
  ): Promise<ProviderResponse<PlayerProjection>> {
    const response = await this.getWeeklyProjections(season, week, seasonType)
    if (response.error) {
      return { error: response.error }
    }
    
    const projection = response.data?.[playerId]
    if (!projection) {
      return { error: `Projection for player ${playerId} not found` }
    }
    
    return { 
      data: projection,
      cached: response.cached,
      timestamp: response.timestamp
    }
  }

  /**
   * Default implementation for searchPlayers
   */
  async searchPlayers(query: string): Promise<ProviderResponse<NFLPlayer[]>> {
    const response = await this.getAllPlayers()
    if (response.error) {
      return { error: response.error }
    }
    
    const players = Object.values(response.data || {})
    const searchQuery = query.toLowerCase()
    
    const results = players.filter(player => {
      const fullName = player.full_name?.toLowerCase() || ''
      const searchName = player.search_full_name?.toLowerCase() || ''
      const lastName = player.last_name?.toLowerCase() || ''
      
      return fullName.includes(searchQuery) ||
             searchName.includes(searchQuery) ||
             lastName.includes(searchQuery)
    })
    
    return { 
      data: results,
      cached: response.cached,
      timestamp: response.timestamp
    }
  }

  /**
   * Default implementation for getPlayersByPosition
   */
  async getPlayersByPosition(position: string): Promise<ProviderResponse<NFLPlayer[]>> {
    const response = await this.getAllPlayers()
    if (response.error) {
      return { error: response.error }
    }
    
    const players = Object.values(response.data || {})
    const results = players.filter(player => 
      player.position === position ||
      player.fantasy_positions?.includes(position)
    )
    
    return { 
      data: results,
      cached: response.cached,
      timestamp: response.timestamp
    }
  }

  /**
   * Default implementation for getPlayersByTeam
   */
  async getPlayersByTeam(team: string): Promise<ProviderResponse<NFLPlayer[]>> {
    const response = await this.getAllPlayers()
    if (response.error) {
      return { error: response.error }
    }
    
    const players = Object.values(response.data || {})
    const results = players.filter(player => player.team === team)
    
    return { 
      data: results,
      cached: response.cached,
      timestamp: response.timestamp
    }
  }

  /**
   * Default health check implementation
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    try {
      const response = await this.getNFLState()
      return { 
        healthy: !response.error,
        details: response.error || response.data
      }
    } catch (error) {
      return { 
        healthy: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Helper method for making HTTP requests with retry logic
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    attempt = 0
  ): Promise<Response> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.config.timeout!)
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      
      clearTimeout(timeout)
      
      if (!response.ok && attempt < this.config.retryAttempts! - 1) {
        await this.sleep(Math.pow(2, attempt) * 1000)
        return this.fetchWithRetry(url, options, attempt + 1)
      }
      
      return response
    } catch (error) {
      if (attempt < this.config.retryAttempts! - 1) {
        await this.sleep(Math.pow(2, attempt) * 1000)
        return this.fetchWithRetry(url, options, attempt + 1)
      }
      throw error
    }
  }

  /**
   * Helper method for sleep/delay
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}