import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WeeklyScore {
  fantasyTeamId: string;
  teamName: string;
  userId: string;
  totalPoints: number;
  activePlayersCount: number;
}

interface EliminationResult {
  success: boolean;
  message: string;
  eliminatedTeam?: {
    id: string;
    name: string;
    points: number;
    userId: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🚀 Iniciando procesamiento de eliminaciones semanales...");

    // Obtener todas las ligas activas
    const { data: activeLeagues, error: leaguesError } = await supabase
      .from("leagues")
      .select("id, name, status")
      .eq("status", "active");

    if (leaguesError) {
      console.error("Error obteniendo ligas activas:", leaguesError);
      throw new Error(`Error obteniendo ligas: ${leaguesError.message}`);
    }

    if (!activeLeagues || activeLeagues.length === 0) {
      console.log("📋 No hay ligas activas para procesar");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No hay ligas activas para procesar",
          processedLeagues: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`🏈 Procesando ${activeLeagues.length} ligas activas`);

    // Determinar semana actual (esto se puede hacer más sofisticado)
    const currentWeek = getCurrentNFLWeek();
    const currentSeason = new Date().getFullYear();

    const results = [];

    // Procesar cada liga
    for (const league of activeLeagues) {
      try {
        console.log(`⚡ Procesando liga: ${league.name} (${league.id})`);

        const eliminationResult = await processLeagueElimination(
          supabase,
          league.id,
          currentWeek,
          currentSeason
        );

        results.push({
          leagueId: league.id,
          leagueName: league.name,
          ...eliminationResult,
        });

        console.log(
          `✅ Liga ${league.name} procesada: ${eliminationResult.message}`
        );
      } catch (error) {
        console.error(`❌ Error procesando liga ${league.name}:`, error);
        results.push({
          leagueId: league.id,
          leagueName: league.name,
          success: false,
          message: `Error: ${
            error instanceof Error ? error.message : "Error desconocido"
          }`,
        });
      }
    }

    const successfulEliminations = results.filter(
      (r) => r.success && r.eliminatedTeam
    ).length;
    const totalProcessed = results.length;

    console.log(
      `🎉 Procesamiento completado: ${successfulEliminations}/${totalProcessed} eliminaciones exitosas`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Procesadas ${totalProcessed} ligas, ${successfulEliminations} eliminaciones exitosas`,
        processedLeagues: totalProcessed,
        successfulEliminations,
        currentWeek,
        currentSeason,
        details: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("💥 Error crítico en weekly-elimination:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Función para procesar eliminación de una liga específica
async function processLeagueElimination(
  supabase: any,
  leagueId: string,
  week: number,
  season: number
): Promise<EliminationResult> {
  try {
    // 1. Verificar si ya se procesó esta semana
    const { data: existingElimination } = await supabase
      .from("fantasy_teams")
      .select("id")
      .eq("league_id", leagueId)
      .eq("eliminated", true)
      .eq("eliminated_week", week)
      .limit(1);

    if (existingElimination && existingElimination.length > 0) {
      return {
        success: false,
        message: `Ya se procesó eliminación para semana ${week}`,
      };
    }

    // 2. Calcular puntajes semanales
    const weeklyScores = await calculateWeeklyScores(
      supabase,
      leagueId,
      week,
      season
    );

    if (weeklyScores.length === 0) {
      return {
        success: false,
        message: "No hay equipos activos para eliminar",
      };
    }

    if (weeklyScores.length === 1) {
      return {
        success: false,
        message: "Solo queda un equipo, liga completada",
      };
    }

    // 3. Identificar equipo con menor puntaje
    const lowestScoreTeam = weeklyScores[0]; // Ya está ordenado

    console.log(
      `🎯 Eliminando equipo: ${lowestScoreTeam.teamName} (${lowestScoreTeam.totalPoints} pts)`
    );

    // 4. Marcar equipo como eliminado
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

    // 5. Liberar jugadores al waiver pool
    await releasePlayersToWaivers(
      supabase,
      lowestScoreTeam.fantasyTeamId,
      week
    );

    // 6. Crear notificación
    await createEliminationNotification(
      supabase,
      lowestScoreTeam.userId,
      leagueId,
      lowestScoreTeam.teamName,
      week,
      lowestScoreTeam.totalPoints
    );

    return {
      success: true,
      message: `Equipo ${lowestScoreTeam.teamName} eliminado con ${lowestScoreTeam.totalPoints} puntos`,
      eliminatedTeam: {
        id: lowestScoreTeam.fantasyTeamId,
        name: lowestScoreTeam.teamName,
        points: lowestScoreTeam.totalPoints,
        userId: lowestScoreTeam.userId,
      },
    };
  } catch (error) {
    console.error("Error en processLeagueElimination:", error);
    throw error;
  }
}

// Calcular puntajes semanales
async function calculateWeeklyScores(
  supabase: any,
  leagueId: string,
  week: number,
  season: number
): Promise<WeeklyScore[]> {
  // Obtener equipos activos
  const { data: teams, error: teamsError } = await supabase
    .from("fantasy_teams")
    .select("id, name, user_id")
    .eq("league_id", leagueId)
    .eq("eliminated", false);

  if (teamsError)
    throw new Error(`Error obteniendo equipos: ${teamsError.message}`);
  if (!teams || teams.length === 0) return [];

  const weeklyScores: WeeklyScore[] = [];

  for (const team of teams) {
    try {
      const teamScore = await calculateTeamWeeklyScore(
        supabase,
        team.id,
        week,
        season
      );
      weeklyScores.push({
        fantasyTeamId: team.id,
        teamName: team.name,
        userId: team.user_id,
        ...teamScore,
      });
    } catch (error) {
      console.error(`Error calculando puntaje para ${team.name}:`, error);
      weeklyScores.push({
        fantasyTeamId: team.id,
        teamName: team.name,
        userId: team.user_id,
        totalPoints: 0,
        activePlayersCount: 0,
      });
    }
  }

  // Ordenar por puntaje (menor a mayor)
  weeklyScores.sort((a, b) => a.totalPoints - b.totalPoints);
  return weeklyScores;
}

// Calcular puntaje de un equipo específico
async function calculateTeamWeeklyScore(
  supabase: any,
  fantasyTeamId: string,
  week: number,
  season: number
): Promise<{ totalPoints: number; activePlayersCount: number }> {
  // Obtener roster del equipo
  const { data: roster, error: rosterError } = await supabase
    .from("team_rosters")
    .select("player_id, is_active")
    .eq("fantasy_team_id", fantasyTeamId)
    .eq("week", week);

  if (rosterError)
    throw new Error(`Error obteniendo roster: ${rosterError.message}`);
  if (!roster || roster.length === 0) {
    return { totalPoints: 0, activePlayersCount: 0 };
  }

  // Obtener estadísticas de jugadores activos
  const activePlayerIds = roster
    .filter((r) => r.is_active)
    .map((r) => r.player_id);

  if (activePlayerIds.length === 0) {
    return { totalPoints: 0, activePlayersCount: 0 };
  }

  const { data: stats, error: statsError } = await supabase
    .from("player_stats")
    .select("fantasy_points")
    .in("player_id", activePlayerIds)
    .eq("week", week)
    .eq("season", season);

  if (statsError)
    throw new Error(`Error obteniendo stats: ${statsError.message}`);

  const totalPoints = (stats || []).reduce(
    (sum, stat) => sum + (stat.fantasy_points || 0),
    0
  );

  return {
    totalPoints,
    activePlayersCount: activePlayerIds.length,
  };
}

// Liberar jugadores al waiver pool
async function releasePlayersToWaivers(
  supabase: any,
  fantasyTeamId: string,
  week: number
): Promise<void> {
  // Marcar jugadores como no activos
  const { error: releaseError } = await supabase
    .from("team_rosters")
    .update({ is_active: false })
    .eq("fantasy_team_id", fantasyTeamId)
    .eq("week", week);

  if (releaseError) {
    throw new Error(`Error liberando jugadores: ${releaseError.message}`);
  }

  // Registrar movimientos (opcional, solo si no da error)
  const { data: playersToRelease } = await supabase
    .from("team_rosters")
    .select("player_id")
    .eq("fantasy_team_id", fantasyTeamId)
    .eq("week", week);

  if (playersToRelease && playersToRelease.length > 0) {
    const releaseMovements = playersToRelease.map((player) => ({
      fantasy_team_id: fantasyTeamId,
      player_id: player.player_id,
      week,
      action: "eliminated_release",
      acquired_type: "elimination",
    }));

    await supabase.from("roster_moves").insert(releaseMovements);
  }
}

// Crear notificación de eliminación
async function createEliminationNotification(
  supabase: any,
  userId: string,
  leagueId: string,
  teamName: string,
  week: number,
  points: number
): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: userId,
    league_id: leagueId,
    message: `Tu equipo "${teamName}" ha sido eliminado en la semana ${week} con ${points.toFixed(
      1
    )} puntos. Tus jugadores han sido liberados al waiver pool.`,
    type: "warning",
  });
}

// Obtener semana actual de la NFL (simplificado)
function getCurrentNFLWeek(): number {
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), 8, 1); // Septiembre 1

  // Si estamos antes del inicio de temporada, retornar semana 1
  if (now < seasonStart) {
    return 1;
  }

  // Calcular semana basada en días desde inicio de temporada
  const daysDiff = Math.floor(
    (now.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const week = Math.floor(daysDiff / 7) + 1;

  // Limitar a semanas válidas (1-18)
  return Math.min(Math.max(week, 1), 18);
}
