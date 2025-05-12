
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      return data;
    },
    enabled: !!playerId,
  });
}
