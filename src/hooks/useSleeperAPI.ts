import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sleeperAPI } from '@/lib/sleeper-api';
import { sleeperSync } from '@/lib/sleeper-sync';
import { toast } from 'sonner';

export function useSleeperNFLState() {
  return useQuery({
    queryKey: ['sleeper', 'nfl-state'],
    queryFn: () => sleeperAPI.getNFLState(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useSleeperPlayers() {
  return useQuery({
    queryKey: ['sleeper', 'players'],
    queryFn: () => sleeperAPI.getAllPlayers(),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours (recommended by Sleeper)
    retry: 2,
    refetchOnWindowFocus: false, // Large response, don't refetch often
  });
}

export function useSleeperWeeklyStats(season: number, week: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ['sleeper', 'weekly-stats', season, week],
    queryFn: () => sleeperAPI.getWeeklyStats(season, week),
    enabled: enabled && season > 0 && week > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
  });
}

export function useSleeperPlayerStats(playerId: string, season: number, week: number) {
  return useQuery({
    queryKey: ['sleeper', 'player-stats', playerId, season, week],
    queryFn: () => sleeperAPI.getPlayerStats(playerId, season, week),
    enabled: !!playerId && season > 0 && week > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
  });
}

export function useSyncPlayers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: { fantasyPositionsOnly?: boolean; activeOnly?: boolean }) => {
      return sleeperSync.syncPlayers(
        options?.fantasyPositionsOnly ?? true,
        options?.activeOnly ?? true
      );
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        // Invalidate players queries to refetch updated data
        queryClient.invalidateQueries({ queryKey: ['players'] });
        queryClient.invalidateQueries({ queryKey: ['available-players'] });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to sync players: ${error.message}`);
    },
  });
}

export function useSyncWeeklyStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      season,
      week,
      scoringType = 'std'
    }: {
      season: number;
      week: number;
      scoringType?: 'std' | 'ppr' | 'half_ppr';
    }) => {
      return sleeperSync.syncWeeklyStats(season, week, scoringType);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['player-stats'] });
        queryClient.invalidateQueries({ queryKey: ['team-scores'] });
        queryClient.invalidateQueries({ queryKey: ['standings'] });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to sync weekly stats: ${error.message}`);
    },
  });
}

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

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sleeper', 'sync-status'],
    queryFn: () => sleeperSync.getSyncStatus(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

export function useSleeperAPIStats() {
  return useQuery({
    queryKey: ['sleeper', 'api-stats'],
    queryFn: () => ({
      requestCount: sleeperAPI.getRequestCount(),
      lastCheck: new Date().toISOString(),
    }),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Auto-refresh every 30 seconds
  });
}