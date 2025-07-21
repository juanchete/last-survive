import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TeamWeeklyPoints {
  fantasy_team_id: string;
  week: number;
  total_points: number;
  projected_points?: number;
}

export function useTeamWeeklyPoints(leagueId: string, week: number) {
  return useQuery({
    queryKey: ["teamWeeklyPoints", leagueId, week],
    queryFn: async (): Promise<TeamWeeklyPoints[]> => {
      // Get all teams in the league
      const { data: teams, error: teamsError } = await supabase
        .from("fantasy_teams")
        .select("id")
        .eq("league_id", leagueId);

      if (teamsError) throw teamsError;
      if (!teams) return [];

      // Get rosters for all teams for this week
      const { data: rosters, error: rostersError } = await supabase
        .from("team_rosters")
        .select("fantasy_team_id, player_id")
        .in("fantasy_team_id", teams.map(t => t.id))
        .eq("week", week)
        .eq("is_active", true);

      if (rostersError) throw rostersError;
      if (!rosters) return [];

      // Get player stats for this week
      const playerIds = [...new Set(rosters.map(r => r.player_id))];
      const { data: playerStats, error: statsError } = await supabase
        .from("player_stats")
        .select("player_id, fantasy_points, projected_points")
        .in("player_id", playerIds)
        .eq("week", week);

      if (statsError) throw statsError;

      // Create a map of player points
      const playerPointsMap = new Map(
        (playerStats || []).map(s => [
          s.player_id, 
          { 
            points: s.fantasy_points || 0,
            projected: s.projected_points || 0
          }
        ])
      );

      // Calculate total points per team
      const teamPointsMap = new Map<string, { total: number; projected: number }>();

      rosters.forEach(roster => {
        const playerData = playerPointsMap.get(roster.player_id);
        const current = teamPointsMap.get(roster.fantasy_team_id) || { total: 0, projected: 0 };
        
        teamPointsMap.set(roster.fantasy_team_id, {
          total: current.total + (playerData?.points || 0),
          projected: current.projected + (playerData?.projected || 0)
        });
      });

      // Convert to array format
      return teams.map(team => ({
        fantasy_team_id: team.id,
        week,
        total_points: teamPointsMap.get(team.id)?.total || 0,
        projected_points: teamPointsMap.get(team.id)?.projected || 0
      }));
    },
    enabled: !!leagueId && !!week,
  });
}