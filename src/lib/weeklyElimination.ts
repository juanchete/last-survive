import { supabase } from "@/integrations/supabase/client";

export interface WeeklyScore {
  fantasyTeamId: string;
  teamName: string;
  userId: string;
  totalPoints: number;
  activePlayersCount: number;
  playerBreakdown: Array<{
    playerId: number;
    playerName: string;
    position: string;
    points: number;
    isActive: boolean;
  }>;
}

export interface EliminationResult {
  success: boolean;
  message: string;
  eliminatedTeam?: {
    id: string;
    name: string;
    points: number;
    userId: string;
  };
  mvpTeam?: {
    id: string;
    name: string;
    points: number;
    earnings: number;
  };
  weeklyScores?: WeeklyScore[];
}

// Calcular puntajes semanales de todos los equipos en una liga
export async function calculateWeeklyScores(
  leagueId: string,
  week: number,
  season: number = 2024
): Promise<WeeklyScore[]> {
  try {
    console.log("🔢 Calculando puntajes semanales...", {
      leagueId,
      week,
      season,
    });

    // 1. Obtener todos los equipos de la liga
    const { data: teams, error: teamsError } = await supabase
      .from("fantasy_teams")
      .select("id, name, user_id, eliminated")
      .eq("league_id", leagueId)
      .eq("eliminated", false); // Solo equipos no eliminados

    if (teamsError)
      throw new Error(`Error obteniendo equipos: ${teamsError.message}`);
    if (!teams || teams.length === 0) {
      console.log("⚠️ No se encontraron equipos activos en la liga");
      return [];
    }

    console.log(`📊 Calculando para ${teams.length} equipos activos`);

    const weeklyScores: WeeklyScore[] = [];

    // 2. Para cada equipo, calcular su puntaje semanal
    for (const team of teams) {
      try {
        const teamScore = await calculateTeamWeeklyScore(team.id, week, season);
        weeklyScores.push({
          fantasyTeamId: team.id,
          teamName: team.name,
          userId: team.user_id,
          ...teamScore,
        });
      } catch (error) {
        console.error(
          `❌ Error calculando puntaje para equipo ${team.name}:`,
          error
        );
        // Agregar equipo con 0 puntos si hay error
        weeklyScores.push({
          fantasyTeamId: team.id,
          teamName: team.name,
          userId: team.user_id,
          totalPoints: 0,
          activePlayersCount: 0,
          playerBreakdown: [],
        });
      }
    }

    // 3. Ordenar por puntaje (menor a mayor para identificar eliminación)
    weeklyScores.sort((a, b) => a.totalPoints - b.totalPoints);

    console.log(
      "✅ Puntajes calculados:",
      weeklyScores.map(
        (s) =>
          `${s.teamName}: ${s.totalPoints} pts (${s.activePlayersCount} jugadores)`
      )
    );

    return weeklyScores;
  } catch (error) {
    console.error("💥 Error en calculateWeeklyScores:", error);
    throw error;
  }
}

