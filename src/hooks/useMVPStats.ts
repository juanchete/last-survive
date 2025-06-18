
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MVPStats {
  team_id: string;
  mvp_wins: number;
  total_earnings: number;
  latest_mvp_week?: number;
}

export function useMVPStats(leagueId: string) {
  return useQuery({
    queryKey: ["mvpStats", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fantasy_teams")
        .select("id, mvp_wins, total_earnings")
        .eq("league_id", leagueId);

      if (error) throw error;

      return data.map(team => ({
        team_id: team.id,
        mvp_wins: team.mvp_wins || 0,
        total_earnings: team.total_earnings || 0,
      })) as MVPStats[];
    },
    enabled: !!leagueId,
  });
}
