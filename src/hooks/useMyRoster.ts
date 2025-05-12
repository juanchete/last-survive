import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMyRoster(fantasyTeamId: string, week: number) {
  return useQuery({
    queryKey: ["myRoster", fantasyTeamId, week],
    queryFn: async () => {
      if (!fantasyTeamId) return [];
      const { data, error } = await supabase
        .from("team_rosters")
        .select("player_id, slot, week")
        .eq("fantasy_team_id", fantasyTeamId)
        .eq("week", week);
      if (error) throw error;
      return data;
    },
    enabled: !!fantasyTeamId && !!week,
  });
}
