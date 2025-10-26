import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Player } from "@/types";

interface IFreeAgentPlayer extends Player {
  nfl_team_name: string;
  nfl_team_logo?: string;
  projected_points?: number;
}

export function useFreeAgentPlayers(leagueId: string, week: number) {
  return useQuery({
    queryKey: ["freeAgentPlayers", leagueId, week],
    queryFn: async () => {
      // Get IDs of players already assigned in the week for this league
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

      // Get all unassigned players with their NFL team info
      let query = supabase
        .from("players")
        .select(`
          *,
          nfl_team:nfl_teams(
            id,
            name,
            abbreviation,
            logo_url
          )
        `);

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

      // Get player projections for the current week
      const { data: projections, error: projectionsError } = await supabase
        .from("player_stats")
        .select("player_id, projected_points")
        .eq("week", week);

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
      const result: IFreeAgentPlayer[] = players.map((player) => {
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
          nfl_team_name: player.nfl_team?.name || "Free Agent",
          nfl_team_logo: player.nfl_team?.logo_url,
          available: true,
          eliminated: false,
          points: pointsMap.get(player.id) || 0,
          projected_points: projectionsMap.get(player.id) || 0,
          photo: player.photo_url,
        };
      });

      return result;
    },
    enabled: !!leagueId && !!week,
  });
}

// Get all players grouped by NFL team
export function useFreeAgentsByTeam(leagueId: string, week: number) {
  const { data: players = [], ...queryResult } = useFreeAgentPlayers(leagueId, week);

  const playersByTeam = players.reduce((acc, player) => {
    const teamName = player.nfl_team_name || "Free Agent";
    if (!acc[teamName]) {
      acc[teamName] = [];
    }
    acc[teamName].push(player);
    return acc;
  }, {} as Record<string, IFreeAgentPlayer[]>);

  // Sort teams alphabetically and players within teams by points
  const sortedTeams = Object.keys(playersByTeam).sort();
  const sortedPlayersByTeam: Record<string, IFreeAgentPlayer[]> = {};

  sortedTeams.forEach(team => {
    sortedPlayersByTeam[team] = playersByTeam[team].sort((a, b) => (b.points || 0) - (a.points || 0));
  });

  return {
    ...queryResult,
    data: sortedPlayersByTeam
  };
}

// Get players filtered by availability (not rostered in ANY league)
export function useAvailablePlayers(week: number) {
  return useQuery({
    queryKey: ["availablePlayers", week],
    queryFn: async () => {
      // Get IDs of players assigned in ANY league
      const { data: rosters, error: rostersError } = await supabase
        .from("team_rosters")
        .select("player_id")
        .eq("week", week)
        .eq("is_active", true);

      if (rostersError) throw rostersError;

      const assignedIds = rosters?.map((r) => r.player_id) || [];

      // Get all unassigned players
      let query = supabase
        .from("players")
        .select(`
          *,
          nfl_team:nfl_teams(
            id,
            name,
            abbreviation,
            logo_url
          )
        `);

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

      // Get player projections for the current week
      const { data: projections, error: projectionsError } = await supabase
        .from("player_stats")
        .select("player_id, projected_points")
        .eq("week", week);

      if (projectionsError) console.warn("Projections not available:", projectionsError);

      // Create a map of player points
      const pointsMap = new Map(
        stats?.map((s) => [s.player_id, s.fantasy_points]) || []
      );

      // Create a map of player projections
      const projectionsMap = new Map(
        projections?.map((p) => [p.player_id, p.projected_points]) || []
      );

      // Convert to typed Player objects
      const result: IFreeAgentPlayer[] = players.map((player) => {
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
          nfl_team_name: player.nfl_team?.name || "Free Agent",
          nfl_team_logo: player.nfl_team?.logo_url,
          available: true,
          eliminated: false,
          points: pointsMap.get(player.id) || 0,
          projected_points: projectionsMap.get(player.id) || 0,
          photo: player.photo_url,
        };
      });

      return result;
    },
    enabled: !!week,
  });
}

export type { IFreeAgentPlayer };
