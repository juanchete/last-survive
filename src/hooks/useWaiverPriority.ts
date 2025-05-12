import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWaiverPriority(leagueId: string, week: number) {
  return useQuery({
    queryKey: ["waiverPriority", leagueId, week],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waiver_priority")
        .select("fantasy_team_id, priority")
        .eq("league_id", leagueId)
        .eq("week", week)
        .order("priority", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!leagueId && !!week,
  });
}
