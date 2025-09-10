import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeagueWaiverHistoryItem {
  id: string;
  fantasy_team_id: string;
  player_id: number;
  drop_player_id: number | null;
  week: number;
  status: string;
  created_at: string;
  processed_at: string | null;
  priority_at_processing?: number | null;
  fantasy_team: {
    name: string;
    owner: {
      full_name: string;
      email?: string;
    };
  };
  player: {
    name: string;
    position: string;
    team: string;
  };
  drop_player?: {
    name: string;
    position: string;
    team: string;
  };
}

export interface WaiverHistoryFilters {
  week?: number;
  teamId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export function useLeagueWaiverHistory(
  leagueId: string, 
  filters: WaiverHistoryFilters = {}
) {
  return useQuery({
    queryKey: ["leagueWaiverHistory", leagueId, filters],
    queryFn: async () => {
      let query = supabase
        .from("waiver_requests")
        .select(`
          id,
          fantasy_team_id,
          player_id,
          drop_player_id,
          week,
          status,
          created_at,
          processed_at,
          fantasy_team:fantasy_teams!fantasy_team_id(
            name,
            owner:users(full_name, email)
          ),
          player:players!player_id(name, position, team),
          drop_player:players!drop_player_id(name, position, team)
        `)
        .eq("league_id", leagueId);

      // Apply filters
      if (filters.week) {
        query = query.eq("week", filters.week);
      }
      
      if (filters.teamId) {
        query = query.eq("fantasy_team_id", filters.teamId);
      }
      
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      
      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate);
      }

      // Order by creation date, most recent first
      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as LeagueWaiverHistoryItem[];
    },
    enabled: !!leagueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

// Hook specifically for getting recent waiver activity (last week)
export function useRecentWaiverActivity(leagueId: string) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  return useLeagueWaiverHistory(leagueId, {
    startDate: oneWeekAgo.toISOString()
  });
}

// Hook for getting waiver statistics
export function useWaiverStats(leagueId: string) {
  return useQuery({
    queryKey: ["waiverStats", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waiver_requests")
        .select(`
          status,
          week,
          fantasy_team_id,
          created_at
        `)
        .eq("league_id", leagueId);

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter(item => item.status === 'pending').length,
        approved: data.filter(item => item.status === 'approved').length,
        rejected: data.filter(item => item.status === 'rejected').length,
        thisWeek: data.filter(item => {
          const now = new Date();
          const itemDate = new Date(item.created_at);
          const daysDiff = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff <= 7;
        }).length,
        byTeam: data.reduce((acc, item) => {
          acc[item.fantasy_team_id] = (acc[item.fantasy_team_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byWeek: data.reduce((acc, item) => {
          acc[item.week] = (acc[item.week] || 0) + 1;
          return acc;
        }, {} as Record<number, number>),
      };

      return stats;
    },
    enabled: !!leagueId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}