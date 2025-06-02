import { supabase } from "@/integrations/supabase/client";

export async function draftPlayer({
  leagueId,
  fantasyTeamId,
  playerId,
  week,
  slot,
}: {
  leagueId: string;
  fantasyTeamId: string;
  playerId: number;
  week: number;
  slot: string;
}) {
  try {
    console.log("🏈 Iniciando draft player:", {
      leagueId,
      fantasyTeamId,
      playerId,
      week,
      slot,
    });

    // 1. Insertar en team_rosters
    const { data: rosterData, error: rosterError } = await supabase
      .from("team_rosters")
      .insert({
        fantasy_team_id: fantasyTeamId,
        player_id: playerId,
        week,
        is_active: true,
        acquired_type: "draft",
        acquired_week: week,
        slot,
      })
      .select();

    if (rosterError) {
      console.error("❌ Error en team_rosters:", rosterError);
      throw new Error(`Error adding to roster: ${rosterError.message}`);
    }

    console.log("✅ Player agregado a roster:", rosterData);

    // 2. Insertar en roster_moves
    const { data: moveData, error: moveError } = await supabase
      .from("roster_moves")
      .insert({
        fantasy_team_id: fantasyTeamId,
        player_id: playerId,
        week,
        action: "draft_pick",
        acquired_type: "draft",
      })
      .select();

    if (moveError) {
      console.error("❌ Error en roster_moves:", moveError);
      throw new Error(`Error recording move: ${moveError.message}`);
    }

    console.log("✅ Draft move registrado:", moveData);

    // 3. Avanzar el turno del draft
    const { data: leagueData, error: leagueError } = await supabase
      .from("leagues")
      .select("draft_order, current_pick")
      .eq("id", leagueId)
      .single();

    if (leagueError) {
      console.error("❌ Error obteniendo estado del draft:", leagueError);
      // No lanzar error aquí, el draft ya se completó
    } else if (leagueData && leagueData.draft_order) {
      const nextPick = (leagueData.current_pick || 0) + 1;
      const totalTeams = leagueData.draft_order.length;

      console.log("🔄 Avanzando turno:", {
        currentPick: leagueData.current_pick,
        nextPick,
        totalTeams,
      });

      // Si llegamos al final, el draft podría completarse o continuar en snake
      const newPick = nextPick % totalTeams;

      const { error: updateError } = await supabase
        .from("leagues")
        .update({
          current_pick: newPick,
          // Si completamos todas las rondas necesarias, cambiar status
          draft_status:
            nextPick >= totalTeams * 15 ? "completed" : "in_progress", // 15 rondas por equipo
        })
        .eq("id", leagueId);

      if (updateError) {
        console.error("❌ Error actualizando turno:", updateError);
      } else {
        console.log("✅ Turno avanzado exitosamente a:", newPick);
      }
    }

    console.log("🎉 Draft completado exitosamente");
    return { success: true, data: { roster: rosterData, move: moveData } };
  } catch (error) {
    console.error("💥 Error en draftPlayer:", error);
    throw error;
  }
}

export async function requestWaiver({
  leagueId,
  week,
  fantasyTeamId,
  playerId,
  dropPlayerId,
}: {
  leagueId: string;
  week: number;
  fantasyTeamId: string;
  playerId: number;
  dropPlayerId?: number;
}) {
  const { error } = await supabase.from("waiver_requests").insert({
    league_id: leagueId,
    week,
    fantasy_team_id: fantasyTeamId,
    player_id: playerId,
    drop_player_id: dropPlayerId || null,
    status: "pending",
  });

  if (error) {
    throw new Error(`Error creating waiver request: ${error.message}`);
  }
}
