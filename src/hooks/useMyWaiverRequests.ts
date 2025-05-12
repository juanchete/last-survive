import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMyWaiverRequests(
  leagueId: string,
  week: number,
  fantasyTeamId: string
) {
  return useQuery({
    queryKey: ["myWaiverRequests", leagueId, week, fantasyTeamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waiver_requests")
        .select("*")
        .eq("league_id", leagueId)
        .eq("week", week)
        .eq("fantasy_team_id", fantasyTeamId);
      if (error) throw error;
      return data;
    },
    enabled: !!leagueId && !!week && !!fantasyTeamId,
  });
}
