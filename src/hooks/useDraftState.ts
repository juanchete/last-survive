import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export function useDraftState(leagueId: string, enableFallbackPolling = false) {
  // Llamar al autodraft check cada 10 segundos cuando el draft está activo
  useEffect(() => {
    if (!leagueId || !enableFallbackPolling) return;
    
    const checkAutodraft = async () => {
      try {
        // Primero llamar a la función que fuerza la verificación de autodraft
        const { data: checkData, error: checkError } = await supabase
          .rpc('force_autodraft_check_all');
        
        if (checkData?.picks_made > 0) {
          console.log('[DraftState] Autodraft ejecutado vía force_check:', checkData);
        }
        
        // También llamar al watcher como respaldo
        const { data: functionData } = await supabase.functions.invoke('autodraft-watcher', {
          body: {}
        });
        
        if (functionData?.data?.drafted_count > 0) {
          console.log('[DraftState] Autodraft ejecutado vía watcher:', functionData.data);
        }
      } catch (error) {
        // Silenciar errores del watcher
        console.debug('[DraftState] Autodraft check error:', error);
      }
    };
    
    // Ejecutar inmediatamente
    checkAutodraft();
    
    // Configurar intervalo de 10 segundos
    const interval = setInterval(checkAutodraft, 10000);
    
    return () => clearInterval(interval);
  }, [leagueId, enableFallbackPolling]);
  
  return useQuery({
    queryKey: ["draftState", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select("draft_order, current_pick, draft_status, turn_started_at, turn_deadline, auto_draft_enabled, timer_duration")
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
