
export interface Player {
  id: string;
  name: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';
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
}

export interface Week {
  number: number;
  status: 'upcoming' | 'active' | 'completed';
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
