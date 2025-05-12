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
  // 1. Insertar en team_rosters
  await supabase.from("team_rosters").insert({
    fantasy_team_id: fantasyTeamId,
    player_id: playerId,
    week,
    is_active: true,
    acquired_type: "draft",
    acquired_week: week,
    slot,
  });

  // 2. Insertar en roster_moves
  await supabase.from("roster_moves").insert({
    fantasy_team_id: fantasyTeamId,
    player_id: playerId,
    week,
    action: "draft_pick",
    acquired_type: "draft",
  });
}

export async function requestWaiver({
  leagueId,
  week,
  fantasyTeamId,
  playerId,
}: {
  leagueId: string;
  week: number;
  fantasyTeamId: string;
  playerId: number;
}) {
  await supabase.from("waiver_requests").insert({
    league_id: leagueId,
    week,
    fantasy_team_id: fantasyTeamId,
    player_id: playerId,
    status: "pending",
  });
}
