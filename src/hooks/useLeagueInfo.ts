import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeagueInfo {
  id: string;
  name: string;
  max_members: number;
  status: string;
  created_at: string;
  owner_id: string;
  description?: string;
  entry_fee?: number;
  prize?: string;
}

export function useLeagueInfo(leagueId: string) {
  return useQuery({
    queryKey: ["leagueInfo", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select(`
          id,
          name,
          max_members,
          status,
          created_at,
          owner_id,
          description,
          entry_fee,
          prize
        `)
        .eq("id", leagueId)
        .single();

      if (error) throw error;
      return data as LeagueInfo;
    },
    enabled: !!leagueId,
  });
}