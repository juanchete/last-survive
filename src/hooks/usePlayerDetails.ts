
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
      
      // Convert database position string to our Player type's position with proper typing
      if (data) {
        // Ensure position is properly typed
        const position = data.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
        // Map the database response to our Player type
        return {
          id: data.id.toString(),
          name: data.name,
          position,
          team: data.nfl_team?.abbreviation || "",
          available: true, // We assume it's available since we're fetching it
          eliminated: false, // This would need to be calculated from NFL team status
          points: 0, // This would need to be fetched from stats
          photo: data.photo_url
        } as Player;
      }
      return null;
    },
    enabled: !!playerId,
  });
}
