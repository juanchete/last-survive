import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUserFantasyTeam(leagueId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["userFantasyTeam", leagueId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("fantasy_teams")
        .select("*, user:users(full_name, avatar_url)")
        .eq("league_id", leagueId)
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        name: data.name,
        owner: data.user?.full_name || "",
        players: [], // Puedes poblar esto luego con un join a team_rosters si lo necesitas
        points: data.points,
        rank: data.rank,
        eliminated: data.eliminated,
      };
    },
    enabled: !!leagueId && !!user,
  });
}
