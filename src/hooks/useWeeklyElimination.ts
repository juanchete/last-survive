import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useWeeklyElimination = (leagueId: string) => {
  return useQuery({
    queryKey: ['weeklyElimination', leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fantasy_teams')
        .select('*')
        .eq('league_id', leagueId)
        .eq('eliminated', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!leagueId
  });
};
