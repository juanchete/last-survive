import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateWeeklyScores,
  processWeeklyElimination,
  isTeamEliminated,
  type WeeklyScore,
  type EliminationResult,
} from "@/lib/weeklyElimination";
import { toast } from "sonner";

export function useWeeklyElimination(leagueId: string, weekNumber: number) {
  return useQuery({
    queryKey: ["weeklyElimination", leagueId, weekNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weeks")
        .select("eliminated_nfl_team_id")
        .eq("league_id", leagueId)
        .eq("number", weekNumber)
        .single();
      if (error) throw error;
      return data?.eliminated_nfl_team_id;
    },
    enabled: !!leagueId && !!weekNumber,
  });
}

// Hook para calcular puntajes semanales
export function useWeeklyScores(
  leagueId: string,
  week: number,
  season: number = 2024
) {
  return useQuery({
    queryKey: ["weekly-scores", leagueId, week, season],
    queryFn: () => calculateWeeklyScores(leagueId, week, season),
    enabled: !!leagueId && week > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2,
  });
}

// Hook para procesar eliminación semanal
export function useProcessElimination() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leagueId,
      week,
      season = 2024,
    }: {
      leagueId: string;
      week: number;
      season?: number;
    }) => processWeeklyElimination(leagueId, week, season),

    onSuccess: (result: EliminationResult, variables) => {
      if (result.success) {
        toast.success(`🏆 ${result.message}`, {
          description: `Equipo eliminado: ${result.eliminatedTeam?.name}`,
          duration: 8000,
        });

        // Invalidar caché relevante
        queryClient.invalidateQueries({
          queryKey: ["weekly-scores", variables.leagueId],
        });
        queryClient.invalidateQueries({
          queryKey: ["fantasy-teams", variables.leagueId],
        });
        queryClient.invalidateQueries({
          queryKey: ["league-standings", variables.leagueId],
        });
        queryClient.invalidateQueries({
          queryKey: ["notifications"],
        });
      } else {
        toast.error(`❌ Error en eliminación`, {
          description: result.message,
          duration: 6000,
        });
      }
    },

    onError: (error: Error) => {
      console.error("Error procesando eliminación:", error);
      toast.error(`💥 Error crítico`, {
        description:
          error.message || "Error desconocido procesando eliminación",
        duration: 8000,
      });
    },
  });
}

// Hook para verificar si un equipo está eliminado
export function useIsTeamEliminated(fantasyTeamId: string | undefined) {
  return useQuery({
    queryKey: ["team-eliminated", fantasyTeamId],
    queryFn: () => (fantasyTeamId ? isTeamEliminated(fantasyTeamId) : false),
    enabled: !!fantasyTeamId,
    staleTime: 1000 * 60 * 10, // 10 minutos
    retry: 1,
  });
}

// Hook para obtener historial de eliminaciones de una liga
export function useEliminationHistory(leagueId: string) {
  return useQuery({
    queryKey: ["elimination-history", leagueId],
    queryFn: async () => {
      const { data, error } = await import(
        "@/integrations/supabase/client"
      ).then(({ supabase }) =>
        supabase
          .from("fantasy_teams")
          .select(
            `
            id,
            name,
            user_id,
            eliminated,
            eliminated_week,
            users!inner (
              full_name,
              email
            )
          `
          )
          .eq("league_id", leagueId)
          .eq("eliminated", true)
          .order("eliminated_week", { ascending: true })
      );

      if (error)
        throw new Error(`Error obteniendo historial: ${error.message}`);
      return data || [];
    },
    enabled: !!leagueId,
    staleTime: 1000 * 60 * 15, // 15 minutos
    retry: 2,
  });
}

// Hook para obtener equipos activos (no eliminados)
export function useActiveTeams(leagueId: string) {
  return useQuery({
    queryKey: ["active-teams", leagueId],
    queryFn: async () => {
      const { data, error } = await import(
        "@/integrations/supabase/client"
      ).then(({ supabase }) =>
        supabase
          .from("fantasy_teams")
          .select(
            `
            id,
            name,
            user_id,
            points,
            rank,
            users!inner (
              full_name,
              email
            )
          `
          )
          .eq("league_id", leagueId)
          .eq("eliminated", false)
          .order("rank", { ascending: true })
      );

      if (error)
        throw new Error(`Error obteniendo equipos activos: ${error.message}`);
      return data || [];
    },
    enabled: !!leagueId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2,
  });
}
