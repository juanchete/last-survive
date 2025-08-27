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
        .select(`
          *,
          waiver_request_players!waiver_request_players_waiver_request_id_fkey (
            player_id,
            action,
            slot
          )
        `)
        .eq("league_id", leagueId)
        .eq("week", week)
        .eq("fantasy_team_id", fantasyTeamId);
      if (error) throw error;
      
      // Transform data to maintain backward compatibility
      return data?.map(request => ({
        ...request,
        // For backward compatibility, set player_id and drop_player_id from the related table
        player_id: request.waiver_request_players?.find((p: any) => p.action === 'add')?.player_id || null,
        drop_player_id: request.waiver_request_players?.find((p: any) => p.action === 'drop')?.player_id || null,
        players_to_add: request.waiver_request_players?.filter((p: any) => p.action === 'add') || [],
        players_to_drop: request.waiver_request_players?.filter((p: any) => p.action === 'drop') || []
      })) || [];
    },
    enabled: !!leagueId && !!week && !!fantasyTeamId,
  });
}
