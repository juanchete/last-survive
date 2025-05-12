
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Player } from "@/types";

export function useRosterWithPlayerDetails(fantasyTeamId: string, week: number) {
  return useQuery({
    queryKey: ["rosterWithDetails", fantasyTeamId, week],
    queryFn: async () => {
      if (!fantasyTeamId) return [];
      
      // Get roster first
      const { data: roster, error: rosterError } = await supabase
        .from("team_rosters")
        .select("*")
        .eq("fantasy_team_id", fantasyTeamId)
        .eq("week", week);
      
      if (rosterError) throw rosterError;
      if (!roster.length) return [];
      
      // Get all player IDs from the roster
      const playerIds = roster.map(item => item.player_id);
      
      // Fetch player details
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("*, nfl_team:nfl_teams(abbreviation)")
        .in("id", playerIds);
        
      if (playersError) throw playersError;
      
      // Get player stats for the week
      const { data: stats, error: statsError } = await supabase
        .from("player_stats")
        .select("*")
        .in("player_id", playerIds)
        .eq("week", week);
        
      if (statsError) throw statsError;
      
      // Create a lookup map for players and stats
      const playersMap = new Map(players.map(player => {
        // Ensure position is properly typed
        const typedPlayer = {
          ...player,
          position: player.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF"
        } as Player;
        return [player.id, typedPlayer];
      }));
      const statsMap = new Map(stats.map(stat => [stat.player_id, stat]));
      
      // Combine roster with player details and stats
      return roster.map(rosterItem => {
        const player = playersMap.get(rosterItem.player_id);
        const playerStats = statsMap.get(rosterItem.player_id);
        
        return {
          ...rosterItem,
          player: player || null,
          stats: playerStats || null
        };
      });
    },
    enabled: !!fantasyTeamId && !!week,
  });
}
