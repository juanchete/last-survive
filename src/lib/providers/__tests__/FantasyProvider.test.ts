/**
 * Unit tests for FantasyProvider base class
 */

import { BaseFantasyProvider, ProviderConfig, ProviderResponse, NFLState, PlayersMap, StatsMap, ProjectionsMap } from '../FantasyProvider';

// Mock concrete implementation for testing
class TestProvider extends BaseFantasyProvider {
  name = 'test';
  
  async getNFLState(): Promise<ProviderResponse<NFLState>> {
    return {
      data: {
        week: 10,
        season_type: 'regular',
        season: '2024',
        previous_season: '2023',
        display_week: 10,
        leg: 10,
        league_create_season: '2024',
        league_season: '2024'
      }
    };
  }

  async getAllPlayers(): Promise<ProviderResponse<PlayersMap>> {
    return {
      data: {
        '12345': {
          player_id: '12345',
          full_name: 'Test Player',
          position: 'QB',
          team: 'TST',
          active: true
        },
        '67890': {
          player_id: '67890',
          full_name: 'Another Player',
          position: 'WR',
          team: 'TST',
          active: true
        }
      }
    };
  }

  async getWeeklyStats(season: number, week: number): Promise<ProviderResponse<StatsMap>> {
    return {
      data: {
        '12345': {
          player_id: '12345',
          stats: { pass_yd: 300, pass_td: 2 },
          points: { ppr: 25.5 }
        }
      }
    };
  }

  async getWeeklyProjections(season: number, week: number): Promise<ProviderResponse<ProjectionsMap>> {
    return {
      data: {
        '12345': {
          player_id: '12345',
          stats: { pass_yd: 280, pass_td: 2 },
          points: { ppr: 23.5 }
        }
      }
    };
  }
}

