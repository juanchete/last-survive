import { useQuery } from "@tanstack/react-query";
import { sportsDataProvider, type SportsDataDefenseStats } from "@/lib/providers/SportsDataProvider";

/**
 * Hook to fetch defense stats for a specific season and week
 */
export const useDefenseStats = (
  season: number,
  week: number,
  team?: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ["defense-stats", season, week, team],
    queryFn: async () => {
      const response = await sportsDataProvider.getDefenseStats(season, week, team);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || {};
    },
    enabled: enabled && !!season && !!week,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes during active use
  });
};

/**
 * Hook to get defense stats for a specific team
 */
export const useTeamDefenseStats = (
  season: number,
  week: number,
  team: string,
  enabled: boolean = true
) => {
  const { data: allDefenseStats, ...rest } = useDefenseStats(season, week, undefined, enabled);
  
  const teamDefenseStats = team && allDefenseStats ? allDefenseStats[team] : undefined;
  
  return {
    ...rest,
    data: teamDefenseStats,
  };
};

/**
 * Get fantasy points for a team's defense using DraftKings scoring
 */
export const getDefenseFantasyPoints = (defenseStats: SportsDataDefenseStats | undefined): number => {
  if (!defenseStats) return 0;
  
  // Use FantasyPointsDraftKings as mentioned in the user's request
  return defenseStats.FantasyPointsDraftKings || 0;
};

/**
 * Transform defense stats to a format compatible with player stats
 */
export const transformDefenseStatsToPlayerFormat = (
  defenseStats: SportsDataDefenseStats,
  teamName: string
) => {
  return {
    player_id: `DEF-${defenseStats.Team}`,
    stats: {
      player_name: `${teamName} DEF`,
      team: defenseStats.Team,
      opponent: defenseStats.Opponent,
      home_away: defenseStats.Team, // Will need to determine home/away
      game_finished: defenseStats.IsGameOver,
      points_allowed: defenseStats.PointsAllowed,
      sacks: defenseStats.Sacks,
      interceptions: defenseStats.Interceptions,
      fumbles_recovered: defenseStats.FumblesRecovered,
      touchdowns: defenseStats.DefensiveTouchdowns + defenseStats.SpecialTeamsTouchdowns,
      safeties: defenseStats.Safeties,
      blocked_kicks: defenseStats.BlockedKicks,
    },
    points: {
      draftkings: defenseStats.FantasyPointsDraftKings,
      fanduel: defenseStats.FantasyPointsFanDuel,
      yahoo: defenseStats.FantasyPointsYahoo,
      standard: defenseStats.FantasyPoints,
    },
  };
};