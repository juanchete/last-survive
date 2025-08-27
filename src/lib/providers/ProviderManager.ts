/**
 * ProviderManager - Manages multiple fantasy data providers
 * Provides provider selection, fallback support, and unified interface
 */

import { 
  FantasyProvider, 
  NFLState, 
  PlayersMap, 
  StatsMap, 
  ProjectionsMap,
  ProviderResponse,
  NFLPlayer,
  PlayerStats,
  PlayerProjection
} from './FantasyProvider';
import { SleeperProvider, sleeperProvider } from './SleeperProvider';
import { SportsDataProvider, sportsDataProvider } from './SportsDataProvider';

export type ProviderName = 'sleeper' | 'sportsdata';

export interface ProviderManagerConfig {
  primaryProvider: ProviderName;
  fallbackProvider?: ProviderName;
  enableFallback: boolean;
  cacheResults: boolean;
  logErrors: boolean;
}

export class ProviderManager implements FantasyProvider {
  readonly name = 'provider-manager';
  private providers: Map<ProviderName, FantasyProvider>;
  private config: ProviderManagerConfig;
  private lastHealthCheck: Map<ProviderName, { healthy: boolean; timestamp: number }>;
  private healthCheckInterval = 60000; // 1 minute

  constructor(config?: Partial<ProviderManagerConfig>) {
    this.config = {
      primaryProvider: 'sleeper',
      fallbackProvider: 'sportsdata',
      enableFallback: true,
      cacheResults: true,
      logErrors: true,
      ...config
    };

    // Initialize providers
    this.providers = new Map();
    this.providers.set('sleeper', sleeperProvider);
    this.providers.set('sportsdata', sportsDataProvider);
    
    this.lastHealthCheck = new Map();
  }

  /**
   * Get the active provider based on configuration and health
   */
  private async getActiveProvider(): Promise<FantasyProvider> {
    const primary = this.providers.get(this.config.primaryProvider);
    if (!primary) {
      throw new Error(`Primary provider ${this.config.primaryProvider} not found`);
    }

    // Check if we need to verify health
    const shouldCheckHealth = await this.shouldCheckProviderHealth(this.config.primaryProvider);
    if (!shouldCheckHealth) {
      return primary;
    }

    // Check primary provider health
    const primaryHealth = await this.checkProviderHealth(this.config.primaryProvider);
    if (primaryHealth) {
      return primary;
    }

    // Try fallback if enabled
    if (this.config.enableFallback && this.config.fallbackProvider) {
      const fallback = this.providers.get(this.config.fallbackProvider);
      if (!fallback) {
        throw new Error(`Fallback provider ${this.config.fallbackProvider} not found`);
      }

      const fallbackHealth = await this.checkProviderHealth(this.config.fallbackProvider);
      if (fallbackHealth) {
        if (this.config.logErrors) {
          console.warn(`Primary provider ${this.config.primaryProvider} unhealthy, using fallback ${this.config.fallbackProvider}`);
        }
        return fallback;
      }
    }

    // Both providers unhealthy, use primary anyway
    if (this.config.logErrors) {
      console.error('All providers unhealthy, using primary provider anyway');
    }
    return primary;
  }

  /**
   * Check if we should verify provider health (rate limited)
   */
  private async shouldCheckProviderHealth(providerName: ProviderName): Promise<boolean> {
    const lastCheck = this.lastHealthCheck.get(providerName);
    if (!lastCheck) return true;
    
    const now = Date.now();
    return (now - lastCheck.timestamp) > this.healthCheckInterval;
  }

