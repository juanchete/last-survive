
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
      
      // Properly type the response data
      if (data && typeof data === 'object') {
        const result = data as any;
        return {
          deadline: result.deadline || '',
          deadline_day: result.deadline_day || 2,
          deadline_hour: result.deadline_hour || 23,
          time_remaining: result.time_remaining || 0,
          deadline_passed: result.deadline_passed || false
        };
      }
      
      throw new Error('Invalid waiver deadline data structure');
    },
    enabled: !!leagueId,
    refetchInterval: 60000, // Refrescar cada minuto
  });
}
