import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RosterLimits {
  roster_full: boolean;
  position_full: boolean;
  current_roster_count: number;
  max_roster_size: number;
  current_position_count: number;
  max_position_count: number;
  needs_drop: boolean;
}

export function useRosterLimits(
  teamId: string,
  week: number,
  positionToAdd: string
) {
  return useQuery({
    queryKey: ["rosterLimits", teamId, week, positionToAdd],
    queryFn: async (): Promise<RosterLimits> => {
      const { data, error } = await supabase
        .from("team_rosters")
        .select(
          `
          id,
          player_id,
          players!inner(position)
        `
        )
        .eq("fantasy_team_id", teamId)
        .eq("week", week)
        .eq("is_active", true);

      if (error) throw error;

      // Calcular límites manualmente ya que la función SQL puede no estar disponible aún
      const currentRosterCount = data?.length || 0;
      const maxRosterSize = 13;

      const positionCount =
        data?.filter((roster) => roster.players.position === positionToAdd)
          .length || 0;

      const maxPositionLimits: Record<string, number> = {
        QB: 1,
        RB: 3,  // 2 starting + 1 flex potential
        WR: 3,  // 2 starting + 1 flex potential
        TE: 1,
        K: 1,
        DEF: 1,
        DP: 1,
      };

      const maxPositionCount = maxPositionLimits[positionToAdd] || 3;

      return {
        roster_full: currentRosterCount >= maxRosterSize,
        position_full: positionCount >= maxPositionCount,
        current_roster_count: currentRosterCount,
        max_roster_size: maxRosterSize,
        current_position_count: positionCount,
        max_position_count: maxPositionCount,
        needs_drop: currentRosterCount >= maxRosterSize,
      };
    },
    enabled: !!teamId && !!week && !!positionToAdd,
  });
}