  /**
   * Check provider health and cache result
   */
  private async checkProviderHealth(providerName: ProviderName): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) return false;

    try {
      const health = await provider.healthCheck();
      this.lastHealthCheck.set(providerName, {
        healthy: health.healthy,
        timestamp: Date.now()
      });
      return health.healthy;
    } catch (error) {
      if (this.config.logErrors) {
        console.error(`Health check failed for ${providerName}:`, error);
      }
      this.lastHealthCheck.set(providerName, {
        healthy: false,
        timestamp: Date.now()
      });
      return false;
    }
  }

  /**
   * Execute with fallback support
   */
  private async executeWithFallback<T>(
    operation: (provider: FantasyProvider) => Promise<ProviderResponse<T>>
  ): Promise<ProviderResponse<T>> {
    const primary = this.providers.get(this.config.primaryProvider);
    if (!primary) {
      return { error: `Primary provider ${this.config.primaryProvider} not found` };
    }

    try {
      // Try primary provider
      const result = await operation(primary);
      if (!result.error) {
        return { ...result, provider: this.config.primaryProvider };
      }

      // Primary failed, try fallback if enabled
      if (this.config.enableFallback && this.config.fallbackProvider) {
        const fallback = this.providers.get(this.config.fallbackProvider);
        if (!fallback) {
          return result; // Return primary error if fallback not found
        }

        if (this.config.logErrors) {
          console.warn(`Primary provider failed, trying fallback: ${result.error}`);
        }

        const fallbackResult = await operation(fallback);
        return { ...fallbackResult, provider: this.config.fallbackProvider };
      }

      return result;
    } catch (error) {
      if (this.config.logErrors) {
        console.error('Provider operation failed:', error);
      }
      return { 
        error: error instanceof Error ? error.message : 'Provider operation failed' 
      };
    }
  }

  /**
   * Get current NFL state
   */
  async getNFLState(): Promise<ProviderResponse<NFLState>> {
    return this.executeWithFallback(provider => provider.getNFLState());
  }

  /**
   * Get all NFL players
   */
  async getAllPlayers(): Promise<ProviderResponse<PlayersMap>> {
    return this.executeWithFallback(provider => provider.getAllPlayers());
  }

  /**
   * Get player by ID
   */
  async getPlayer(playerId: string): Promise<ProviderResponse<NFLPlayer>> {
    return this.executeWithFallback(provider => provider.getPlayer(playerId));
  }

  /**
   * Get weekly stats
   */
  async getWeeklyStats(
    season: number,
    week: number,
    seasonType?: 'pre' | 'regular' | 'post'
  ): Promise<ProviderResponse<StatsMap>> {
    return this.executeWithFallback(provider => 
      provider.getWeeklyStats(season, week, seasonType)
    );
  }

  /**
   * Get weekly projections
   */
  async getWeeklyProjections(
    season: number,
    week: number,
    seasonType?: 'pre' | 'regular' | 'post'
  ): Promise<ProviderResponse<ProjectionsMap>> {
    return this.executeWithFallback(provider => 
      provider.getWeeklyProjections(season, week, seasonType)
    );
  }

  /**
   * Get player stats
   */
  async getPlayerStats(
    playerId: string,
    season: number,
    week: number,
    seasonType?: 'pre' | 'regular' | 'post'
  ): Promise<ProviderResponse<PlayerStats>> {
    return this.executeWithFallback(provider => 
      provider.getPlayerStats(playerId, season, week, seasonType)
    );
  }

  /**
   * Get player projection
   */
  async getPlayerProjection(
    playerId: string,
    season: number,
    week: number,
    seasonType?: 'pre' | 'regular' | 'post'
  ): Promise<ProviderResponse<PlayerProjection>> {
    return this.executeWithFallback(provider => 
      provider.getPlayerProjection(playerId, season, week, seasonType)
    );
  }

  /**
   * Search players
   */
  async searchPlayers(query: string): Promise<ProviderResponse<NFLPlayer[]>> {
    return this.executeWithFallback(provider => provider.searchPlayers(query));
  }

  /**
   * Get players by position
   */
  async getPlayersByPosition(position: string): Promise<ProviderResponse<NFLPlayer[]>> {
    return this.executeWithFallback(provider => provider.getPlayersByPosition(position));
  }

  /**
   * Get players by team
   */
  async getPlayersByTeam(team: string): Promise<ProviderResponse<NFLPlayer[]>> {
    return this.executeWithFallback(provider => provider.getPlayersByTeam(team));
  }

  /**
   * Health check for provider manager
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    const results: Record<string, any> = {};
    let anyHealthy = false;

    for (const [name, provider] of this.providers) {
      try {
        const health = await provider.healthCheck();
        results[name] = health;
        if (health.healthy) {
          anyHealthy = true;
        }
      } catch (error) {
        results[name] = {
          healthy: false,
          error: error instanceof Error ? error.message : 'Health check failed'
        };
      }
    }

    return {
      healthy: anyHealthy,
      details: {
        providers: results,
        primaryProvider: this.config.primaryProvider,
        fallbackProvider: this.config.fallbackProvider,
        fallbackEnabled: this.config.enableFallback
      }
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ProviderManagerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ProviderManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Switch primary provider
   */
  switchProvider(providerName: ProviderName): void {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider ${providerName} not found`);
    }
    this.config.primaryProvider = providerName;
  }

  /**
   * Get provider statistics
   */
  async getProviderStats(): Promise<Record<ProviderName, any>> {
    const stats: Record<string, any> = {};

    for (const [name, provider] of this.providers) {
      const health = await provider.healthCheck();
      const lastCheck = this.lastHealthCheck.get(name as ProviderName);
      
      stats[name] = {
        name,
        healthy: health.healthy,
        lastHealthCheck: lastCheck?.timestamp 
          ? new Date(lastCheck.timestamp).toISOString() 
          : null,
        isPrimary: name === this.config.primaryProvider,
        isFallback: name === this.config.fallbackProvider,
        details: health.details
      };
    }

    return stats;
  }

  /**
   * Get the current active provider name
   */
  getActiveProvider(): ProviderName {
    return this.config.primaryProvider;
  }

  /**
   * Get a specific provider instance
   */
  getProvider(name: ProviderName): FantasyProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Test all providers
   */
  async testAllProviders(): Promise<Record<ProviderName, { success: boolean; error?: string }>> {
    const results: Record<string, { success: boolean; error?: string }> = {};

    for (const [name, provider] of this.providers) {
      try {
        const state = await provider.getNFLState();
        results[name] = {
          success: !state.error,
          error: state.error
        };
      } catch (error) {
        results[name] = {
          success: false,
          error: error instanceof Error ? error.message : 'Test failed'
        };
      }
    }

    return results;
  }
}

// Export singleton instance
export const providerManager = new ProviderManager();

// Export factory function for testing
export function createProviderManager(
  config?: Partial<ProviderManagerConfig>
): ProviderManager {
  return new ProviderManager(config);
}