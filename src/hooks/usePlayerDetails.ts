
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Player } from "@/types";

export function usePlayerDetails(playerId: number) {
  return useQuery({
    queryKey: ["playerDetails", playerId],
    queryFn: async () => {
      if (!playerId) return null;
      
      const { data, error } = await supabase
        .from("players")
        .select("*, nfl_team:nfl_teams(abbreviation)")
        .eq("id", playerId)
        .single();
        
      if (error) throw error;
      
      // Convert database position string to our Player type's position
      if (data) {
        const position = data.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
        return {
          ...data,
          position
        };
      }
      return data;
    },
    enabled: !!playerId,
  });
}
