import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDraftState(leagueId: string) {
  return useQuery({
    queryKey: ["draftState", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select("draft_order, current_pick, draft_status")
        .eq("id", leagueId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!leagueId,
    refetchInterval: 2000, // refresca cada 2 segundos para ver cambios en tiempo real
  });
}
