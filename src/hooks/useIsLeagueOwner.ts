import { useQuery } from "@tanstack/react-query";
import { verifyLeagueOwnership } from "@/lib/draftControl";
import { useAuth } from "@/hooks/useAuth";

export function useIsLeagueOwner(leagueId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["isLeagueOwner", leagueId, user?.id],
    queryFn: async () => {
      if (!user?.id || !leagueId) return false;
      return await verifyLeagueOwnership(user.id, leagueId);
    },
    enabled: !!user?.id && !!leagueId,
    // Cache por 30 segundos ya que ownership no cambia frecuentemente
    staleTime: 30000,
  });
}
