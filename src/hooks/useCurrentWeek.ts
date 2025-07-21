
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCurrentWeek(leagueId: string) {
  return useQuery({
    queryKey: ["currentWeek", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weeks")
        .select("number")
        .eq("league_id", leagueId)
        .eq("status", "active")
        .single();
      
      if (error) {
        console.error("Error fetching current week:", error);
        // If no active week found, return default object
        return { number: 1 };
      }
      
      return data || { number: 1 };
    },
    enabled: !!leagueId,
  });
}
