import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFantasyTeams(leagueId: string) {
  return useQuery({
    queryKey: ["fantasyTeams", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fantasy_teams")
        .select("*, user:users(full_name, avatar_url)")
        .eq("league_id", leagueId)
        .order("rank", { ascending: true });
      if (error) throw error;
      // Adaptar al tipo FantasyTeam del frontend
      return data.map((team: any) => ({
        id: team.id,
        name: team.name,
        owner: team.user?.full_name || "",
        players: [], // Puedes poblar esto luego con un join a team_rosters si lo necesitas
        points: team.points,
        rank: team.rank,
        eliminated: team.eliminated,
      }));
    },
    enabled: !!leagueId,
  });
}
