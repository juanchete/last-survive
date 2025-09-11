import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useWeeklyPoints(leagueId: string) {
  const queryClient = useQueryClient();

  // Subscribe to real-time updates for weekly points
  useEffect(() => {
    if (!leagueId) return;

    // Subscribe to fantasy_teams table changes for weekly points updates
    const channel = supabase
      .channel(`weekly-points-${leagueId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fantasy_teams',
          filter: `league_id=eq.${leagueId}`
        },
        (payload) => {
          console.log('Weekly points update:', payload);
          
          // Invalidate queries to refresh standings
          queryClient.invalidateQueries({ queryKey: ['weeklyStandings', leagueId] });
          queryClient.invalidateQueries({ queryKey: ['fantasy-teams', leagueId] });
        }
      )
      .subscribe();

    // Subscribe to player_stats changes for real-time scoring
    const statsChannel = supabase
      .channel(`player-stats-${leagueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_stats'
        },
        (payload) => {
          console.log('Player stats update:', payload);
          
          // Invalidate queries to refresh points
          queryClient.invalidateQueries({ queryKey: ['weeklyStandings', leagueId] });
          queryClient.invalidateQueries({ queryKey: ['teamProjections', leagueId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(statsChannel);
    };
  }, [leagueId, queryClient]);

  // Query for weekly standings with real-time updates
  const { data: weeklyStandings, isLoading } = useQuery({
    queryKey: ['weeklyStandings', leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('league_standings_weekly')
        .select('*')
        .eq('league_id', leagueId)
        .order('weekly_rank', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!leagueId,
    refetchInterval: 30000, // Refetch every 30 seconds during games
  });

  return {
    weeklyStandings,
    isLoading
  };
}