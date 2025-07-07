import type {
  SleeperNFLState,
  SleeperPlayersResponse,
  SleeperStatsResponse,
  SleeperProjectionsResponse,
  SleeperPlayerStats,
  SleeperAPIError,
} from '@/types/sleeper';

const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1';
const SLEEPER_STATS_URL = 'https://api.sleeper.com';
const RATE_LIMIT_DELAY = 100; // 100ms delay between requests to stay under 1000/minute

class SleeperAPIService {
  private static instance: SleeperAPIService;
  private requestCount = 0;
  private lastRequestTime = 0;

  private constructor() {}

  public static getInstance(): SleeperAPIService {
    if (!SleeperAPIService.instance) {
      SleeperAPIService.instance = new SleeperAPIService();
    }
    return SleeperAPIService.instance;
  }

  private async makeRequest<T>(url: string): Promise<T> {
    // Rate limiting: ensure we don't exceed 1000 requests per minute
    const now = Date.now();
    if (now - this.lastRequestTime < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }

    this.requestCount++;
    this.lastRequestTime = Date.now();

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Sleeper API request failed: ${url}`, error);
      throw new SleeperAPIError(
        error instanceof Error ? error.message : 'Unknown error',
        `Failed to fetch data from ${url}`,
        500
      );
    }
  }

  /**
   * Get current NFL state (season, week, etc.)
   */
  async getNFLState(): Promise<SleeperNFLState> {
    const url = `${SLEEPER_BASE_URL}/state/nfl`;
    return this.makeRequest<SleeperNFLState>(url);
  }

  /**
   * Get all NFL players (large response ~5MB, cache recommended)
   */
  async getAllPlayers(): Promise<SleeperPlayersResponse> {
    const url = `${SLEEPER_BASE_URL}/players/nfl`;
    return this.makeRequest<SleeperPlayersResponse>(url);
  }

  /**
   * Get weekly stats for all players
   */
  async getWeeklyStats(
    season: number,
    week: number,
    seasonType: 'regular' | 'pre' | 'post' = 'regular'
  ): Promise<SleeperStatsResponse> {
    const url = `${SLEEPER_STATS_URL}/stats/nfl/${season}/${week}?season_type=${seasonType}`;
    return this.makeRequest<SleeperStatsResponse>(url);
  }

  /**
   * Get stats for a specific player
   */
  async getPlayerStats(
    playerId: string,
    season: number,
    week: number,
    seasonType: 'regular' | 'pre' | 'post' = 'regular'
  ): Promise<SleeperPlayerStats> {
    const url = `${SLEEPER_STATS_URL}/stats/nfl/player/${playerId}?season=${season}&week=${week}&season_type=${seasonType}`;
    return this.makeRequest<SleeperPlayerStats>(url);
  }

  /**
   * Get season stats for a specific player
   */
  async getPlayerSeasonStats(
    playerId: string,
    season: number,
    seasonType: 'regular' | 'pre' | 'post' = 'regular'
  ): Promise<SleeperPlayerStats> {
    const url = `${SLEEPER_STATS_URL}/stats/nfl/player/${playerId}?season=${season}&season_type=${seasonType}&grouping=season`;
    return this.makeRequest<SleeperPlayerStats>(url);
  }

  /**
   * Get weekly projections for all players
   */
  async getWeeklyProjections(
    season: number,
    week: number,
    seasonType: 'regular' | 'pre' | 'post' = 'regular'
  ): Promise<SleeperProjectionsResponse> {
    const url = `${SLEEPER_STATS_URL}/projections/nfl/${season}/${week}?season_type=${seasonType}`;
    return this.makeRequest<SleeperProjectionsResponse>(url);
  }

  /**
   * Get projections for a specific player
   */
  async getPlayerProjections(
    playerId: string,
    season: number,
    week: number,
    seasonType: 'regular' | 'pre' | 'post' = 'regular'
  ): Promise<SleeperProjectionsResponse[string]> {
    const url = `${SLEEPER_STATS_URL}/projections/nfl/player/${playerId}?season=${season}&week=${week}&season_type=${seasonType}`;
    return this.makeRequest<SleeperProjectionsResponse[string]>(url);
  }

  /**
   * Get stats for specific positions
   */
  async getPositionStats(
    season: number,
    week: number,
    position: string,
    seasonType: 'regular' | 'pre' | 'post' = 'regular'
  ): Promise<SleeperStatsResponse> {
    const url = `${SLEEPER_STATS_URL}/stats/nfl/${season}/${week}?season_type=${seasonType}&position=${position}`;
    return this.makeRequest<SleeperStatsResponse>(url);
  }

  /**
   * Get request count for rate limiting monitoring
   */
  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * Reset request count (useful for testing)
   */
  resetRequestCount(): void {
    this.requestCount = 0;
  }
}

// Custom error class for Sleeper API
class SleeperAPIError extends Error {
  constructor(
    public originalError: string,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'SleeperAPIError';
  }
}

// Export singleton instance
export const sleeperAPI = SleeperAPIService.getInstance();

// Export utility functions
export const sleeperUtils = {
  /**
   * Map Sleeper position to your database position format
   */
  mapPosition(sleeperPosition: string): string {
    const positionMap: { [key: string]: string } = {
      'QB': 'QB',
      'RB': 'RB',
      'WR': 'WR',
      'TE': 'TE',
      'K': 'K',
      'DEF': 'DEF',
      'DST': 'DEF', // Defense/Special Teams
    };
    return positionMap[sleeperPosition] || sleeperPosition;
  },

  /**
   * Get fantasy points based on scoring type
   */
  getFantasyPoints(stats: SleeperPlayerStats['stats'], scoringType: 'std' | 'ppr' | 'half_ppr' = 'std'): number {
    switch (scoringType) {
      case 'ppr':
        return stats.pts_ppr || 0;
      case 'half_ppr':
        return stats.pts_half_ppr || 0;
      default:
        return stats.pts_std || 0;
    }
  },

  /**
   * Check if player is active and has a team
   */
  isActivePlayer(player: SleeperPlayersResponse[string]): boolean {
    return player && player.active && player.team !== null && player.team !== undefined && player.team !== '';
  },

  /**
   * Filter players by fantasy positions
   */
  filterByFantasyPositions(
    players: SleeperPlayersResponse,
    positions: string[]
  ): SleeperPlayersResponse {
    const filtered: SleeperPlayersResponse = {};
    
    Object.entries(players).forEach(([id, player]) => {
      if (player.fantasy_positions.some(pos => positions.includes(pos))) {
        filtered[id] = player;
      }
    });
    
    return filtered;
  },

  /**
   * Get current season info
   */
  getCurrentSeason(): { season: number; isOffSeason: boolean } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    
    // NFL season typically runs from September to January
    if (month >= 9 || month <= 1) {
      return { season: year, isOffSeason: false };
    } else {
      return { season: year, isOffSeason: true };
    }
  },
};

export { SleeperAPIError };