
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FantasyTeam } from "@/types";

export function useFantasyTeams(leagueId: string) {
  return useQuery({
    queryKey: ["fantasyTeams", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fantasy_teams")
        .select(`
          id,
          name,
          points,
          rank,
          eliminated,
          mvp_wins,
          total_earnings,
          user:users(full_name, email)
        `)
        .eq("league_id", leagueId)
        .order("rank", { ascending: true });

      if (error) throw error;

      return data.map((team) => ({
        id: team.id,
        name: team.name,
        owner: team.user?.full_name || "Unknown",
        players: [], // Players loaded separately
        points: team.points || 0,
        rank: team.rank || 1,
        eliminated: team.eliminated || false,
        mvp_wins: team.mvp_wins || 0,
        total_earnings: team.total_earnings || 0,
        user: team.user,
      })) as FantasyTeam[];
    },
    enabled: !!leagueId,
  });
}
