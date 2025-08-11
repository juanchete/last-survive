/**
 * NFL Data API Hooks
 * Uses the provider abstraction layer for data fetching
 * Provides backward compatibility with existing components
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sleeperProvider } from '@/lib/providers/SleeperProvider';
import { sleeperSync } from '@/lib/sleeper-sync';
import { toast } from 'sonner';
import type { NFLState, PlayersMap, StatsMap, ProjectionsMap } from '@/lib/providers/FantasyProvider';

/**
 * Get current NFL state (week, season, etc.)
 */
export function useNFLState() {
  return useQuery({
    queryKey: ['nfl', 'state'],
    queryFn: async () => {
      const response = await sleeperProvider.getNFLState();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

/**
 * Get all NFL players with metadata
 */
export function useNFLPlayers() {
  return useQuery({
    queryKey: ['nfl', 'players'],
    queryFn: async () => {
      const response = await sleeperProvider.getAllPlayers();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 2,
    refetchOnWindowFocus: false, // Large response, don't refetch often
  });
}

/**
 * Get weekly stats for all players
 */
export function useWeeklyStats(
  season: number,
  week: number,
  seasonType: 'pre' | 'regular' | 'post' = 'regular',
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['nfl', 'weekly-stats', season, week, seasonType],
    queryFn: async () => {
      const response = await sleeperProvider.getWeeklyStats(season, week, seasonType);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: enabled && season > 0 && week > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
  });
}

/**
 * Get weekly projections for all players
 */
export function useWeeklyProjections(
  season: number,
  week: number,
  seasonType: 'pre' | 'regular' | 'post' = 'regular',
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['nfl', 'weekly-projections', season, week, seasonType],
    queryFn: async () => {
      const response = await sleeperProvider.getWeeklyProjections(season, week, seasonType);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: enabled && season > 0 && week > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
  });
}

/**
 * Get stats for a specific player
 */
export function usePlayerStats(
  playerId: string,
  season: number,
  week: number,
  seasonType: 'pre' | 'regular' | 'post' = 'regular'
) {
  return useQuery({
    queryKey: ['nfl', 'player-stats', playerId, season, week, seasonType],
    queryFn: async () => {
      const response = await sleeperProvider.getPlayerStats(playerId, season, week, seasonType);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!playerId && season > 0 && week > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
  });
}

/**
 * Get projection for a specific player
 */
export function usePlayerProjection(
  playerId: string,
  season: number,
  week: number,
  seasonType: 'pre' | 'regular' | 'post' = 'regular'
) {
  return useQuery({
    queryKey: ['nfl', 'player-projection', playerId, season, week, seasonType],
    queryFn: async () => {
      const response = await sleeperProvider.getPlayerProjection(playerId, season, week, seasonType);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!playerId && season > 0 && week > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
  });
}

/**
 * Search players by name
 */
export function useSearchPlayers(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['nfl', 'search-players', query],
    queryFn: async () => {
      const response = await sleeperProvider.searchPlayers(query);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: enabled && query.length > 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

/**
 * Get players by position
 */
export function usePlayersByPosition(position: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['nfl', 'players-by-position', position],
    queryFn: async () => {
      const response = await sleeperProvider.getPlayersByPosition(position);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: enabled && !!position,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });
}

/**
 * Get players by team
 */
export function usePlayersByTeam(team: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['nfl', 'players-by-team', team],
    queryFn: async () => {
      const response = await sleeperProvider.getPlayersByTeam(team);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: enabled && !!team,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });
}

/**
 * Sync players from provider to database
 */
export function useSyncPlayers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return sleeperSync.syncPlayers();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        // Invalidate players queries to refetch updated data
        queryClient.invalidateQueries({ queryKey: ['players'] });
        queryClient.invalidateQueries({ queryKey: ['available-players'] });
        queryClient.invalidateQueries({ queryKey: ['nfl', 'players'] });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to sync players: ${error.message}`);
    },
  });
}

/**
 * Sync weekly stats from provider to database
 */
export function useSyncWeeklyStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      season,
      week,
      seasonType = 'regular'
    }: {
      season: number;
      week: number;
      seasonType?: 'pre' | 'regular' | 'post';
    }) => {
      return sleeperSync.syncWeeklyStats(season, week, seasonType);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['player-stats'] });
        queryClient.invalidateQueries({ queryKey: ['team-scores'] });
        queryClient.invalidateQueries({ queryKey: ['standings'] });
        queryClient.invalidateQueries({ queryKey: ['nfl', 'weekly-stats'] });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to sync weekly stats: ${error.message}`);
    },
  });
}

/**
 * Sync weekly projections from provider to database
 */
export function useSyncWeeklyProjections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      season,
      week,
      seasonType = 'regular'
    }: {
      season: number;
      week: number;
      seasonType?: 'pre' | 'regular' | 'post';
    }) => {
      return sleeperSync.syncWeeklyProjections(season, week, seasonType);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['nfl', 'weekly-projections'] });
        queryClient.invalidateQueries({ queryKey: ['player-projections'] });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to sync weekly projections: ${error.message}`);
    },
  });
}

/**
 * Sync NFL teams from provider to database
 */
export function useSyncNFLTeams() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => sleeperSync.syncNFLTeams(),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['nfl-teams'] });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to sync NFL teams: ${error.message}`);
    },
  });
}

/**
 * Get sync status and provider health
 */
export function useSyncStatus() {
  return useQuery({
    queryKey: ['nfl', 'sync-status'],
    queryFn: () => sleeperSync.getSyncStatus(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

/**
 * Provider health check
 */
export function useProviderHealth() {
  return useQuery({
    queryKey: ['nfl', 'provider-health'],
    queryFn: () => sleeperProvider.healthCheck(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Auto-refresh every minute
  });
}

/**
 * Get API cache statistics (admin only)
 */
export function useCacheStats() {
  return useQuery({
    queryKey: ['nfl', 'cache-stats'],
    queryFn: async () => {
      // This would need to be implemented in the Edge Function
      // For now, we'll return basic stats from provider health
      const health = await sleeperProvider.healthCheck();
      return {
        healthy: health.healthy,
        cacheEnabled: true,
        details: health.details,
        timestamp: new Date().toISOString()
      };
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Auto-refresh every minute
  });
}

// ============================================
// Backward Compatibility Exports
// These maintain the same API as useSleeperAPI.ts
// ============================================

/**
 * @deprecated Use useNFLState instead
 */
export const useSleeperNFLState = useNFLState;

/**
 * @deprecated Use useNFLPlayers instead
 */
export const useSleeperPlayers = useNFLPlayers;

/**
 * @deprecated Use useWeeklyStats instead
 */
export function useSleeperWeeklyStats(season: number, week: number, enabled: boolean = true) {
  return useWeeklyStats(season, week, 'regular', enabled);
}

/**
 * @deprecated Use usePlayerStats instead
 */
export function useSleeperPlayerStats(playerId: string, season: number, week: number) {
  return usePlayerStats(playerId, season, week, 'regular');
}

/**
 * @deprecated Use useSyncStatus instead
 */
export const useSleeperAPIStats = () => {
  const statusQuery = useSyncStatus();
  const healthQuery = useProviderHealth();
  
  return useQuery({
    queryKey: ['sleeper', 'api-stats'],
    queryFn: () => ({
      requestCount: 0, // No longer tracking this way
      lastCheck: new Date().toISOString(),
      healthy: healthQuery.data?.healthy ?? true,
      syncStatus: statusQuery.data
    }),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });
};