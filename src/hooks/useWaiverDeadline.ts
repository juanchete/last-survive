
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface WaiverDeadline {
  deadline: string;
  deadline_day: number;
  deadline_hour: number;
  time_remaining: number;
  deadline_passed: boolean;
}

export function useWaiverDeadline(leagueId: string) {
  return useQuery({
    queryKey: ["waiverDeadline", leagueId],
    queryFn: async (): Promise<WaiverDeadline> => {
      const { data, error } = await supabase.rpc("get_waiver_deadline", {
        league_id: leagueId,
      });

      if (error) throw error;
      
      // Type guard to ensure we have the correct structure
      if (typeof data === 'object' && data !== null && 'deadline' in data) {
        return data as WaiverDeadline;
      }
      
      throw new Error('Invalid waiver deadline data structure');
    },
    enabled: !!leagueId,
    refetchInterval: 60000, // Refrescar cada minuto
  });
}
