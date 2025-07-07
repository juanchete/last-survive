export interface SleeperNFLState {
  week: number;
  leg: number;
  season: string;
  season_type: 'regular' | 'pre' | 'post' | 'off';
  league_season: string;
  previous_season: string;
  season_start_date: string | null;
  display_week: number;
  league_create_season: string;
  season_has_scores: boolean;
}

export interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  position: string;
  team: string | null;
  team_abbr: string | null;
  fantasy_positions: string[];
  active: boolean;
  age: number;
  height: string;
  weight: string;
  years_exp: number;
  college: string;
  birth_date: string;
  espn_id: number | null;
  yahoo_id: number | null;
  rotowire_id: number | null;
  stats_id: number | null;
  sportradar_id: string;
  fantasy_data_id: number | null;
  gsis_id: string | null;
  search_full_name: string;
  injury_status: string | null;
  injury_body_part: string | null;
  injury_notes: string | null;
  news_updated: number | null;
  status: string;
}

export interface SleeperPlayerStats {
  player_id: string;
  week: number;
  season: string;
  season_type: 'regular' | 'pre' | 'post';
  sport: 'nfl';
  category: 'stat';
  team: string;
  opponent: string;
  date: string;
  game_id: string;
  stats: {
    // Fantasy Points
    pts_std?: number;
    pts_ppr?: number;
    pts_half_ppr?: number;
    
    // Passing Stats
    pass_att?: number;
    pass_cmp?: number;
    pass_yd?: number;
    pass_td?: number;
    pass_int?: number;
    pass_lng?: number;
    cmp_pct?: number;
    pass_rtg?: number;
    pass_sack?: number;
    pass_sack_yds?: number;
    
    // Rushing Stats
    rush_att?: number;
    rush_yd?: number;
    rush_td?: number;
    rush_lng?: number;
    rush_ypa?: number;
    rush_fd?: number;
    
    // Receiving Stats
    rec?: number;
    rec_tgt?: number;
    rec_yd?: number;
    rec_td?: number;
    rec_lng?: number;
    rec_ypr?: number;
    rec_fd?: number;
    
    // Kicking Stats
    fgm?: number;
    fga?: number;
    fgm_0_19?: number;
    fgm_20_29?: number;
    fgm_30_39?: number;
    fgm_40_49?: number;
    fgm_50p?: number;
    xpm?: number;
    xpa?: number;
    
    // Defense Stats
    def_int?: number;
    def_fr?: number;
    def_sack?: number;
    def_td?: number;
    def_st_td?: number;
    def_pts_allowed?: number;
    def_yds_allowed?: number;
    
    // General Stats
    fum?: number;
    gp?: number;
    gs?: number;
    gms_active?: number;
    
    // Position Rankings
    pos_rank_std?: number;
    pos_rank_ppr?: number;
    pos_rank_half_ppr?: number;
  };
  player: SleeperPlayer;
  status: string | null;
  last_modified: number;
  updated_at: number;
  company: string;
}

export interface SleeperPlayersResponse {
  [playerId: string]: SleeperPlayer;
}

export interface SleeperStatsResponse {
  [index: string]: SleeperPlayerStats;
}

export interface SleeperProjections {
  player_id: string;
  week: number;
  season: string;
  season_type: 'regular' | 'pre' | 'post';
  sport: 'nfl';
  category: 'proj';
  team: string;
  opponent: string;
  date: string;
  game_id: string;
  stats: {
    pts_std?: number;
    pts_ppr?: number;
    pts_half_ppr?: number;
    [key: string]: number | undefined;
  };
  player: SleeperPlayer;
  status: string | null;
  last_modified: number;
  updated_at: number;
  company: string;
}

export interface SleeperProjectionsResponse {
  [index: string]: SleeperProjections;
}

export interface SleeperAPIError {
  error: string;
  message: string;
  status: number;
}