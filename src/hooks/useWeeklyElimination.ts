import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWeeklyElimination(leagueId: string, weekNumber: number) {
  return useQuery({
    queryKey: ["weeklyElimination", leagueId, weekNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weeks")
        .select("eliminated_nfl_team_id")
        .eq("league_id", leagueId)
        .eq("number", weekNumber)
        .single();
      if (error) throw error;
      return data?.eliminated_nfl_team_id;
    },
    enabled: !!leagueId && !!weekNumber,
  });
}
