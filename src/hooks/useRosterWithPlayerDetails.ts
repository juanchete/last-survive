
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
      
      // Fetch player details with team logos
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("*, nfl_team:nfl_teams(abbreviation, logo_url)")
        .in("id", playerIds);
        
      if (playersError) throw playersError;
      
      // Get player stats for the week including projected points
      const currentYear = new Date().getFullYear();
      const { data: stats, error: statsError } = await supabase
        .from("player_stats")
        .select("*")
        .in("player_id", playerIds)
        .eq("week", week)
        .eq("season", currentYear);
        
      if (statsError) throw statsError;
      
      // Get schedule data for opponent info
      const { data: schedule, error: scheduleError } = await supabase
        .from("nfl_game_schedule")
        .select("*")
        .eq("week", week)
        .eq("season", currentYear);
        
      // Don't throw on schedule error as it might be empty
      const scheduleData = schedule || [];
      
      // Create a lookup map for players and stats
      const playersMap = new Map(players.map(player => {
        // Map the database response to our Player type with proper position typing
        const position = player.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
        const typedPlayer = {
          id: player.id.toString(),
          name: player.name,
          position,
          team: player.nfl_team?.abbreviation || "",
          team_logo: player.nfl_team?.logo_url || "",
          available: false, // In a roster, so not available
          eliminated: false, // This would need to be calculated from NFL team status
          points: 0, // This would be updated from stats
          photo: player.photo_url
        } as Player & { team_logo: string };
        return [player.id, typedPlayer];
      }));
      const statsMap = new Map(stats.map(stat => [stat.player_id, stat]));
      
      // Create opponent lookup from schedule
      const getOpponent = (teamAbbr: string) => {
        const game = scheduleData.find(g => 
          g.home_team === teamAbbr || g.away_team === teamAbbr
        );
        if (!game) return null;
        return game.home_team === teamAbbr ? game.away_team : game.home_team;
      };
      
      // Combine roster with player details and stats
      return roster.map(rosterItem => {
        const player = playersMap.get(rosterItem.player_id);
        const playerStats = statsMap.get(rosterItem.player_id);
        
        // If we have statistics, update the player points
        if (player && playerStats) {
          player.points = playerStats.fantasy_points || 0;
        }
        
        // Get opponent info
        const opponent = player ? getOpponent(player.team) : null;
        
        return {
          ...rosterItem,
          ...player, // Spread player properties directly
          slot: rosterItem.slot, // Include the roster slot (e.g., FLEX, QB, RB, etc.)
          stats: playerStats || null,
          opponent: opponent || undefined,
          projected_points: playerStats?.projected_points || 0,
          receiving_stats: playerStats ? {
            receptions: playerStats.receptions,
            receiving_yards: playerStats.receiving_yards,
            receiving_td: playerStats.receiving_td
          } : undefined
        };
      });
    },
    enabled: !!fantasyTeamId && !!week,
  });
}
