
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CurrentMVP {
  fantasy_team_id: string;
  week: number;
  points: number;
  earnings: number;
}

export function useCurrentMVP(leagueId: string, week: number = 1) {
  return useQuery({
    queryKey: ["currentMVP", leagueId, week],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_mvp_history")
        .select("fantasy_team_id, week, points, earnings")
        .eq("league_id", leagueId)
        .eq("week", week)
        .eq("season", 2024)
        .maybeSingle();

      if (error) throw error;
      return data as CurrentMVP | null;
    },
    enabled: !!leagueId,
  });
}
