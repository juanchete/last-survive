
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCurrentMVP(leagueId: string, currentWeek: number = 1) {
  return useQuery({
    queryKey: ["currentMVP", leagueId, currentWeek],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_mvp_history")
        .select(`
          *,
          fantasy_team:fantasy_teams(
            id,
            name,
            user:users(full_name)
          )
        `)
        .eq("league_id", leagueId)
        .eq("week", currentWeek)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!leagueId,
  });
}
