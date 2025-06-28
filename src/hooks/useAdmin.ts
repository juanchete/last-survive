import { useState, useEffect } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AdminStats {
  total_users: number;
  banned_users: number;
  verified_users: number;
  total_leagues: number;
  active_leagues: number;
  total_players: number;
  recent_actions: Array<{
    id: string;
    action_type: string;
    admin_user: string;
    target_user: string;
    created_at: string;
    reason?: string;
  }>;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: "user" | "admin" | "super_admin";
  banned: boolean;
  verified: boolean;
  banned_at?: string;
  banned_reason?: string;
  verified_at?: string;
  created_at: string;
}

export interface RosterPlayer {
  roster_id: number;
  player_id: number;
  player_name: string;
  player_position: string;
  slot: string;
  is_active: boolean;
  acquired_type: string;
  acquired_week: number;
  fantasy_points: number;
  nfl_team_name: string;
}

export interface PlayerEditData {
  player_id: number;
  week: number;
  season: number;
  fantasy_points: number;
  reason?: string;
}

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("is_admin", {
        user_id: user.id,
      });

      if (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data || false);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (): Promise<AdminStats | null> => {
    if (!isAdmin) return null;

    try {
      const { data, error } = await supabase.rpc("get_admin_stats");

      if (error) {
        console.error("Error fetching admin stats:", error);
        return null;
      }

      const adminStats = data as unknown as AdminStats;
      setStats(adminStats);
      return adminStats;
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      return null;
    }
  };

  const fetchUsers = async (searchTerm?: string): Promise<AdminUser[]> => {
    if (!isAdmin) return [];

    try {
      let query = supabase
        .from("users")
        .select(
          "id, email, full_name, role, banned, verified, banned_at, banned_reason, verified_at, created_at"
        )
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching users:", error);
        return [];
      }

      return (data || []) as AdminUser[];
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  };

  const banUser = async (
    targetUserId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!isAdmin || !user) {
      return { success: false, message: "Sin permisos de administrador" };
    }

    try {
      const { data, error } = await supabase.rpc("ban_user", {
        admin_id: user.id,
        target_user_id: targetUserId,
        reason: reason || null,
      });

      if (error) {
        console.error("Error banning user:", error);
        return { success: false, message: "Error al banear usuario" };
      }

      const result = data as {
        success: boolean;
        message?: string;
        error?: string;
      };
      return {
        success: result.success,
        message:
          result.message || result.error || "Usuario baneado exitosamente",
      };
    } catch (error) {
      console.error("Error banning user:", error);
      return { success: false, message: "Error al banear usuario" };
    }
  };

  const unbanUser = async (
    targetUserId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!isAdmin || !user) {
      return { success: false, message: "Sin permisos de administrador" };
    }

    try {
      const { data, error } = await supabase.rpc("unban_user", {
        admin_id: user.id,
        target_user_id: targetUserId,
        reason: reason || null,
      });

      if (error) {
        console.error("Error unbanning user:", error);
        return { success: false, message: "Error al desbanear usuario" };
      }

      const result = data as {
        success: boolean;
        message?: string;
        error?: string;
      };
      return {
        success: result.success,
        message:
          result.message || result.error || "Usuario desbaneado exitosamente",
      };
    } catch (error) {
      console.error("Error unbanning user:", error);
      return { success: false, message: "Error al desbanear usuario" };
    }
  };

  const verifyUser = async (
    targetUserId: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!isAdmin || !user) {
      return { success: false, message: "Sin permisos de administrador" };
    }

    try {
      const { data, error } = await supabase.rpc("verify_user", {
        admin_id: user.id,
        target_user_id: targetUserId,
      });

      if (error) {
        console.error("Error verifying user:", error);
        return { success: false, message: "Error al verificar usuario" };
      }

      const result = data as {
        success: boolean;
        message?: string;
        error?: string;
      };
      return {
        success: result.success,
        message:
          result.message || result.error || "Usuario verificado exitosamente",
      };
    } catch (error) {
      console.error("Error verifying user:", error);
      return { success: false, message: "Error al verificar usuario" };
    }
  };

  const deleteLeague = async (
    leagueId: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!isAdmin) {
      return { success: false, message: "Sin permisos de administrador" };
    }

    try {
      const { error } = await supabase
        .from("leagues")
        .delete()
        .eq("id", leagueId);

      if (error) {
        console.error("Error deleting league:", error);
        return { success: false, message: "Error al eliminar liga" };
      }

      return { success: true, message: "Liga eliminada exitosamente" };
    } catch (error) {
      console.error("Error deleting league:", error);
      return { success: false, message: "Error al eliminar liga" };
    }
  };

  const getTeamRoster = async (
    teamId: string,
    week?: number
  ): Promise<RosterPlayer[]> => {
    if (!isAdmin) return [];

    try {
      const { data, error } = await supabase.rpc("get_team_roster_admin", {
        team_id: teamId,
        week_num: week || null,
      });

      if (error) {
        console.error("Error fetching team roster:", error);
        return [];
      }

      return (data || []) as RosterPlayer[];
    } catch (error) {
      console.error("Error fetching team roster:", error);
      return [];
    }
  };

  const editRosterPlayer = async (
    rosterId: number,
    newPlayerId: number,
    newSlot?: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!isAdmin || !user) {
      return { success: false, message: "Sin permisos de administrador" };
    }

    try {
      const { data, error } = await supabase.rpc("edit_roster_player", {
        admin_id: user.id,
        roster_id: rosterId,
        new_player_id: newPlayerId,
        new_slot: newSlot || null,
        reason: reason || null,
      });

      if (error) {
        console.error("Error editing roster player:", error);
        return {
          success: false,
          message: "Error al editar jugador del roster",
        };
      }

      const result = data as {
        success: boolean;
        message?: string;
        error?: string;
      };
      return {
        success: result.success,
        message:
          result.message || result.error || "Jugador editado exitosamente",
      };
    } catch (error) {
      console.error("Error editing roster player:", error);
      return { success: false, message: "Error al editar jugador del roster" };
    }
  };

  const editPlayerStats = async (
    playerData: PlayerEditData
  ): Promise<{
    success: boolean;
    message: string;
    old_points?: number;
    new_points?: number;
  }> => {
    if (!isAdmin || !user) {
      return { success: false, message: "Sin permisos de administrador" };
    }

    try {
      const { data, error } = await supabase.rpc("edit_player_stats", {
        admin_id: user.id,
        p_player_id: playerData.player_id,
        week_num: playerData.week,
        season_year: playerData.season,
        new_fantasy_points: playerData.fantasy_points,
        reason: playerData.reason || null,
      });

      if (error) {
        console.error("Error editing player stats:", error);
        return {
          success: false,
          message: "Error al editar puntajes del jugador",
        };
      }

      const result = data as {
        success: boolean;
        message?: string;
        error?: string;
        old_points?: number;
        new_points?: number;
      };
      return {
        success: result.success,
        message:
          result.message || result.error || "Puntajes editados exitosamente",
        old_points: result.old_points,
        new_points: result.new_points,
      };
    } catch (error) {
      console.error("Error editing player stats:", error);
      return {
        success: false,
        message: "Error al editar puntajes del jugador",
      };
    }
  };

  const addPlayerToRoster = async (
    teamId: string,
    playerId: number,
    slot: string,
    week: number,
    reason?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!isAdmin || !user) {
      return { success: false, message: "Sin permisos de administrador" };
    }

    try {
      const { data, error } = await supabase.rpc("add_player_to_roster", {
        admin_id: user.id,
        team_id: teamId,
        player_id: playerId,
        slot: slot,
        week_num: week,
        acquired_type: "admin_add",
        reason: reason || null,
      });

      if (error) {
        console.error("Error adding player to roster:", error);
        return {
          success: false,
          message: "Error al agregar jugador al roster",
        };
      }

      const result = data as {
        success: boolean;
        message?: string;
        error?: string;
      };
      return {
        success: result.success,
        message:
          result.message ||
          result.error ||
          "Jugador agregado al roster exitosamente",
      };
    } catch (error) {
      console.error("Error adding player to roster:", error);
      return { success: false, message: "Error al agregar jugador al roster" };
    }
  };

  const removePlayerFromRoster = async (
    rosterId: number,
    reason?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!isAdmin || !user) {
      return { success: false, message: "Sin permisos de administrador" };
    }

    try {
      const { data, error } = await supabase.rpc("remove_player_from_roster", {
        admin_id: user.id,
        roster_id: rosterId,
        reason: reason || null,
      });

      if (error) {
        console.error("Error removing player from roster:", error);
        return {
          success: false,
          message: "Error al remover jugador del roster",
        };
      }

      const result = data as {
        success: boolean;
        message?: string;
        error?: string;
      };
      return {
        success: result.success,
        message:
          result.message ||
          result.error ||
          "Jugador removido del roster exitosamente",
      };
    } catch (error) {
      console.error("Error removing player from roster:", error);
      return { success: false, message: "Error al remover jugador del roster" };
    }
  };

  const recalculateTeamScores = async (
    teamId: string,
    week: number,
    season: number = 2024
  ): Promise<{
    success: boolean;
    message: string;
    weekly_score?: number;
    old_total?: number;
  }> => {
    if (!isAdmin || !user) {
      return { success: false, message: "Sin permisos de administrador" };
    }

    try {
      const { data, error } = await supabase.rpc("recalculate_team_scores", {
        admin_id: user.id,
        team_id: teamId,
        week_num: week,
        season_year: season,
      });

      if (error) {
        console.error("Error recalculating team scores:", error);
        return {
          success: false,
          message: "Error al recalcular puntajes del equipo",
        };
      }

      const result = data as {
        success: boolean;
        message?: string;
        error?: string;
        weekly_score?: number;
        old_total?: number;
      };
      return {
        success: result.success,
        message:
          result.message ||
          result.error ||
          "Puntajes recalculados exitosamente",
        weekly_score: result.weekly_score,
        old_total: result.old_total,
      };
    } catch (error) {
      console.error("Error recalculating team scores:", error);
      return {
        success: false,
        message: "Error al recalcular puntajes del equipo",
      };
    }
  };

  return {
    isAdmin,
    loading,
    stats,
    fetchStats,
    fetchUsers,
    banUser,
    unbanUser,
    verifyUser,
    deleteLeague,
    checkAdminStatus,
    // Nuevas funciones de roster y puntajes
    getTeamRoster,
    editRosterPlayer,
    editPlayerStats,
    addPlayerToRoster,
    removePlayerFromRoster,
    recalculateTeamScores,
  };
};
