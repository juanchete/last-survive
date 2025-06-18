
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

    // Type assertion to handle the JSON response
    const result = data as any;

    return {
      success: true,
      message: result?.message || "Proceso semanal completado exitosamente",
      eliminatedTeam: result?.elimination_result?.eliminated_team,
      mvpTeam: result?.mvp_result?.mvp_team,
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

export const processWeeklyElimination = async (
  leagueId: string,
  week: number
): Promise<{ success: boolean; message: string; eliminatedTeams?: string[] }> => {
  try {
    // Call the RPC function to process elimination
    const { data, error } = await supabase.rpc('process_weekly_elimination', {
      league_id: leagueId,
      week_num: week
    });

    if (error) {
      console.error('Elimination processing error:', error);
      throw error;
    }

    // Parse the result
    const result = data as any;
    
    return {
      success: true,
      message: result?.message || 'Elimination processed successfully',
      eliminatedTeams: result?.elimination_result || []
    };
  } catch (error) {
    console.error('Error processing weekly elimination:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const logEliminationEvent = async (
  leagueId: string,
  week: number,
  eventData: any
) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: 'system',
        league_id: leagueId,
        type: 'elimination',
        message: `Week ${week} elimination has been processed`,
        data: eventData
      }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error logging elimination event:', error);
  }
};
