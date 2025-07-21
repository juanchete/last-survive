import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface WaiverHistoryItem {
  id: string;
  fantasy_team_id: string;
  player_id: number;
  drop_player_id: number | null;
  week: number;
  status: string;
  created_at: string;
  processed_at: string | null;
  fantasy_team: {
    name: string;
    owner: {
      full_name: string;
    };
  };
  player: {
    name: string;
    position: string;
  };
  drop_player?: {
    name: string;
    position: string;
  };
}

export function useWaiverHistory(leagueId: string) {
  return useQuery({
    queryKey: ["waiverHistory", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waiver_requests")
        .select(`
          id,
          fantasy_team_id,
          player_id,
          drop_player_id,
          week,
          status,
          created_at,
          processed_at,
          fantasy_team:fantasy_teams!fantasy_team_id(
            name,
            owner:users(full_name)
          ),
          player:players!player_id(name, position),
          drop_player:players!drop_player_id(name, position)
        `)
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as WaiverHistoryItem[];
    },
    enabled: !!leagueId,
  });
}