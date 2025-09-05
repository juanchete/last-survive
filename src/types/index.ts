export interface Player {
  id: string;
  name: string;
  position: "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "DP" | "LB" | "DB" | "DL";
  team: string;
  stats?: {
    passingYards?: number;
    passingTD?: number;
    rushingYards?: number;
    rushingTD?: number;
    receivingYards?: number;
    receivingTD?: number;
    fieldGoals?: number;
    tackles?: number;
    sacks?: number;
    interceptions?: number;
  };
  available: boolean;
  eliminated: boolean;
  points: number; // PPJ - Puntos Por Jugar (projected/fantasy points)
  actualPoints?: number; // PTS - Puntos acumulados reales
  photo?: string;
  adp?: number; // Average Draft Position
}

export interface NFLTeam {
  id: string;
  name: string;
  abbreviation: string;
  logo?: string;
  eliminated: boolean;
  eliminationWeek: number | null;
}

export interface FantasyTeam {
  id: string;
  name: string;
  owner: string;
  players: Player[];
  points: number;
  rank: number;
  eliminated: boolean;
  mvp_wins?: number;
  total_earnings?: number;
  user?: {
    full_name?: string;
    email?: string;
  };
}

export interface Week {
  number: number;
  status: "upcoming" | "active" | "completed";
  eliminatedTeam: NFLTeam | null;
}

export interface LeagueState {
  currentWeek: number;
  teams: FantasyTeam[];
  availablePlayers: Player[];
  nflTeams: NFLTeam[];
  weeks: Week[];
  draftInProgress: boolean;
}

export interface League {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  is_private: boolean;
  private_code?: string | null;
  owner_id: string;
  entry_fee: number;
  max_members: number;
  status: "active" | "upcoming" | "finished";
  prize: string;
  start_date: string;
  created_at: string;
  owner?: { email: string; full_name: string };
}

export interface LeagueMember {
  league_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  team_id?: string;
}

// Tipos para sistema de invitaciones
export interface LeagueInvitation {
  id: string;
  league_id: string;
  inviter_id: string;
  invitee_email: string;
  invite_code: string;
  status: "pending" | "accepted" | "declined" | "expired";
  created_at: string;
  expires_at: string;
  league?: League;
  inviter?: { full_name: string; email: string };
}

// Tipos para sistema de trades
export type TradeStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "vetoed";

export interface Trade {
  id: string;
  league_id: string;
  proposer_team_id: string;
  receiver_team_id: string;
  proposer_player_ids: string[]; // IDs de jugadores ofrecidos
  receiver_player_ids: string[]; // IDs de jugadores solicitados
  status: TradeStatus;
  created_at: string;
  updated_at: string;
  message?: string;
  votes?: TradeVote[];
}

export interface TradeVote {
  id: string;
  trade_id: string;
  user_id: string;
  vote: "approve" | "reject";
  created_at: string;
}

// MVP types
export interface WeeklyMVPHistory {
  id: string;
  league_id: string;
  week: number;
  season: number;
  fantasy_team_id: string;
  points: number;
  earnings: number;
  created_at: string;
}

// Tipos para sistema de administración
export type UserRole = "user" | "admin" | "super_admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
  favorite_team?: string;
  role: UserRole;
  banned: boolean;
  verified: boolean;
  banned_at?: string;
  banned_reason?: string;
  banned_by?: string;
  verified_at?: string;
  verified_by?: string;
}

export interface AdminAction {
  id: string;
  admin_user_id: string;
  target_user_id?: string;
  target_league_id?: string;
  target_player_id?: number;
  action_type: string;
  action_details?: Record<string, unknown>;
  reason?: string;
  created_at: string;
  admin_user?: { full_name: string; email: string };
  target_user?: { full_name: string; email: string };
}

export interface AdminStats {
  total_users: number;
  banned_users: number;
  verified_users: number;
  total_leagues: number;
  active_leagues: number;
  total_players: number;
  recent_actions: AdminAction[];
}

export interface PlayerEditData {
  id: number;
  name: string;
  position: "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "DP" | "LB" | "DB" | "DL";
  nfl_team_id?: number;
  photo_url?: string;
}

export interface RosterEditData {
  fantasy_team_id: string;
  player_id: number;
  action: "add" | "remove";
  week?: number;
}
