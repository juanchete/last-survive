import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWaiverPlayers(leagueId: string, week: number) {
  return useQuery({
    queryKey: ["waiverPlayers", leagueId, week],
    queryFn: async () => {
      // Obtener IDs de jugadores ya asignados en la semana
      const { data: rosters, error: rostersError } = await supabase
        .from("team_rosters")
        .select("player_id")
        .eq("week", week);
      if (rostersError) throw rostersError;
      const assignedIds = rosters?.map((r) => r.player_id) || [];
      // Obtener jugadores no asignados
      let query = supabase.from("players").select("*");
      if (assignedIds.length > 0) {
        query = query.not("id", "in", `(${assignedIds.join(",")})`);
      }
      const { data: players, error } = await query;
      if (error) throw error;
      return players;
    },
    enabled: !!leagueId && !!week,
  });
}
