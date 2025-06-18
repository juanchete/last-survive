
export interface Player {
  id: string;
  name: string;
  position: "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
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
  points: number;
  photo?: string;
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
