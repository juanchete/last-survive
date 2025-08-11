/**
 * Unit tests for SleeperProvider
 */

import { SleeperProvider } from '../SleeperProvider';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    supabaseUrl: 'https://test.supabase.co',
    auth: {
      session: () => ({ access_token: 'test-token' })
    },
    functions: {
      invoke: jest.fn()
    }
  }
}));

describe('SleeperProvider', () => {
  let provider: SleeperProvider;
  const mockInvoke = supabase.functions.invoke as jest.Mock;

  beforeEach(() => {
    provider = new SleeperProvider();
    jest.clearAllMocks();
  });

  describe('getNFLState', () => {
    it('should fetch NFL state successfully', async () => {
      const mockState = {
        week: 10,
        season_type: 'regular',
        season: '2024',
        previous_season: '2023',
        display_week: 10,
        leg: 10,
        league_create_season: '2024',
        league_season: '2024'
      };

      mockInvoke.mockResolvedValueOnce({
        data: mockState,
        error: null
      });

      const result = await provider.getNFLState();

      expect(mockInvoke).toHaveBeenCalledWith('sleeper-proxy/state');
      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockState);
    });

    it('should handle errors when fetching NFL state', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error' }
      });

      const result = await provider.getNFLState();

      expect(result.error).toBe('Network error');
      expect(result.data).toBeUndefined();
    });

    it('should include cache metadata when available', async () => {
      const mockState = { week: 10, season: '2024' };
      mockInvoke.mockResolvedValueOnce({
        data: { ...mockState, cached: true },
        error: null
      });

      const result = await provider.getNFLState();

      expect(result.cached).toBe(true);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getAllPlayers', () => {
    it('should fetch and transform players correctly', async () => {
      const mockSleeperPlayer = {
        player_id: '12345',
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'John Doe',
        position: 'QB',
        team: 'KC',
        status: 'Active',
        active: true,
        age: 28,
        years_exp: 5,
        metadata: {
          avatar_url: 'https://example.com/avatar.jpg'
        },
        gsis_id: 'gsis123',
        espn_id: 'espn456'
      };

      mockInvoke.mockResolvedValueOnce({
        data: { '12345': mockSleeperPlayer },
        error: null
      });

      const result = await provider.getAllPlayers();

      expect(mockInvoke).toHaveBeenCalledWith('sleeper-proxy/players');
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data!['12345']).toMatchObject({
        player_id: '12345',
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'John Doe',
        position: 'QB',
        team: 'KC',
        gsis_id: 'gsis123',
        espn_id: 'espn456'
      });
    });

    it('should handle empty player response', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {},
        error: null
      });

      const result = await provider.getAllPlayers();

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({});
    });

    it('should handle null data gracefully', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await provider.getAllPlayers();

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({});
    });
  });

  describe('getWeeklyStats', () => {
    it('should fetch and transform weekly stats', async () => {
      const mockStats = {
        '12345': {
          pts_ppr: 25.5,
          pts_half_ppr: 22.5,
          pts_std: 19.5,
          pass_yd: 300,
          pass_td: 2,
          rush_yd: 20,
          rush_td: 1
        }
      };

      mockInvoke.mockResolvedValueOnce({
        data: mockStats,
        error: null
      });

      const result = await provider.getWeeklyStats(2024, 10, 'regular');

      expect(mockInvoke).toHaveBeenCalledWith('sleeper-proxy/stats', {
        body: {
          season: '2024',
          week: '10',
          season_type: 'regular'
        }
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data!['12345']).toEqual({
        player_id: '12345',
        stats: {
          pass_yd: 300,
          pass_td: 2,
          rush_yd: 20,
          rush_td: 1
        },
        points: {
          ppr: 25.5,
          half_ppr: 22.5,
          standard: 19.5
        }
      });
    });

    it('should handle season type defaults', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {},
        error: null
      });

      await provider.getWeeklyStats(2024, 10);

      expect(mockInvoke).toHaveBeenCalledWith('sleeper-proxy/stats', {
        body: {
          season: '2024',
          week: '10',
          season_type: 'regular'
        }
      });
    });

    it('should handle stats without points', async () => {
      const mockStats = {
        '12345': {
          pass_yd: 300,
          pass_td: 2
        }
      };

      mockInvoke.mockResolvedValueOnce({
        data: mockStats,
        error: null
      });

      const result = await provider.getWeeklyStats(2024, 10);

      expect(result.data!['12345'].points).toBeUndefined();
      expect(result.data!['12345'].stats).toEqual({
        pass_yd: 300,
        pass_td: 2
      });
    });
  });

  describe('getWeeklyProjections', () => {
    it('should fetch and transform weekly projections', async () => {
      const mockProjections = {
        '12345': {
          pts_ppr: 20.5,
          pts_half_ppr: 18.5,
          pts_std: 16.5,
          pass_yd: 250,
          pass_td: 2
        }
      };

      mockInvoke.mockResolvedValueOnce({
        data: mockProjections,
        error: null
      });

      const result = await provider.getWeeklyProjections(2024, 10, 'regular');

      expect(mockInvoke).toHaveBeenCalledWith('sleeper-proxy/projections', {
        body: {
          season: '2024',
          week: '10',
          season_type: 'regular'
        }
      });

      expect(result.data!['12345']).toEqual({
        player_id: '12345',
        stats: {
          pass_yd: 250,
          pass_td: 2
        },
        points: {
          ppr: 20.5,
          half_ppr: 18.5,
          standard: 16.5
        }
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy when API is functioning', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          status: 'healthy',
          metrics: {
            requests_last_5m: 100,
            cache_hit_rate: '75%'
          }
        },
        error: null
      });

      const result = await provider.healthCheck();

      expect(mockInvoke).toHaveBeenCalledWith('sleeper-proxy/health');
      expect(result.healthy).toBe(true);
      expect(result.details).toBeDefined();
    });

    it('should return unhealthy on error', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Service unavailable' }
      });

      const result = await provider.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.details).toBe('Service unavailable');
    });

    it('should handle non-healthy status', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          status: 'degraded',
          error: 'Database connection failed'
        },
        error: null
      });

      const result = await provider.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.details).toBeDefined();
    });
  });

  describe('inherited methods', () => {
    it('should search players by name', async () => {
      const mockPlayers = {
        '12345': {
          player_id: '12345',
          full_name: 'Patrick Mahomes',
          search_full_name: 'patrickmahomes',
          last_name: 'Mahomes',
          position: 'QB'
        },
        '67890': {
          player_id: '67890',
          full_name: 'Justin Jefferson',
          search_full_name: 'justinjefferson',
          last_name: 'Jefferson',
          position: 'WR'
        }
      };

      mockInvoke.mockResolvedValueOnce({
        data: mockPlayers,
        error: null
      });

      const result = await provider.searchPlayers('mahomes');

      expect(result.data).toHaveLength(1);
      expect(result.data![0].player_id).toBe('12345');
    });

    it('should get players by position', async () => {
      const mockPlayers = {
        '12345': {
          player_id: '12345',
          full_name: 'Patrick Mahomes',
          position: 'QB',
          fantasy_positions: ['QB']
        },
        '67890': {
          player_id: '67890',
          full_name: 'Josh Allen',
          position: 'QB',
          fantasy_positions: ['QB']
        },
        '11111': {
          player_id: '11111',
          full_name: 'Justin Jefferson',
          position: 'WR',
          fantasy_positions: ['WR', 'FLEX']
        }
      };

      mockInvoke.mockResolvedValueOnce({
        data: mockPlayers,
        error: null
      });

      const result = await provider.getPlayersByPosition('QB');

      expect(result.data).toHaveLength(2);
      expect(result.data![0].position).toBe('QB');
      expect(result.data![1].position).toBe('QB');
    });

    it('should get players by team', async () => {
      const mockPlayers = {
        '12345': {
          player_id: '12345',
          full_name: 'Patrick Mahomes',
          team: 'KC'
        },
        '67890': {
          player_id: '67890',
          full_name: 'Travis Kelce',
          team: 'KC'
        },
        '11111': {
          player_id: '11111',
          full_name: 'Justin Jefferson',
          team: 'MIN'
        }
      };

      mockInvoke.mockResolvedValueOnce({
        data: mockPlayers,
        error: null
      });

      const result = await provider.getPlayersByTeam('KC');

      expect(result.data).toHaveLength(2);
      expect(result.data![0].team).toBe('KC');
      expect(result.data![1].team).toBe('KC');
    });
  });
});