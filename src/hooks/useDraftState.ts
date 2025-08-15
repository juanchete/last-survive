import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDraftState(leagueId: string, enableFallbackPolling = false) {
  return useQuery({
    queryKey: ["draftState", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select("draft_order, current_pick, draft_status")
        .eq("id", leagueId)
        .single();
      if (error) {
        console.error("Error fetching draft state:", error);
        throw error;
      }
      return data;
    },
    enabled: !!leagueId,
    // More aggressive polling for draft (3 seconds when enabled)
    refetchInterval: enableFallbackPolling ? 3000 : false,
    // Always refetch on window focus for data consistency
    refetchOnWindowFocus: true,
  });
}
