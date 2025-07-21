import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Player } from "@/types";

export function useWaiverPlayers(leagueId: string, week: number) {
  return useQuery({
    queryKey: ["waiverPlayers", leagueId, week],
    queryFn: async () => {
      // Get IDs of players already assigned in the week, SOLO para la liga actual
      const { data: rosters, error: rostersError } = await supabase
        .from("team_rosters")
        .select("player_id, fantasy_team:fantasy_teams(league_id)")
        .eq("week", week)
        .eq("is_active", true);
      if (rostersError) throw rostersError;
      const assignedIds =
        rosters
          ?.filter((r) => r.fantasy_team?.league_id === leagueId)
          .map((r) => r.player_id) || [];

      // Get unassigned players
      let query = supabase
        .from("players")
        .select("*, nfl_team:nfl_teams(abbreviation)");
      if (assignedIds.length > 0) {
        query = query.not("id", "in", `(${assignedIds.join(",")})`);
      }
      const { data: players, error } = await query;
      if (error) throw error;

      // Get player stats for the current week
      const { data: stats, error: statsError } = await supabase
        .from("player_stats")
        .select("player_id, fantasy_points")
        .eq("week", week);
      if (statsError) throw statsError;

      // Create a map of player points
      const pointsMap = new Map(
        stats?.map((s) => [s.player_id, s.fantasy_points]) || []
      );

      // Convert to typed Player objects with proper position typing
      const result = players.map((player) => {
        const position = player.position as
          | "QB"
          | "RB"
          | "WR"
          | "TE"
          | "K"
          | "DEF";
        return {
          id: player.id.toString(),
          name: player.name,
          position,
          team: player.nfl_team?.abbreviation || "",
          available: true, // Not in roster, so available
          eliminated: false, // This would need to be calculated from NFL team status
          points: pointsMap.get(player.id) || 0,
          photo: player.photo_url,
        } as Player;
      });
      return result;
    },
    enabled: !!leagueId && !!week,
  });
}
