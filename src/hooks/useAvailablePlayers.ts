import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAvailablePlayers(leagueId: string, week: number) {
  return useQuery({
    queryKey: ["availablePlayers", leagueId, week],
    queryFn: async () => {
      // 1. Obtener todos los jugadores y equipos NFL
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, name, position, nfl_team_id, photo_url");
      if (playersError) throw playersError;

      const { data: nflTeams, error: teamsError } = await supabase
        .from("nfl_teams")
        .select("id, name, abbreviation, eliminated");
      if (teamsError) throw teamsError;
      const teamMap = new Map(nflTeams.map((t) => [t.id, t]));

      // 2. Obtener los jugadores ya drafteados en la semana actual
      const { data: rosters, error: rostersError } = await supabase
        .from("team_rosters")
        .select("player_id")
        .eq("week", week);
      if (rostersError) throw rostersError;
      const draftedIds = new Set(rosters?.map((r) => r.player_id));

      // 3. Obtener los puntos fantasy de la semana actual
      const { data: stats, error: statsError } = await supabase
        .from("player_stats")
        .select("player_id, fantasy_points")
        .eq("week", week);
      if (statsError) throw statsError;
      const pointsMap = new Map(
        stats?.map((s) => [s.player_id, s.fantasy_points])
      );

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
            points: pointsMap.get(player.id) || 0,
            photo: player.photo_url,
          };
        })
        .filter((p) => p.available);
    },
    enabled: !!leagueId && !!week,
  });
}
