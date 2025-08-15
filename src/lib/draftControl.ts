import { supabase } from "@/integrations/supabase/client";
import { executeAutoDraft } from "@/lib/autoDraft";

export type DraftStatus = "pending" | "in_progress" | "completed";

interface DraftControlResult {
  success: boolean;
  message: string;
  newStatus?: DraftStatus;
}

interface SimulateDraftResult extends DraftControlResult {
  totalPicks?: number;
  completedPicks?: number;
}

// Verificar si el usuario es owner de la liga
export async function verifyLeagueOwnership(
  userId: string,
  leagueId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("leagues")
      .select("owner_id")
      .eq("id", leagueId)
      .single();

    if (error || !data) {
      console.error("Error verificando ownership:", error);
      return false;
    }

    return data.owner_id === userId;
  } catch (error) {
    console.error("Error en verifyLeagueOwnership:", error);
    return false;
  }
}

// Obtener estado actual del draft
async function getCurrentDraftState(leagueId: string) {
  const { data, error } = await supabase
    .from("leagues")
    .select("draft_status, current_pick, draft_order, owner_id")
    .eq("id", leagueId)
    .single();

  if (error) throw new Error(`Error obteniendo estado: ${error.message}`);
  return data;
}

// Obtener equipos y jugadores disponibles para simulación
async function getSimulationData(leagueId: string, currentWeek: number) {
  // Obtener equipos
  const { data: teams, error: teamsError } = await supabase
    .from("fantasy_teams")
    .select("id, name")
    .eq("league_id", leagueId);

  if (teamsError)
    throw new Error(`Error obteniendo equipos: ${teamsError.message}`);

  // Obtener jugadores disponibles
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, name, position, nfl_team_id, photo_url");

  if (playersError)
    throw new Error(`Error obteniendo jugadores: ${playersError.message}`);

  // Obtener equipos NFL
  const { data: nflTeams, error: nflTeamsError } = await supabase
    .from("nfl_teams")
    .select("id, name, abbreviation, eliminated");

  if (nflTeamsError)
    throw new Error(`Error obteniendo equipos NFL: ${nflTeamsError.message}`);

  // Obtener picks ya realizados
  const { data: rosters, error: rostersError } = await supabase
    .from("team_rosters")
    .select("player_id, fantasy_team_id")
    .eq("week", currentWeek);

  if (rostersError)
    throw new Error(`Error obteniendo rosters: ${rostersError.message}`);

  const draftedIds = new Set(rosters?.map((r) => r.player_id));
  const teamMap = new Map(nflTeams.map((t) => [t.id, t]));

  // Armar jugadores disponibles
  const availablePlayers = players
    .map((player) => {
      const nflTeam = teamMap.get(player.nfl_team_id);
      return {
        id: String(player.id),
        name: player.name,
        position: player.position,
        team: nflTeam?.abbreviation || "",
        available: !draftedIds.has(player.id),
        eliminated: nflTeam?.eliminated || false,
        points: 0, // Para simplicidad
        photo: player.photo_url,
      };
    })
    .filter((p) => p.available);

  return { teams, availablePlayers };
}

