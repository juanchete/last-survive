import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useLeagueDashboardActions(leagueId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Banear usuario
  const banUser = useMutation({
    mutationFn: async ({
      userId,
      reason,
    }: {
      userId: string;
      reason?: string;
    }) => {
      if (!user?.id) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.rpc("ban_user", {
        admin_id: user.id,
        target_user_id: userId,
        reason: reason || "Baneado por el administrador de la liga",
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leagueMembers", leagueId] });
      toast.success("Usuario baneado exitosamente");
    },
    onError: (error) => {
      toast.error(`Error al banear usuario: ${error.message}`);
    },
  });

  // Desbanear usuario
  const unbanUser = useMutation({
    mutationFn: async ({
      userId,
      reason,
    }: {
      userId: string;
      reason?: string;
    }) => {
      if (!user?.id) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.rpc("unban_user", {
        admin_id: user.id,
        target_user_id: userId,
        reason: reason || "Desbaneado por el administrador de la liga",
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leagueMembers", leagueId] });
      toast.success("Usuario desbaneado exitosamente");
    },
    onError: (error) => {
      toast.error(`Error al desbanear usuario: ${error.message}`);
    },
  });

  // Vetar intercambio
  const vetoTrade = useMutation({
    mutationFn: async ({
      tradeId,
      reason,
    }: {
      tradeId: string;
      reason: string;
    }) => {
      if (!user?.id) throw new Error("Usuario no autenticado");

      // Actualizar el estado del intercambio a 'vetoed'
      const { error } = await supabase
        .from("trades")
        .update({
          status: "vetoed",
          response_notes: `Vetado por el administrador: ${reason}`,
        })
        .eq("id", tradeId)
        .eq("league_id", leagueId);

      if (error) throw error;

      // Registrar la acción del administrador
      const { error: actionError } = await supabase
        .from("admin_actions")
        .insert({
          admin_user_id: user.id,
          action_type: "veto_trade",
          target_league_id: leagueId,
          reason: reason,
          action_details: { trade_id: tradeId },
        });

      if (actionError) throw actionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leagueTrades", leagueId] });
      toast.success("Intercambio vetado exitosamente");
    },
    onError: (error) => {
      toast.error(`Error al vetar intercambio: ${error.message}`);
    },
  });

  // Editar puntos de jugador
  const editPlayerPoints = useMutation({
    mutationFn: async ({
      playerId,
      week,
      season,
      newPoints,
      reason,
    }: {
      playerId: number;
      week: number;
      season: number;
      newPoints: number;
      reason?: string;
    }) => {
      if (!user?.id) throw new Error("Usuario no autenticado");

      // Usar la función RPC que maneja correctamente el ON CONFLICT
      const { data, error } = await supabase.rpc("edit_player_stats", {
        admin_id: user.id,
        p_player_id: playerId,
        week_num: week,
        season_year: season,
        new_fantasy_points: newPoints,
        reason: reason || "Editado por el administrador de la liga",
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        message?: string;
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || "Error al actualizar estadísticas");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leagueTeams", leagueId] });
      toast.success("Puntos del jugador actualizados exitosamente");
    },
    onError: (error) => {
      toast.error(`Error al editar puntos: ${error.message}`);
    },
  });

  // Agregar jugador a roster
  const addPlayerToRoster = useMutation({
    mutationFn: async ({
      teamId,
      playerId,
      slot,
      week,
      reason,
    }: {
      teamId: string;
      playerId: number;
      slot: string;
      week: number;
      reason?: string;
    }) => {
      if (!user?.id) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.rpc("add_player_to_roster", {
        admin_id: user.id,
        team_id: teamId,
        player_id: playerId,
        slot: slot,
        week_num: week,
        acquired_type: "admin_add",
        reason: reason || "Agregado por el administrador de la liga",
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leagueTeams", leagueId] });
      toast.success("Jugador agregado al roster exitosamente");
    },
    onError: (error) => {
      toast.error(`Error al agregar jugador: ${error.message}`);
    },
  });

  // Remover jugador del roster
  const removePlayerFromRoster = useMutation({
    mutationFn: async ({
      rosterId,
      reason,
    }: {
      rosterId: number;
      reason?: string;
    }) => {
      if (!user?.id) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.rpc("remove_player_from_roster", {
        admin_id: user.id,
        roster_id: rosterId,
        reason: reason || "Removido por el administrador de la liga",
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leagueTeams", leagueId] });
      toast.success("Jugador removido del roster exitosamente");
    },
    onError: (error) => {
      toast.error(`Error al remover jugador: ${error.message}`);
    },
  });

  // Editar jugador en roster (cambiar por otro)
  const editRosterPlayer = useMutation({
    mutationFn: async ({
      rosterId,
      newPlayerId,
      newSlot,
      reason,
    }: {
      rosterId: number;
      newPlayerId: number;
      newSlot?: string;
      reason?: string;
    }) => {
      if (!user?.id) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.rpc("edit_roster_player", {
        admin_id: user.id,
        roster_id: rosterId,
        new_player_id: newPlayerId,
        new_slot: newSlot || null,
        reason: reason || "Editado por el administrador de la liga",
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leagueTeams", leagueId] });
      toast.success("Jugador del roster editado exitosamente");
    },
    onError: (error) => {
      toast.error(`Error al editar jugador: ${error.message}`);
    },
  });

  // Recalcular puntajes del equipo
  const recalculateTeamScores = useMutation({
    mutationFn: async ({
      teamId,
      week,
      season,
    }: {
      teamId: string;
      week: number;
      season?: number;
    }) => {
      if (!user?.id) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.rpc("recalculate_team_scores", {
        admin_id: user.id,
        team_id: teamId,
        week_num: week,
        season_year: season || 2024,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leagueTeams", leagueId] });
      toast.success("Puntajes del equipo recalculados exitosamente");
    },
    onError: (error) => {
      toast.error(`Error al recalcular puntajes: ${error.message}`);
    },
  });

  return {
    banUser: banUser.mutate,
    unbanUser: unbanUser.mutate,
    vetoTrade: vetoTrade.mutate,
    editPlayerPoints: editPlayerPoints.mutate,
    addPlayerToRoster: addPlayerToRoster.mutate,
    removePlayerFromRoster: removePlayerFromRoster.mutate,
    editRosterPlayer: editRosterPlayer.mutate,
    recalculateTeamScores: recalculateTeamScores.mutate,
    isLoading:
      banUser.isPending ||
      unbanUser.isPending ||
      vetoTrade.isPending ||
      editPlayerPoints.isPending ||
      addPlayerToRoster.isPending ||
      removePlayerFromRoster.isPending ||
      editRosterPlayer.isPending ||
      recalculateTeamScores.isPending,
  };
}