// Calcular puntaje semanal de un equipo específico
async function calculateTeamWeeklyScore(
  fantasyTeamId: string,
  week: number,
  season: number
): Promise<{
  totalPoints: number;
  activePlayersCount: number;
  playerBreakdown: Array<{
    playerId: number;
    playerName: string;
    position: string;
    points: number;
    isActive: boolean;
  }>;
}> {
  // 1. Obtener roster del equipo para esa semana
  const { data: roster, error: rosterError } = await supabase
    .from("team_rosters")
    .select(
      `
      player_id,
      is_active,
      slot,
      players!inner (
        id,
        name,
        position
      )
    `
    )
    .eq("fantasy_team_id", fantasyTeamId)
    .eq("week", week);

  if (rosterError)
    throw new Error(`Error obteniendo roster: ${rosterError.message}`);
  if (!roster || roster.length === 0) {
    console.log(
      `⚠️ No se encontró roster para equipo ${fantasyTeamId} en semana ${week}`
    );
    return {
      totalPoints: 0,
      activePlayersCount: 0,
      playerBreakdown: [],
    };
  }

  // 2. Obtener estadísticas de los jugadores para esa semana
  const playerIds = roster.map((r) => r.player_id);
  const { data: stats, error: statsError } = await supabase
    .from("player_stats")
    .select("player_id, fantasy_points")
    .in("player_id", playerIds)
    .eq("week", week)
    .eq("season", season);

  if (statsError)
    throw new Error(`Error obteniendo stats: ${statsError.message}`);

  // 3. Crear mapa de puntos por jugador
  const pointsMap = new Map(
    (stats || []).map((stat) => [stat.player_id, stat.fantasy_points || 0])
  );

  // 4. Calcular puntaje total y breakdown
  let totalPoints = 0;
  let activePlayersCount = 0;
  const playerBreakdown = roster.map((rosterItem) => {
    const player = rosterItem.players;
    const points = pointsMap.get(rosterItem.player_id) || 0;
    const isActive = rosterItem.is_active;

    if (isActive) {
      totalPoints += points;
      activePlayersCount++;
    }

    return {
      playerId: rosterItem.player_id,
      playerName: player.name,
      position: player.position,
      points,
      isActive,
    };
  });

  return {
    totalPoints,
    activePlayersCount,
    playerBreakdown,
  };
}

// Procesar MVP y eliminación semanal
export async function processWeeklyEliminationWithMVP(
  leagueId: string,
  week: number,
  season: number = 2024
): Promise<EliminationResult> {
  try {
    console.log("⚡ Iniciando proceso semanal con MVP...", {
      leagueId,
      week,
      season,
    });

    // Usar la función de base de datos que procesa MVP + eliminación
    const { data, error } = await supabase.rpc(
      "process_weekly_elimination_with_mvp",
      {
        league_id: leagueId,
        week_num: week,
        season_year: season,
      }
    );

    if (error) {
      throw new Error(`Error procesando semana: ${error.message}`);
    }

    console.log("✅ Proceso completado:", data);

    return {
      success: true,
      message: data.message || "Proceso semanal completado exitosamente",
      eliminatedTeam: data.elimination_result?.eliminated_team,
      mvpTeam: data.mvp_result?.mvp_team,
    };
  } catch (error) {
    console.error("💥 Error en processWeeklyEliminationWithMVP:", error);
    return {
      success: false,
      message: `Error procesando semana: ${
        error instanceof Error ? error.message : "Error desconocido"
      }`,
    };
  }
}

// Detectar y eliminar el equipo con menor puntaje
export async function processWeeklyElimination(
  leagueId: string,
  week: number,
  season: number = 2024
): Promise<EliminationResult> {
  try {
    console.log("⚡ Iniciando proceso de eliminación semanal...", {
      leagueId,
      week,
      season,
    });

    // 1. Calcular puntajes de todos los equipos
    const weeklyScores = await calculateWeeklyScores(leagueId, week, season);

    if (weeklyScores.length === 0) {
      return {
        success: false,
        message: "No hay equipos activos para eliminar",
        weeklyScores,
      };
    }

    if (weeklyScores.length === 1) {
      return {
        success: false,
        message: "Solo queda un equipo, no se puede eliminar más",
        weeklyScores,
      };
    }

    // 2. Identificar equipo con menor puntaje
    const lowestScoreTeam = weeklyScores[0]; // Ya está ordenado de menor a mayor

    console.log(
      `🎯 Equipo a eliminar: ${lowestScoreTeam.teamName} (${lowestScoreTeam.totalPoints} pts)`
    );

    // 3. Marcar equipo como eliminado
    const { error: eliminationError } = await supabase
      .from("fantasy_teams")
      .update({
        eliminated: true,
        eliminated_week: week,
      })
      .eq("id", lowestScoreTeam.fantasyTeamId);

    if (eliminationError) {
      throw new Error(`Error eliminando equipo: ${eliminationError.message}`);
    }

    console.log("✅ Equipo marcado como eliminado en base de datos");

    // 4. Liberar jugadores al waiver pool
    await releasePlayersToWaivers(lowestScoreTeam.fantasyTeamId, week);

    // 5. Crear notificación de eliminación
    await createEliminationNotification(
      lowestScoreTeam.userId,
      leagueId,
      lowestScoreTeam.teamName,
      week,
      lowestScoreTeam.totalPoints
    );

    console.log("🎉 Proceso de eliminación completado exitosamente");

    return {
      success: true,
      message: `Equipo ${lowestScoreTeam.teamName} eliminado con ${lowestScoreTeam.totalPoints} puntos`,
      eliminatedTeam: {
        id: lowestScoreTeam.fantasyTeamId,
        name: lowestScoreTeam.teamName,
        points: lowestScoreTeam.totalPoints,
        userId: lowestScoreTeam.userId,
      },
      weeklyScores,
    };
  } catch (error) {
    console.error("💥 Error en processWeeklyElimination:", error);
    return {
      success: false,
      message: `Error procesando eliminación: ${
        error instanceof Error ? error.message : "Error desconocido"
      }`,
    };
  }
}

