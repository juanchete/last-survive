import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWaiverStatus(leagueId: string) {
  return useQuery({
    queryKey: ["waiverStatus", leagueId],
    queryFn: async () => {
      // Try to get waiver period status
      const { data: statusData, error: statusError } = await supabase
        .rpc('get_waiver_period_status', { p_league_id: leagueId });
      
      // If function doesn't exist, use default free agency status
      let finalStatusData = statusData;
      
      if (statusError) {
        console.warn("Waiver status function not found, using default free agency status");
        finalStatusData = {
          is_waiver_period: false,
          is_free_agency: true,
          waiver_day: 2,
          waiver_hour: 3,
          free_agency_day: 3,
          free_agency_hour: 10,
          current_day: new Date().getDay(),
          current_hour: new Date().getHours()
        };
      }
      
      // Get pending waiver requests for the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return { ...finalStatusData, userRequests: [] };
      
      // Get user's fantasy team
      const { data: fantasyTeam } = await supabase
        .from("fantasy_teams")
        .select("id")
        .eq("league_id", leagueId)
        .eq("user_id", user.id)
        .single();
      
      if (!fantasyTeam) return { ...statusData, userRequests: [] };
      
      // Get current week
      const { data: currentWeek } = await supabase
        .from("weeks")
        .select("number")
        .eq("league_id", leagueId)
        .eq("status", "active")
        .single();
      
      // Get user's pending waiver requests
      const { data: requests } = await supabase
        .from("waiver_requests")
        .select(`
          id,
          player_id,
          drop_player_id,
          status,
          created_at,
          players!waiver_requests_player_id_fkey (
            id,
            name,
            position,
            nfl_teams (
              abbreviation
            )
          ),
          drop_player:players!waiver_requests_drop_player_id_fkey (
            id,
            name,
            position
          )
        `)
        .eq("fantasy_team_id", fantasyTeam.id)
        .eq("week", currentWeek?.number || 1)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      
      return {
        ...finalStatusData,
        userRequests: requests || [],
        currentWeek: currentWeek?.number || 1,
        fantasyTeamId: fantasyTeam.id
      };
    },
    enabled: !!leagueId,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useWaiverPriority(leagueId: string, week: number) {
  return useQuery({
    queryKey: ["waiverPriority", leagueId, week],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waiver_priority")
        .select(`
          priority,
          fantasy_team_id,
          fantasy_teams (
            id,
            name,
            user_id,
            points
          )
        `)
        .eq("league_id", leagueId)
        .eq("week", week)
        .order("priority", { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!leagueId && !!week,
  });
}