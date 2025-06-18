import { supabase } from "@/integrations/supabase/client";

export interface League {
  id: string;
  name: string;
  description: string;
  created_at: string;
  admin_id: string;
}

export interface FantasyTeam {
  id: string;
  name: string;
  league_id: string;
  user_id: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
}

export interface Player {
  id: string;
  name: string;
  position: "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
  team: string;
  available: boolean;
  eliminated: boolean;
  points: number;
  photo: string;
}

export interface DraftPick {
  id: string;
  league_id: string;
  fantasy_team_id: string;
  player_id: string;
  pick_number: number;
  round: number;
  created_at: string;
}

export async function getAvailablePlayers(leagueId: string, week: number = 1): Promise<Player[]> {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select(`
        id,
        name,
        position,
        photo_url,
        nfl_teams!inner(name, abbreviation)
      `);

    if (error) throw error;

    // Convert to the expected format
    return (players || []).map(player => ({
      id: player.id.toString(),
      name: player.name,
      position: player.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF",
      team: player.nfl_teams?.abbreviation || 'FA',
      available: true,
      eliminated: false,
      points: 0,
      photo: player.photo_url || ''
    }));
  } catch (error) {
    console.error('Error fetching available players:', error);
    return [];
  }
}

export async function getDraftPicks(leagueId: string): Promise<DraftPick[]> {
  try {
    const { data: draftPicks, error } = await supabase
      .from('draft_picks')
      .select('*')
      .eq('league_id', leagueId)
      .order('pick_number', { ascending: true });

    if (error) throw error;

    return draftPicks || [];
  } catch (error) {
    console.error('Error fetching draft picks:', error);
    return [];
  }
}

export async function saveDraftPick(
  leagueId: string,
  fantasyTeamId: string,
  playerId: string,
  pickNumber: number,
  round: number
): Promise<boolean> {
  try {
    // Insert into team_rosters instead of draft_picks since that table doesn't exist
    const { error } = await supabase
      .from('team_rosters')
      .insert({
        fantasy_team_id: fantasyTeamId,
        player_id: parseInt(playerId),
        week: 1,
        is_active: true,
        acquired_type: 'draft',
        acquired_week: 1,
        slot: 'BENCH'
      });

    if (error) {
      console.error('Error saving draft pick:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveDraftPick:', error);
    return false;
  }
}

export async function removePlayerFromAvailable(playerId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('players')
      .update({ available: false })
      .eq('id', playerId);

    if (error) {
      console.error('Error removing player from available:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removePlayerFromAvailable:', error);
    return false;
  }
}