// Liberar jugadores de equipo eliminado al waiver pool
async function releasePlayersToWaivers(
  fantasyTeamId: string,
  week: number
): Promise<void> {
  try {
    console.log("🔄 Liberando jugadores al waiver pool...", {
      fantasyTeamId,
      week,
    });

    // 1. Obtener jugadores del equipo eliminado
    const { data: playersToRelease, error: playersError } = await supabase
      .from("team_rosters")
      .select("player_id, slot")
      .eq("fantasy_team_id", fantasyTeamId)
      .eq("week", week);

    if (playersError) {
      throw new Error(`Error obteniendo jugadores: ${playersError.message}`);
    }

    if (!playersToRelease || playersToRelease.length === 0) {
      console.log("⚠️ No hay jugadores para liberar");
      return;
    }

    // 2. Marcar jugadores como no activos (liberados)
    const { error: releaseError } = await supabase
      .from("team_rosters")
      .update({ is_active: false })
      .eq("fantasy_team_id", fantasyTeamId)
      .eq("week", week);

    if (releaseError) {
      throw new Error(`Error liberando jugadores: ${releaseError.message}`);
    }

    // 3. Registrar movimientos de liberación
    const releaseMovements = playersToRelease.map((player) => ({
      fantasy_team_id: fantasyTeamId,
      player_id: player.player_id,
      week,
      action: "eliminated_release",
      acquired_type: "elimination",
    }));

    const { error: movesError } = await supabase
      .from("roster_moves")
      .insert(releaseMovements);

    if (movesError) {
      console.error("⚠️ Error registrando movimientos:", movesError);
      // No hacer throw aquí, la liberación ya se completó
    }

    console.log(
      `✅ Liberados ${playersToRelease.length} jugadores al waiver pool`
    );
  } catch (error) {
    console.error("💥 Error en releasePlayersToWaivers:", error);
    throw error;
  }
}

// Crear notificación de eliminación
async function createEliminationNotification(
  userId: string,
  leagueId: string,
  teamName: string,
  week: number,
  points: number
): Promise<void> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      league_id: leagueId,
      message: `Tu equipo "${teamName}" ha sido eliminado en la semana ${week} con ${points} puntos. Tus jugadores han sido liberados al waiver pool.`,
      type: "warning",
    });

    if (error) {
      console.error("⚠️ Error creando notificación:", error);
      // No hacer throw, la eliminación principal ya se completó
    } else {
      console.log("📧 Notificación de eliminación creada");
    }
  } catch (error) {
    console.error("💥 Error en createEliminationNotification:", error);
  }
}

// Verificar si un equipo está eliminado
export async function isTeamEliminated(
  fantasyTeamId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("fantasy_teams")
      .select("eliminated")
      .eq("id", fantasyTeamId)
      .single();

    if (error) {
      console.error("Error verificando eliminación:", error);
      return false;
    }

    return data?.eliminated || false;
  } catch (error) {
    console.error("Error en isTeamEliminated:", error);
    return false;
  }
}
