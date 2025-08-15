import { supabase } from "@/integrations/supabase/client";

const isDev = process.env.NODE_ENV === 'development';

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
      if (isDev) console.error("❌ Error en team_rosters:", rosterError);
      throw new Error(`Error adding to roster: ${rosterError.message}`);
    }


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
      if (isDev) console.error("❌ Error en roster_moves:", moveError);
      throw new Error(`Error recording move: ${moveError.message}`);
    }


    // 3. Avanzar el turno del draft
    const { data: leagueData, error: leagueError } = await supabase
      .from("leagues")
      .select("draft_order, current_pick")
      .eq("id", leagueId)
      .single();

    if (leagueError) {
      if (isDev) console.error("❌ Error obteniendo estado del draft:", leagueError);
      // No lanzar error aquí, el draft ya se completó
    } else if (leagueData && leagueData.draft_order) {
      const currentPickNumber = (leagueData.current_pick || 0) + 1; // Overall pick number (1-based)
      const totalTeams = leagueData.draft_order.length;
      const totalPicks = totalTeams * 10; // 10 rounds total

      // Check if draft is complete
      if (currentPickNumber >= totalPicks) {
        const { error: updateError } = await supabase
          .from("leagues")
          .update({
            current_pick: currentPickNumber,
            draft_status: "completed"
          })
          .eq("id", leagueId);
        
        if (updateError) {
          if (isDev) console.error("❌ Error completando draft:", updateError);
        }
      } else {
        // Continue with next pick
        const { error: updateError } = await supabase
          .from("leagues")
          .update({
            current_pick: currentPickNumber,
            draft_status: "in_progress"
          })
          .eq("id", leagueId);

        if (updateError) {
          if (isDev) console.error("❌ Error actualizando turno:", updateError);
        }
      }
    }

    return { success: true, data: { roster: rosterData, move: moveData } };
  } catch (error) {
    if (isDev) console.error("💥 Error en draftPlayer:", error);
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
