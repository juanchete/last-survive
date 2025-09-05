import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAvailablePlayers(leagueId: string, week: number, enableFallbackPolling = false) {
  return useQuery({
    queryKey: ["availablePlayers", leagueId, week],
    queryFn: async () => {
      // 1. Obtener todos los jugadores y equipos NFL con sus puntos de la temporada pasada
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, name, position, nfl_team_id, photo_url, last_season_points, adp_standard, adp_ppr");
      if (playersError) throw playersError;

      const { data: nflTeams, error: teamsError } = await supabase
        .from("nfl_teams")
        .select("id, name, abbreviation, eliminated");
      if (teamsError) throw teamsError;
      const teamMap = new Map(nflTeams.map((t) => [t.id, t]));

      // 2. Obtener los jugadores ya drafteados en la semana actual SOLO para la liga actual
      const { data: rosters, error: rostersError } = await supabase
        .from("team_rosters")
        .select("player_id, fantasy_team:fantasy_teams(league_id)")
        .eq("week", week);
      if (rostersError) throw rostersError;
      const draftedIds = new Set(
        rosters
          ?.filter((r) => r.fantasy_team?.league_id === leagueId)
          .map((r) => r.player_id)
      );

      // 3. For now, we'll use last_season_points from the players table
      // We could also fetch current week stats if needed for in-season drafts

      // 4. Armar el array de jugadores disponibles en formato Player
      return players
        .map((player) => {
          const nflTeam = teamMap.get(player.nfl_team_id);
          return {
            id: String(player.id),
            name: player.name,
            position: player.position,
            team: nflTeam?.abbreviation || "",
            available: !draftedIds.has(player.id),
            eliminated: nflTeam?.eliminated || false,
            points: player.last_season_points || 0, // Use last season points for draft
            photo: player.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=1a1a1a&color=fff`,
            adp: player.adp_standard || player.adp_ppr || 999, // Use ADP for sorting
          };
        })
        .filter((p) => p.available)
        .sort((a, b) => a.adp - b.adp); // Sort by ADP (lower is better)
    },
    enabled: !!leagueId && !!week,
    // More aggressive polling for draft (3 seconds when enabled)
    refetchInterval: enableFallbackPolling ? 3000 : false,
    // Always refetch on window focus for data consistency
    refetchOnWindowFocus: true,
  });
}