describe('BaseFantasyProvider', () => {
  let provider: TestProvider;
  
  beforeEach(() => {
    provider = new TestProvider();
  });

  describe('constructor', () => {
    it('should use default config values', () => {
      const defaultProvider = new TestProvider();
      expect(defaultProvider['config'].timeout).toBe(15000);
      expect(defaultProvider['config'].retryAttempts).toBe(3);
      expect(defaultProvider['config'].cacheEnabled).toBe(true);
    });

    it('should override config with provided values', () => {
      const customProvider = new TestProvider({
        timeout: 30000,
        retryAttempts: 5,
        cacheEnabled: false
      });
      expect(customProvider['config'].timeout).toBe(30000);
      expect(customProvider['config'].retryAttempts).toBe(5);
      expect(customProvider['config'].cacheEnabled).toBe(false);
    });
  });

  describe('getPlayer', () => {
    it('should get a specific player by ID', async () => {
      const result = await provider.getPlayer('12345');
      expect(result.error).toBeUndefined();
      expect(result.data?.player_id).toBe('12345');
      expect(result.data?.full_name).toBe('Test Player');
    });

    it('should return error for non-existent player', async () => {
      const result = await provider.getPlayer('99999');
      expect(result.error).toBe('Player 99999 not found');
      expect(result.data).toBeUndefined();
    });

    it('should propagate error from getAllPlayers', async () => {
      jest.spyOn(provider, 'getAllPlayers').mockResolvedValueOnce({
        error: 'Network error'
      });
      
      const result = await provider.getPlayer('12345');
      expect(result.error).toBe('Network error');
    });
  });

  describe('getPlayerStats', () => {
    it('should get stats for a specific player', async () => {
      const result = await provider.getPlayerStats('12345', 2024, 10);
      expect(result.error).toBeUndefined();
      expect(result.data?.player_id).toBe('12345');
      expect(result.data?.stats.pass_yd).toBe(300);
    });

    it('should return error for non-existent player stats', async () => {
      const result = await provider.getPlayerStats('99999', 2024, 10);
      expect(result.error).toBe('Stats for player 99999 not found');
    });

    it('should propagate error from getWeeklyStats', async () => {
      jest.spyOn(provider, 'getWeeklyStats').mockResolvedValueOnce({
        error: 'API error'
      });
      
      const result = await provider.getPlayerStats('12345', 2024, 10);
      expect(result.error).toBe('API error');
    });
  });

  describe('getPlayerProjection', () => {
    it('should get projection for a specific player', async () => {
      const result = await provider.getPlayerProjection('12345', 2024, 10);
      expect(result.error).toBeUndefined();
      expect(result.data?.player_id).toBe('12345');
      expect(result.data?.stats.pass_yd).toBe(280);
    });

    it('should return error for non-existent player projection', async () => {
      const result = await provider.getPlayerProjection('99999', 2024, 10);
      expect(result.error).toBe('Projection for player 99999 not found');
    });
  });

  describe('searchPlayers', () => {
    it('should search players by full name', async () => {
      const result = await provider.searchPlayers('test');
      expect(result.error).toBeUndefined();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].full_name).toBe('Test Player');
    });

    it('should search players by last name', async () => {
      jest.spyOn(provider, 'getAllPlayers').mockResolvedValueOnce({
        data: {
          '12345': {
            player_id: '12345',
            full_name: 'John Smith',
            last_name: 'Smith'
          },
          '67890': {
            player_id: '67890',
            full_name: 'Jane Doe',
            last_name: 'Doe'
          }
        }
      });

      const result = await provider.searchPlayers('smith');
      expect(result.data).toHaveLength(1);
      expect(result.data![0].last_name).toBe('Smith');
    });

    it('should return empty array for no matches', async () => {
      const result = await provider.searchPlayers('nonexistent');
      expect(result.error).toBeUndefined();
      expect(result.data).toHaveLength(0);
    });

    it('should handle case-insensitive search', async () => {
      const result = await provider.searchPlayers('TEST');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getPlayersByPosition', () => {
    it('should get players by exact position', async () => {
      const result = await provider.getPlayersByPosition('QB');
      expect(result.error).toBeUndefined();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].position).toBe('QB');
    });

    it('should get players by fantasy position', async () => {
      jest.spyOn(provider, 'getAllPlayers').mockResolvedValueOnce({
        data: {
          '12345': {
            player_id: '12345',
            position: 'RB',
            fantasy_positions: ['RB', 'FLEX']
          },
          '67890': {
            player_id: '67890',
            position: 'WR',
            fantasy_positions: ['WR', 'FLEX']
          }
        }
      });

      const result = await provider.getPlayersByPosition('FLEX');
      expect(result.data).toHaveLength(2);
    });

    it('should return empty array for invalid position', async () => {
      const result = await provider.getPlayersByPosition('INVALID');
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getPlayersByTeam', () => {
    it('should get players by team', async () => {
      const result = await provider.getPlayersByTeam('TST');
      expect(result.error).toBeUndefined();
      expect(result.data).toHaveLength(2);
      expect(result.data![0].team).toBe('TST');
      expect(result.data![1].team).toBe('TST');
    });

    it('should return empty array for non-existent team', async () => {
      const result = await provider.getPlayersByTeam('XXX');
      expect(result.data).toHaveLength(0);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy when getNFLState succeeds', async () => {
      const result = await provider.healthCheck();
      expect(result.healthy).toBe(true);
      expect(result.details).toBeDefined();
    });

    it('should return unhealthy when getNFLState fails', async () => {
      jest.spyOn(provider, 'getNFLState').mockResolvedValueOnce({
        error: 'Service unavailable'
      });

      const result = await provider.healthCheck();
      expect(result.healthy).toBe(false);
      expect(result.details).toBe('Service unavailable');
    });

    it('should handle exceptions in getNFLState', async () => {
      jest.spyOn(provider, 'getNFLState').mockRejectedValueOnce(
        new Error('Connection timeout')
      );

      const result = await provider.healthCheck();
      expect(result.healthy).toBe(false);
      expect(result.details).toBe('Connection timeout');
    });
  });

  describe('fetchWithRetry', () => {
    let fetchSpy: jest.SpyInstance;
    
    beforeEach(() => {
      // Mock global fetch
      global.fetch = jest.fn();
      fetchSpy = global.fetch as jest.Mock;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should succeed on first attempt', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('{"data": "test"}', { status: 200 }));
      
      const response = await provider['fetchWithRetry']('https://api.test.com');
      expect(response.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      fetchSpy
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(new Response('{"data": "test"}', { status: 200 }));
      
      const response = await provider['fetchWithRetry']('https://api.test.com');
      expect(response.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 errors', async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response('Server error', { status: 500 }))
        .mockResolvedValueOnce(new Response('{"data": "test"}', { status: 200 }));
      
      const response = await provider['fetchWithRetry']('https://api.test.com');
      expect(response.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));
      
      await expect(
        provider['fetchWithRetry']('https://api.test.com')
      ).rejects.toThrow('Network error');
      
      expect(fetchSpy).toHaveBeenCalledTimes(3); // Default retryAttempts
    });

    it('should respect custom retry attempts', async () => {
      const customProvider = new TestProvider({ retryAttempts: 2 });
      fetchSpy.mockRejectedValue(new Error('Network error'));
      
      await expect(
        customProvider['fetchWithRetry']('https://api.test.com')
      ).rejects.toThrow('Network error');
      
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle timeout', async () => {
      const customProvider = new TestProvider({ timeout: 100 });
      
      fetchSpy.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(new Response()), 200))
      );
      
      await expect(
        customProvider['fetchWithRetry']('https://api.test.com')
      ).rejects.toThrow();
    });
  });

  describe('sleep', () => {
    it('should delay for specified time', async () => {
      const start = Date.now();
      await provider['sleep'](100);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some variance
      expect(elapsed).toBeLessThan(150);
    });
  });
});