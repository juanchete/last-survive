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
        .select("*, nfl_team:nfl_teams(abbreviation, logo_url)");
      if (assignedIds.length > 0) {
        query = query.not("id", "in", `(${assignedIds.join(",")})`);
      }
      const { data: players, error } = await query;
      if (error) throw error;

      // Get current season (2025 for now)
      const currentSeason = 2025;

      // Get player stats for the current week
      const { data: stats, error: statsError } = await supabase
        .from("player_stats")
        .select("player_id, fantasy_points")
        .eq("week", week)
        .eq("season", currentSeason);
      if (statsError) throw statsError;

      // Get player projections for the current week
      const { data: projections, error: projectionsError } = await supabase
        .from("player_stats")
        .select("player_id, projected_points")
        .eq("week", week)
        .eq("season", currentSeason);
      if (projectionsError) console.warn("Projections not available:", projectionsError);

      // Create a map of player points
      const pointsMap = new Map(
        stats?.map((s) => [s.player_id, s.fantasy_points]) || []
      );

      // Create a map of player projections
      const projectionsMap = new Map(
        projections?.map((p) => [p.player_id, p.projected_points]) || []
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
          nfl_team_logo: player.nfl_team?.logo_url || "",
          available: true, // Not in roster, so available
          eliminated: false, // This would need to be calculated from NFL team status
          points: pointsMap.get(player.id) || 0,
          projected_points: projectionsMap.get(player.id) || 0,
          photo: player.photo_url,
        } as Player & { nfl_team_logo: string; projected_points: number };
      });
      return result;
    },
    enabled: !!leagueId && !!week,
  });
}
