/**
 * useRealtimeStats Hook
 * Manages real-time stats syncing during game days
 */

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { realtimeStatsSync } from '@/lib/realtime-stats-sync';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RealtimeStatsStatus {
  isRunning: boolean;
  lastSyncTime: Date | null;
  isGameTime: boolean;
  nextSyncIn: number | null;
}

interface LivePlayerStats {
  player_id: number;
  player_name: string;
  position: string;
  team: string;
  fantasy_points: number;
  projected_points: number;
  difference: number;
  is_playing: boolean;
  game_status?: string;
}

export function useRealtimeStats(autoStart: boolean = false) {
  const [status, setStatus] = useState<RealtimeStatsStatus>({
    isRunning: false,
    lastSyncTime: null,
    isGameTime: false,
    nextSyncIn: null,
  });
  
  const [countdown, setCountdown] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Start/stop sync service
  const startSync = useCallback(() => {
    realtimeStatsSync.start();
    updateStatus();
    toast.success('Real-time sync started');
  }, []);

  const stopSync = useCallback(() => {
    realtimeStatsSync.stop();
    updateStatus();
    toast.info('Real-time sync stopped');
  }, []);

  const forceSync = useCallback(async () => {
    toast.loading('Syncing stats...');
    await realtimeStatsSync.forceSyncNow();
    toast.success('Stats synced successfully');
    // Invalidate queries to refresh UI
    queryClient.invalidateQueries({ queryKey: ['player-stats'] });
    queryClient.invalidateQueries({ queryKey: ['team-scores'] });
    updateStatus();
  }, [queryClient]);

  // Update status
  const updateStatus = useCallback(() => {
    const currentStatus = realtimeStatsSync.getStatus();
    setStatus(currentStatus);
    if (currentStatus.nextSyncIn !== null) {
      setCountdown(Math.ceil(currentStatus.nextSyncIn / 1000));
    }
  }, []);

  // Listen for stats updates
  useEffect(() => {
    const handleStatsUpdate = (event: CustomEvent) => {
      const { updatedCount, week, timestamp } = event.detail;
      console.log(`Stats updated: ${updatedCount} players for week ${week}`);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['player-stats'] });
      queryClient.invalidateQueries({ queryKey: ['team-scores'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      
      updateStatus();
      
      // Show toast notification
      toast.success(`Live stats updated: ${updatedCount} players`, {
        description: `Last sync: ${new Date(timestamp).toLocaleTimeString()}`,
      });
    };

    window.addEventListener('statsUpdated', handleStatsUpdate as EventListener);
    return () => {
      window.removeEventListener('statsUpdated', handleStatsUpdate as EventListener);
    };
  }, [queryClient, updateStatus]);

  // Update countdown
  useEffect(() => {
    const interval = setInterval(() => {
      updateStatus();
    }, 1000);

    return () => clearInterval(interval);
  }, [updateStatus]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      startSync();
    }
    
    return () => {
      if (autoStart) {
        stopSync();
      }
    };
  }, [autoStart, startSync, stopSync]);

  return {
    status,
    countdown,
    startSync,
    stopSync,
    forceSync,
  };
}

/**
 * Hook to get live stats for a specific week
 */
export function useLiveWeeklyStats(
  leagueId: string,
  week: number,
  season: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['live-weekly-stats', leagueId, week, season],
    queryFn: async () => {
      // Get all teams in the league
      const { data: teams, error: teamsError } = await supabase
        .from('fantasy_teams')
        .select('id, name')
        .eq('league_id', leagueId);

      if (teamsError) throw teamsError;

      // Get rosters for all teams
      const { data: rosters, error: rostersError } = await supabase
        .from('team_rosters')
        .select(`
          player_id,
          fantasy_team_id,
          players!inner (
            id,
            name,
            position,
            nfl_teams (
              abbreviation
            )
          )
        `)
        .in('fantasy_team_id', teams?.map(t => t.id) || []);

      if (rostersError) throw rostersError;

      // Get live stats for the week
      const { data: stats, error: statsError } = await supabase
        .from('player_stats')
        .select('*')
        .eq('week', week)
        .eq('season', season)
        .in('player_id', rosters?.map(r => r.player_id) || []);

      if (statsError) throw statsError;

      // Combine data
      const liveStats: LivePlayerStats[] = [];
      
      rosters?.forEach(roster => {
        const playerStats = stats?.find(s => s.player_id === roster.player_id);
        const player = roster.players;
        
        if (player && playerStats) {
          liveStats.push({
            player_id: player.id,
            player_name: player.name,
            position: player.position,
            team: player.nfl_teams?.abbreviation || '',
            fantasy_points: playerStats.fantasy_points || 0,
            projected_points: playerStats.projected_points || 0,
            difference: (playerStats.fantasy_points || 0) - (playerStats.projected_points || 0),
            is_playing: !playerStats.is_final,
            game_status: playerStats.is_final ? 'Final' : 'Live',
          });
        }
      });

      return liveStats;
    },
    enabled,
    refetchInterval: 60000, // Refetch every minute during games
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

/**
 * Hook to get live team scores
 */
export function useLiveTeamScores(
  leagueId: string,
  week: number,
  season: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['live-team-scores', leagueId, week, season],
    queryFn: async () => {
      const { data: teams, error: teamsError } = await supabase
        .from('fantasy_teams')
        .select('id, name')
        .eq('league_id', leagueId);

      if (teamsError) throw teamsError;

      // Get team scores with live stats
      const teamScores = await Promise.all(
        teams?.map(async (team) => {
          const { data: roster } = await supabase
            .from('team_rosters')
            .select('player_id')
            .eq('fantasy_team_id', team.id);

          const playerIds = roster?.map(r => r.player_id) || [];
          
          const { data: stats } = await supabase
            .from('player_stats')
            .select('fantasy_points, projected_points, is_final')
            .eq('week', week)
            .eq('season', season)
            .in('player_id', playerIds);

          const totalPoints = stats?.reduce((sum, s) => sum + (s.fantasy_points || 0), 0) || 0;
          const projectedPoints = stats?.reduce((sum, s) => sum + (s.projected_points || 0), 0) || 0;
          const playersPlaying = stats?.filter(s => !s.is_final).length || 0;
          const playersFinished = stats?.filter(s => s.is_final).length || 0;

          return {
            team_id: team.id,
            team_name: team.name,
            total_points: totalPoints,
            projected_points: projectedPoints,
            difference: totalPoints - projectedPoints,
            players_playing: playersPlaying,
            players_finished: playersFinished,
            is_final: playersPlaying === 0,
          };
        }) || []
      );

      return teamScores.sort((a, b) => b.total_points - a.total_points);
    },
    enabled,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });
}