// Simular draft completo (solo para testing)
export async function simulateCompleteDraft(
  userId: string,
  leagueId: string,
  maxRounds: number = 10
): Promise<SimulateDraftResult> {
  try {
    // Verificar permisos
    const isOwner = await verifyLeagueOwnership(userId, leagueId);
    if (!isOwner) {
      return {
        success: false,
        message: "Solo el owner de la liga puede simular el draft completo",
      };
    }

    // Obtener estado actual
    const currentState = await getCurrentDraftState(leagueId);
    if (currentState.draft_status === "completed") {
      return {
        success: false,
        message: "El draft ya está completado",
      };
    }

    if (!currentState.draft_order || currentState.draft_order.length === 0) {
      return {
        success: false,
        message: "No hay draft order configurado",
      };
    }

    // Cambiar a in_progress si está en pending
    if (currentState.draft_status === "pending") {
      const { error } = await supabase
        .from("leagues")
        .update({ draft_status: "in_progress" })
        .eq("id", leagueId);

      if (error) throw error;
    }

    const totalTeams = currentState.draft_order.length;
    const maxPicks = totalTeams * maxRounds;
    let currentPick = currentState.current_pick || 0;
    let completedPicks = 0;
    let consecutiveErrors = 0;
    const maxErrors = 5;

    // Simular picks uno por uno
    while (currentPick < maxPicks && consecutiveErrors < maxErrors) {
      try {
        const teamIndex = currentPick % totalTeams;
        const currentTeamId = currentState.draft_order[teamIndex];

        // Obtener datos actualizados para este pick
        const { availablePlayers } = await getSimulationData(leagueId, 1);

        if (availablePlayers.length === 0) {
          break;
        }

        // Obtener roster actual del equipo
        const { data: currentRoster } = await supabase
          .from("team_rosters")
          .select("*")
          .eq("fantasy_team_id", currentTeamId)
          .eq("week", 1);

        // Ejecutar auto-draft para este equipo
        const autoDraftResult = await executeAutoDraft({
          leagueId,
          fantasyTeamId: currentTeamId,
          availablePlayers,
          currentRoster: currentRoster || [],
          currentWeek: 1,
        });

        if (autoDraftResult.success) {
          completedPicks++;
          consecutiveErrors = 0;

          // Pequeña pausa para no sobrecargar
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else {
          consecutiveErrors++;
          console.error(
            `❌ Error en pick ${currentPick + 1}:`,
            autoDraftResult.error
          );
        }

        currentPick++;
      } catch (error) {
        consecutiveErrors++;
        console.error(`💥 Error simulando pick ${currentPick + 1}:`, error);
        currentPick++;
      }
    }

    // Finalizar draft
    const { error: finalizeError } = await supabase
      .from("leagues")
      .update({
        current_pick: currentPick,
        draft_status: "completed",
      })
      .eq("id", leagueId);

    if (finalizeError) {
      console.error("Error finalizando draft:", finalizeError);
    }


    return {
      success: true,
      message: `Simulación completada: ${completedPicks} picks realizados automáticamente`,
      newStatus: "completed",
      totalPicks: maxPicks,
      completedPicks,
    };
  } catch (error) {
    console.error("💥 Error en simulateCompleteDraft:", error);
    return {
      success: false,
      message: `Error simulando draft: ${
        error instanceof Error ? error.message : "Error desconocido"
      }`,
    };
  }
}

// Pausar draft (in_progress → pending)
export async function pauseDraft(
  userId: string,
  leagueId: string
): Promise<DraftControlResult> {
  try {

    // Verificar permisos
    const isOwner = await verifyLeagueOwnership(userId, leagueId);
    if (!isOwner) {
      return {
        success: false,
        message: "Solo el owner de la liga puede pausar el draft",
      };
    }

    // Verificar estado actual
    const currentState = await getCurrentDraftState(leagueId);
    if (currentState.draft_status !== "in_progress") {
      return {
        success: false,
        message: `No se puede pausar. Estado actual: ${currentState.draft_status}`,
      };
    }

    // Pausar
    const { error } = await supabase
      .from("leagues")
      .update({ draft_status: "pending" })
      .eq("id", leagueId);

    if (error) throw error;

    return {
      success: true,
      message: "Draft pausado exitosamente",
      newStatus: "pending",
    };
  } catch (error) {
    console.error("💥 Error pausando draft:", error);
    return {
      success: false,
      message: `Error pausando draft: ${
        error instanceof Error ? error.message : "Error desconocido"
      }`,
    };
  }
}

// Reanudar draft (pending → in_progress)
export async function resumeDraft(
  userId: string,
  leagueId: string
): Promise<DraftControlResult> {
  try {

    // Verificar permisos
    const isOwner = await verifyLeagueOwnership(userId, leagueId);
    if (!isOwner) {
      return {
        success: false,
        message: "Solo el owner de la liga puede reanudar el draft",
      };
    }

    // Verificar estado actual
    const currentState = await getCurrentDraftState(leagueId);
    if (currentState.draft_status !== "pending") {
      return {
        success: false,
        message: `No se puede reanudar. Estado actual: ${currentState.draft_status}`,
      };
    }

    // Reanudar
    const { error } = await supabase
      .from("leagues")
      .update({ draft_status: "in_progress" })
      .eq("id", leagueId);

    if (error) throw error;

    return {
      success: true,
      message: "Draft reanudado exitosamente",
      newStatus: "in_progress",
    };
  } catch (error) {
    console.error("💥 Error reanudando draft:", error);
    return {
      success: false,
      message: `Error reanudando draft: ${
        error instanceof Error ? error.message : "Error desconocido"
      }`,
    };
  }
}

// Finalizar draft (cualquier estado → completed)
export async function completeDraft(
  userId: string,
  leagueId: string
): Promise<DraftControlResult> {
  try {

    // Verificar permisos
    const isOwner = await verifyLeagueOwnership(userId, leagueId);
    if (!isOwner) {
      return {
        success: false,
        message: "Solo el owner de la liga puede finalizar el draft",
      };
    }

    // Verificar estado actual
    const currentState = await getCurrentDraftState(leagueId);
    if (currentState.draft_status === "completed") {
      return {
        success: false,
        message: "El draft ya está completado",
      };
    }

    // Finalizar
    const { error } = await supabase
      .from("leagues")
      .update({ draft_status: "completed" })
      .eq("id", leagueId);

    if (error) throw error;

    return {
      success: true,
      message: "Draft finalizado exitosamente",
      newStatus: "completed",
    };
  } catch (error) {
    console.error("💥 Error finalizando draft:", error);
    return {
      success: false,
      message: `Error finalizando draft: ${
        error instanceof Error ? error.message : "Error desconocido"
      }`,
    };
  }
}

// Resetear draft (limpiar todo + pending)
export async function resetDraft(
  userId: string,
  leagueId: string
): Promise<DraftControlResult> {
  try {

    // Verificar permisos
    const isOwner = await verifyLeagueOwnership(userId, leagueId);
    if (!isOwner) {
      return {
        success: false,
        message: "Solo el owner de la liga puede resetear el draft",
      };
    }

    // Limpiar datos del draft en una transacción
    const { error: rosterError } = await supabase
      .from("team_rosters")
      .delete()
      .eq("acquired_type", "draft");

    if (rosterError) {
      console.error("Error limpiando team_rosters:", rosterError);
    }

    const { error: movesError } = await supabase
      .from("roster_moves")
      .delete()
      .eq("action", "draft_pick");

    if (movesError) {
      console.error("Error limpiando roster_moves:", movesError);
    }

    const { error: leagueError } = await supabase
      .from("leagues")
      .update({
        current_pick: 0,
        draft_status: "pending",
        draft_order: null
      })
      .eq("id", leagueId);

    if (leagueError) throw leagueError;

    return {
      success: true,
      message:
        "Draft reseteado exitosamente. Todos los picks fueron eliminados.",
      newStatus: "pending",
    };
  } catch (error) {
    console.error("💥 Error reseteando draft:", error);
    return {
      success: false,
      message: `Error reseteando draft: ${
        error instanceof Error ? error.message : "Error desconocido"
      }`,
    };
  }
}

export async function getAvailablePlayers(leagueId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('available', true);
  
  if (error) throw error;
  
  return data.map(player => ({
    ...player,
    position: player.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF"
  }));
}
