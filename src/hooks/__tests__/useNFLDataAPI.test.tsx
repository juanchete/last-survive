/**
 * Unit tests for useNFLDataAPI hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useNFLState,
  useNFLPlayers,
  useWeeklyStats,
  useWeeklyProjections,
  usePlayerStats,
  useSearchPlayers,
  useProviderHealth,
  useCacheStats
} from '../useNFLDataAPI';
import { sleeperProvider } from '@/lib/providers/SleeperProvider';

// Mock the SleeperProvider
jest.mock('@/lib/providers/SleeperProvider', () => ({
  sleeperProvider: {
    getNFLState: jest.fn(),
    getAllPlayers: jest.fn(),
    getWeeklyStats: jest.fn(),
    getWeeklyProjections: jest.fn(),
    getPlayerStats: jest.fn(),
    getPlayerProjection: jest.fn(),
    searchPlayers: jest.fn(),
    getPlayersByPosition: jest.fn(),
    getPlayersByTeam: jest.fn(),
    healthCheck: jest.fn()
  }
}));

// Mock sleeperSync
jest.mock('@/lib/sleeper-sync', () => ({
  sleeperSync: {
    syncPlayers: jest.fn(),
    syncWeeklyStats: jest.fn(),
    syncWeeklyProjections: jest.fn(),
    syncNFLTeams: jest.fn(),
    getSyncStatus: jest.fn()
  }
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

describe('useNFLDataAPI hooks', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });

  describe('useNFLState', () => {
    it('should fetch NFL state successfully', async () => {
      const mockState = {
        week: 10,
        season_type: 'regular' as const,
        season: '2024',
        previous_season: '2023',
        display_week: 10,
        leg: 10,
        league_create_season: '2024',
        league_season: '2024'
      };

      (sleeperProvider.getNFLState as jest.Mock).mockResolvedValueOnce({
        data: mockState
      });

      const { result } = renderHook(() => useNFLState(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockState);
      expect(sleeperProvider.getNFLState).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when fetching NFL state', async () => {
      (sleeperProvider.getNFLState as jest.Mock).mockResolvedValueOnce({
        error: 'Network error'
      });

      const { result } = renderHook(() => useNFLState(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('useNFLPlayers', () => {
    it('should fetch all players successfully', async () => {
      const mockPlayers = {
        '12345': {
          player_id: '12345',
          full_name: 'Test Player',
          position: 'QB'
        }
      };

      (sleeperProvider.getAllPlayers as jest.Mock).mockResolvedValueOnce({
        data: mockPlayers
      });

      const { result } = renderHook(() => useNFLPlayers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPlayers);
    });

    it('should not refetch on window focus', async () => {
      (sleeperProvider.getAllPlayers as jest.Mock).mockResolvedValue({
        data: {}
      });

      const { result } = renderHook(() => useNFLPlayers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Simulate window focus
      window.dispatchEvent(new Event('focus'));

      // Should not call again
      expect(sleeperProvider.getAllPlayers).toHaveBeenCalledTimes(1);
    });
  });

  describe('useWeeklyStats', () => {
    it('should fetch weekly stats when enabled', async () => {
      const mockStats = {
        '12345': {
          player_id: '12345',
          stats: { pass_yd: 300 },
          points: { ppr: 25.5 }
        }
      };

      (sleeperProvider.getWeeklyStats as jest.Mock).mockResolvedValueOnce({
        data: mockStats
      });

      const { result } = renderHook(
        () => useWeeklyStats(2024, 10, 'regular', true),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(sleeperProvider.getWeeklyStats).toHaveBeenCalledWith(2024, 10, 'regular');
    });

    it('should not fetch when disabled', () => {
      const { result } = renderHook(
        () => useWeeklyStats(2024, 10, 'regular', false),
        { wrapper }
      );

      expect(result.current.isPending).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(sleeperProvider.getWeeklyStats).not.toHaveBeenCalled();
    });

    it('should not fetch with invalid parameters', () => {
      const { result } = renderHook(
        () => useWeeklyStats(0, 0, 'regular', true),
        { wrapper }
      );

      expect(result.current.isPending).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(sleeperProvider.getWeeklyStats).not.toHaveBeenCalled();
    });
  });

  describe('useWeeklyProjections', () => {
    it('should fetch weekly projections', async () => {
      const mockProjections = {
        '12345': {
          player_id: '12345',
          stats: { pass_yd: 280 },
          points: { ppr: 23.5 }
        }
      };

      (sleeperProvider.getWeeklyProjections as jest.Mock).mockResolvedValueOnce({
        data: mockProjections
      });

      const { result } = renderHook(
        () => useWeeklyProjections(2024, 10, 'regular'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProjections);
    });
  });

  describe('usePlayerStats', () => {
    it('should fetch player stats', async () => {
      const mockStats = {
        player_id: '12345',
        stats: { pass_yd: 300 },
        points: { ppr: 25.5 }
      };

      (sleeperProvider.getPlayerStats as jest.Mock).mockResolvedValueOnce({
        data: mockStats
      });

      const { result } = renderHook(
        () => usePlayerStats('12345', 2024, 10, 'regular'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
    });

    it('should not fetch without player ID', () => {
      const { result } = renderHook(
        () => usePlayerStats('', 2024, 10),
        { wrapper }
      );

      expect(result.current.isPending).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(sleeperProvider.getPlayerStats).not.toHaveBeenCalled();
    });
  });

  describe('useSearchPlayers', () => {
    it('should search players with valid query', async () => {
      const mockResults = [
        { player_id: '12345', full_name: 'Patrick Mahomes' }
      ];

      (sleeperProvider.searchPlayers as jest.Mock).mockResolvedValueOnce({
        data: mockResults
      });

      const { result } = renderHook(
        () => useSearchPlayers('mahomes', true),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResults);
    });

    it('should not search with short query', () => {
      const { result } = renderHook(
        () => useSearchPlayers('ma', true),
        { wrapper }
      );

      expect(result.current.isPending).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(sleeperProvider.searchPlayers).not.toHaveBeenCalled();
    });

    it('should not search when disabled', () => {
      const { result } = renderHook(
        () => useSearchPlayers('mahomes', false),
        { wrapper }
      );

      expect(result.current.isPending).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(sleeperProvider.searchPlayers).not.toHaveBeenCalled();
    });
  });

  describe('useProviderHealth', () => {
    it('should check provider health', async () => {
      const mockHealth = {
        healthy: true,
        details: {
          status: 'healthy',
          metrics: {
            cache_hit_rate: '75%'
          }
        }
      };

      (sleeperProvider.healthCheck as jest.Mock).mockResolvedValueOnce(mockHealth);

      const { result } = renderHook(() => useProviderHealth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockHealth);
    });

    it('should refetch periodically', async () => {
      jest.useFakeTimers();

      (sleeperProvider.healthCheck as jest.Mock).mockResolvedValue({
        healthy: true
      });

      renderHook(() => useProviderHealth(), { wrapper });

      // Fast-forward time
      jest.advanceTimersByTime(60000); // 1 minute

      await waitFor(() => {
        expect(sleeperProvider.healthCheck).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });
  });

  describe('useCacheStats', () => {
    it('should fetch cache statistics', async () => {
      const mockHealth = {
        healthy: true,
        details: {
          cache_enabled: true,
          metrics: {}
        }
      };

      (sleeperProvider.healthCheck as jest.Mock).mockResolvedValueOnce(mockHealth);

      const { result } = renderHook(() => useCacheStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        healthy: true,
        cacheEnabled: true
      });
    });
  });

  describe('backward compatibility exports', () => {
    it('should export useSleeperNFLState as alias for useNFLState', async () => {
      const { useSleeperNFLState } = await import('../useNFLDataAPI');
      expect(useSleeperNFLState).toBe(useNFLState);
    });

    it('should export useSleeperPlayers as alias for useNFLPlayers', async () => {
      const { useSleeperPlayers, useNFLPlayers } = await import('../useNFLDataAPI');
      expect(useSleeperPlayers).toBe(useNFLPlayers);
    });

    it('should handle useSleeperWeeklyStats with default season type', async () => {
      const { useSleeperWeeklyStats } = await import('../useNFLDataAPI');
      
      const mockStats = { '12345': { player_id: '12345', stats: {} } };
      (sleeperProvider.getWeeklyStats as jest.Mock).mockResolvedValueOnce({
        data: mockStats
      });

      const { result } = renderHook(
        () => useSleeperWeeklyStats(2024, 10, true),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(sleeperProvider.getWeeklyStats).toHaveBeenCalledWith(2024, 10, 'regular');
    });
  });
});