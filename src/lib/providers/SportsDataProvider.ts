/**
 * SportsDataProvider Implementation
 * Uses Edge Function proxy for caching and reliability
 * Integrates with SportsData.io API for NFL fantasy data
 */

import { supabase } from "@/integrations/supabase/client";
import {
  BaseFantasyProvider,
  NFLState,
  PlayersMap,
  StatsMap,
  ProjectionsMap,
  ProviderResponse,
  ProviderConfig,
  NFLPlayer,
  PlayerStats,
  PlayerProjection,
} from "./FantasyProvider";

export interface SportsDataTeam {
  TeamID: number;
  Key?: string;
  City?: string;
  Name?: string;
  Conference?: string;
  Division?: string;
  FullName?: string;
  StadiumID?: number;
  ByeWeek?: number;
  GlobalTeamID?: number;
  HeadCoach?: string;
  PrimaryColor?: string;
  SecondaryColor?: string;
  TertiaryColor?: string;
  QuaternaryColor?: string;
  WikipediaLogoUrl?: string;  // Team logo URL from Wikipedia
  WikipediaWordMarkUrl?: string;
  OffensiveCoordinator?: string;
  DefensiveCoordinator?: string;
  SpecialTeamsCoach?: string;
  OffensiveScheme?: string;
  DefensiveScheme?: string;
}

export interface SportsDataPlayer {
  PlayerID: number;
  Name?: string;
  FirstName?: string;
  LastName?: string;
  Team?: string;
  TeamID?: number;
  Position?: string;
  PositionCategory?: string;
  FantasyPosition?: string;
  Status?: string;
  Active?: boolean;
  Age?: number;
  Experience?: number;
  College?: string;
  Height?: string;
  Weight?: number;
  BirthDate?: string;
  BirthDateString?: string;
  PhotoUrl?: string;
  UsaTodayHeadshotURL?: string;  // Player headshot photo
  UsaTodayHeadshotNoBackgroundURL?: string;  // Player headshot without background
  Number?: number;
  DepthChartPosition?: string;
  DepthChartOrder?: number;
  InjuryStatus?: string;
  InjuryBodyPart?: string;
  InjuryStartDate?: string;
  InjuryNotes?: string;
  InjuryPractice?: string;
  InjuryPracticeDescription?: string;
  GlobalTeamID?: number;
  SportRadarPlayerID?: string;
  RotoworldPlayerID?: number;
  FantasyDraftPlayerID?: number;
  FanDuelPlayerID?: number;
  DraftKingsPlayerID?: number;
  YahooPlayerID?: number;
  StatsPlayerID?: number;
  SportsDirectPlayerID?: number;
  XmlTeamPlayerID?: number;
  UsaTodayPlayerID?: number;
  FantasyAlarmPlayerID?: number;
  SportDataPlayerID?: string;
  FanDuelName?: string;
  DraftKingsName?: string;
  YahooName?: string;
  FantasyDraftName?: string;
  AverageDraftPosition?: number;
  AverageDraftPositionPPR?: number;
  AverageDraftPosition2QB?: number;
  AverageDraftPositionRookie?: number;
  AverageDraftPositionDynasty?: number;
  AverageDraftPositionDynastyPPR?: number;
}

export interface SportsDataStats {
  PlayerID: number;
  Season: number;
  Week: number;
  SeasonType: number;
  Team?: string;
  Opponent?: string;
  HomeOrAway?: string;
  Number?: number;
  Name?: string;
  Position?: string;
  FantasyPoints?: number;
  FantasyPointsPPR?: number;
  FantasyPointsYahoo?: number;
  FantasyPointsDraftKings?: number;
  FantasyPointsFanDuel?: number;
  FantasyPointsFantasyDraft?: number;
  // Passing stats
  PassingAttempts?: number;
  PassingCompletions?: number;
  PassingYards?: number;
  PassingTouchdowns?: number;
  PassingInterceptions?: number;
  PassingRating?: number;
  PassingYardsPerAttempt?: number;
  PassingYardsPerCompletion?: number;
  PassingCompletionPercentage?: number;
  PassingRating158Scale?: number;
  PassingSacks?: number;
  PassingSackYards?: number;
  // Rushing stats
  RushingAttempts?: number;
  RushingYards?: number;
  RushingTouchdowns?: number;
  RushingYardsPerAttempt?: number;
  // Receiving stats
  ReceivingTargets?: number;
  Receptions?: number;
  ReceivingYards?: number;
  ReceivingTouchdowns?: number;
  ReceivingYardsPerReception?: number;
  ReceivingYardsPerTarget?: number;
  // Defense stats
  Fumbles?: number;
  FumblesLost?: number;
  FumblesRecovered?: number;
  // Kicking stats
  FieldGoalsMade?: number;
  FieldGoalsAttempted?: number;
  FieldGoalPercentage?: number;
  ExtraPointsMade?: number;
  ExtraPointsAttempted?: number;
  // Return stats
  KickReturnTouchdowns?: number;
  PuntReturnTouchdowns?: number;
  // IDP stats
  DefensiveTouchdowns?: number;
  SpecialTeamsTouchdowns?: number;
  TwoPointConversionPasses?: number;
  TwoPointConversionRuns?: number;
  TwoPointConversionReceptions?: number;
}

export interface SportsDataProjection extends SportsDataStats {
  // Projections have the same structure as stats
  // but represent projected values instead of actual
}

export interface SportsDataDefenseStats {
  GameKey: string;
  SeasonType: number;
  Season: number;
  Week: number;
  Date: string;
  Team: string;
  Opponent: string;
  PointsAllowed: number;
  TouchdownsScored: number;
  SoloTackles: number;
  AssistedTackles: number;
  Sacks: number;
  SackYards: number;
  PassesDefended: number;
  FumblesForced: number;
  FumblesRecovered: number;
  FumbleReturnYards: number;
  FumbleReturnTouchdowns: number;
  Interceptions: number;
  InterceptionReturnYards: number;
  InterceptionReturnTouchdowns: number;
  BlockedKicks: number;
  Safeties: number;
  PuntReturns: number;
  PuntReturnYards: number;
  PuntReturnTouchdowns: number;
  PuntReturnLong: number;
  KickReturns: number;
  KickReturnYards: number;
  KickReturnTouchdowns: number;
  KickReturnLong: number;
  BlockedKickReturnTouchdowns: number;
  FieldGoalReturnTouchdowns: number;
  FantasyPoints: number;
  FantasyPointsDraftKings: number;
  FantasyPointsFanDuel: number;
  FantasyPointsYahoo: number;
  FantasyPointsFantasyDraft: number;
  DefensiveTouchdowns: number;
  SpecialTeamsTouchdowns: number;
  IsGameOver: boolean;
  Stadium: string;
  Temperature: number;
  Humidity: number;
  WindSpeed: number;
  ThirdDownAttempts: number;
  ThirdDownConversions: number;
  FourthDownAttempts: number;
  FourthDownConversions: number;
  PointsAllowedByDefenseSpecialTeams: number;
  OffensiveYardsAllowed: number;
  TeamID: number;
  OpponentID: number;
  GlobalGameID: number;
  GlobalTeamID: number;
  GlobalOpponentID: number;
  FantasyDefenseID: number;
  ScoreID: number;
}

export interface SportsDataCurrentWeek {
  Season: number;
  SeasonType: number;
  Week: number;
  Name?: string;
  ShortName?: string;
  StartDate?: string;
  EndDate?: string;
}

export class SportsDataProvider extends BaseFantasyProvider {
  readonly name = "sportsdata";
  private functionsUrl: string;
  private apiKey: string;
  private teamsCache: Map<string, SportsDataTeam> = new Map();

  constructor(config: ProviderConfig = {}) {
    super(config);
    // Get the Edge Functions URL from environment or use default
    const supabaseUrl =
      (supabase as any).supabaseUrl ||
      "https://tvzktsamnoiyjbayimvh.supabase.co";
    this.functionsUrl = `${supabaseUrl}/functions/v1`;
    this.apiKey = config.apiKey || "";
  }

  /**
   * Get current NFL state
   */
  async getNFLState(): Promise<ProviderResponse<NFLState>> {
    try {
      const result = await this.fetchFromEdgeFunction("/currentweek");

      if (!result || typeof result !== "number") {
        throw new Error("Invalid response from SportsData API - expected week number");
      }

      // SportsData's CurrentWeek endpoint just returns the week number
      // We need to determine the season and season type based on the current date
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      // Determine season and season type based on month
      let season = currentYear;
      let seasonType: "pre" | "regular" | "post" = "regular";
      
      if (currentMonth <= 3) {
        // January-March: Previous season's playoffs
        season = currentYear - 1;
        seasonType = "post";
      } else if (currentMonth <= 8) {
        // April-August: Preseason
        seasonType = "pre";
      } else if (currentMonth >= 9 && currentMonth <= 12) {
        // September-December: Regular season
        seasonType = "regular";
      }

      // Transform SportsData current week to our NFLState format
      const state: NFLState = {
        week: result || 1,
        season_type: seasonType,
        season: String(season),
        previous_season: String(season - 1),
        display_week: result || 1,
        leg: 1,
        league_create_season: String(season),
        league_season: String(season),
        week_date: currentDate.toISOString(),
        season_start_date: new Date(season, 8, 1).toISOString(), // September 1st
      };

      return {
        data: state,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Failed to fetch NFL state",
      };
    }
  }

  /**
   * Fetch and cache teams data
   */
  private async fetchTeams(): Promise<void> {
    try {
      const result = await this.fetchFromEdgeFunction("/teams");
      
      if (!result || !Array.isArray(result)) {
        console.warn("Teams endpoint returned invalid data, using empty cache");
        return;
      }

      // Cache teams by their Key (abbreviation) for quick lookup
      this.teamsCache.clear();
      for (const team of result as SportsDataTeam[]) {
        if (team.Key) {
          this.teamsCache.set(team.Key, team);
        }
      }
    } catch (error) {
      console.warn("Failed to fetch teams (non-critical):", error);
      // Don't throw, teams data is optional for logos
      // The system will continue working without team logos
    }
  }

  /**
   * Get all players
   */
  async getAllPlayers(): Promise<ProviderResponse<PlayersMap>> {
    try {
      // Fetch teams first to get logo URLs
      await this.fetchTeams();
      
      const result = await this.fetchFromEdgeFunction("/players");

      if (!result || !Array.isArray(result)) {
        console.error("Invalid players response:", result);
        throw new Error("Invalid players response from SportsData API - expected array");
      }

      // Transform SportsData players to our format
      const players = this.transformSportsDataPlayers(result);

      return {
        data: players,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Failed to fetch players",
      };
    }
  }

  /**
   * Get weekly stats
   */
  async getWeeklyStats(
    season: number,
    week: number,
    seasonType: "pre" | "regular" | "post" = "regular"
  ): Promise<ProviderResponse<StatsMap>> {
    try {
      const params = {
        season: season.toString(),
        week: week.toString(),
      };
      const result = await this.fetchFromEdgeFunction("/stats", params);

      if (!result || !Array.isArray(result)) {
        console.error("Invalid stats response:", result);
        throw new Error("Invalid stats response from SportsData API - expected array");
      }

      // Transform SportsData stats to our format
      const stats = this.transformSportsDataStats(result);

      return {
        data: stats,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to fetch stats",
      };
    }
  }

  /**
   * Get weekly projections
   */
  async getWeeklyProjections(
    season: number,
    week: number,
    seasonType: "pre" | "regular" | "post" = "regular"
  ): Promise<ProviderResponse<ProjectionsMap>> {
    try {
      const params = {
        season: season.toString(),
        week: week.toString(),
      };
      const result = await this.fetchFromEdgeFunction("/projections", params);

      if (!result || !Array.isArray(result)) {
        console.error("Invalid projections response:", result);
        throw new Error("Invalid projections response from SportsData API - expected array");
      }

      // Transform SportsData projections to our format
      const projections = this.transformSportsDataProjections(result);

      return {
        data: projections,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch projections",
      };
    }
  }

  /**
   * Get defense stats for all teams or specific team
   */
  async getDefenseStats(
    season: number,
    week: number,
    team?: string
  ): Promise<ProviderResponse<Record<string, SportsDataDefenseStats>>> {
    try {
      const params: Record<string, string> = {
        season: season.toString(),
        week: week.toString(),
      };
      
      if (team) {
        params.team = team;
      }

      const result = await this.fetchFromEdgeFunction("/defense-stats", params);

      if (!result) {
        console.error("Invalid defense stats response:", result);
        throw new Error("Invalid defense stats response from SportsData API");
      }

      // If single team requested, result will be an object, otherwise array
      const defenseData: Record<string, SportsDataDefenseStats> = {};
      
      if (Array.isArray(result)) {
        // Multiple teams
        result.forEach((teamDefense: SportsDataDefenseStats) => {
          defenseData[teamDefense.Team] = teamDefense;
        });
      } else if (result.Team) {
        // Single team
        defenseData[result.Team] = result as SportsDataDefenseStats;
      }

      return {
        data: defenseData,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch defense stats",
      };
    }
  }

  /**
   * Fetch from Edge Function or directly from API
   */
  public async fetchFromEdgeFunction(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<any> {
    const url = new URL(`${this.functionsUrl}/sportsdata-proxy${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // Get the session token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await this.fetchWithRetry(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    // Check if response includes cache metadata
    const cached = response.headers.get("X-Cache-Hit") === "true";

    // Return the raw data directly, not wrapped in an object
    return data;
  }

  /**
   * Map SportsData season type to our format
   */
  private mapSeasonType(seasonType: number): "pre" | "regular" | "post" {
    switch (seasonType) {
      case 1:
        return "pre";
      case 2:
        return "regular";
      case 3:
        return "post";
      default:
        return "regular";
    }
  }

  /**
   * Transform SportsData player data to our format
   */
  private transformSportsDataPlayers(sportsDataPlayers: any[]): PlayersMap {
    const players: PlayersMap = {};

    if (!Array.isArray(sportsDataPlayers)) {
      return players;
    }

    // Note: Players are already filtered for Status === "Active" in the Edge Function
    sportsDataPlayers.forEach((playerData: SportsDataPlayer) => {
      const playerId = String(playerData.PlayerID);
      
      // Skip players without a team (free agents, etc.) - not useful for fantasy
      if (!playerData.Team || playerData.Team === '' || playerData.Team === 'FA') {
        return;
      }
      
      // Use UsaTodayHeadshotURL for player photo
      const photoUrl = playerData.UsaTodayHeadshotURL || playerData.PhotoUrl || null;
      
      // Get team logo from teams cache using WikipediaLogoUrl
      const teamData = playerData.Team ? this.teamsCache.get(playerData.Team) : undefined;
      const teamLogoUrl = teamData?.WikipediaLogoUrl || undefined;
      
      players[playerId] = {
        player_id: playerId,
        first_name: playerData.FirstName,
        last_name: playerData.LastName,
        full_name: playerData.Name || `${playerData.FirstName} ${playerData.LastName}`,
        search_full_name: playerData.Name?.toLowerCase(),
        position: playerData.Position,
        team: playerData.Team,
        status: playerData.Status,
        active: playerData.Status === 'Active',
        age: playerData.Age,
        years_exp: playerData.Experience,
        college: playerData.College,
        height: playerData.Height,
        weight: playerData.Weight ? String(playerData.Weight) : undefined,
        birth_date: playerData.BirthDateString || playerData.BirthDate,
        fantasy_positions: playerData.FantasyPosition ? [playerData.FantasyPosition] : [],
        depth_chart_position: playerData.DepthChartPosition,
        depth_chart_order: playerData.DepthChartOrder,
        injury_status: playerData.InjuryStatus,
        injury_body_part: playerData.InjuryBodyPart,
        injury_start_date: playerData.InjuryStartDate,
        injury_notes: playerData.InjuryNotes,
        practice_participation: playerData.InjuryPractice,
        practice_description: playerData.InjuryPracticeDescription,
        // ADP (Average Draft Position) fields
        adp_standard: playerData.AverageDraftPosition,
        adp_ppr: playerData.AverageDraftPositionPPR,
        adp_2qb: playerData.AverageDraftPosition2QB,
        adp_rookie: playerData.AverageDraftPositionRookie,
        adp_dynasty: playerData.AverageDraftPositionDynasty,
        adp_dynasty_ppr: playerData.AverageDraftPositionDynastyPPR,
        // Cross-reference IDs
        gsis_id: playerData.SportDataPlayerID,
        sportradar_id: playerData.SportRadarPlayerID,
        stats_id: playerData.StatsPlayerID ? String(playerData.StatsPlayerID) : undefined,
        yahoo_id: playerData.YahooPlayerID ? String(playerData.YahooPlayerID) : undefined,
        metadata: {
          sportsdata_id: playerData.PlayerID,
          photo_url: photoUrl,
          jersey_number: playerData.Number,
          draft_kings_id: playerData.DraftKingsPlayerID,
          fanduel_id: playerData.FanDuelPlayerID,
          team_logo: teamLogoUrl,
        },
      };
    });

    return players;
  }

  /**
   * Transform SportsData stats to our format
   */
  private transformSportsDataStats(sportsDataStats: any[]): StatsMap {
    const stats: StatsMap = {};

    if (!Array.isArray(sportsDataStats)) {
      return stats;
    }

    sportsDataStats.forEach((playerStats: any) => {
      const playerId = String(playerStats.PlayerID);

      // Extract points for different scoring systems
      // FantasyGameStatsByWeek provides multiple scoring formats
      const points: any = {};
      if (playerStats.FantasyPointsPPR !== undefined)
        points.ppr = playerStats.FantasyPointsPPR;
      if (playerStats.FantasyPoints !== undefined) {
        points.standard = playerStats.FantasyPoints;
        // Calculate half-PPR (average of standard and PPR)
        if (playerStats.FantasyPointsPPR !== undefined) {
          points.half_ppr = (playerStats.FantasyPoints + playerStats.FantasyPointsPPR) / 2;
        } else {
          points.half_ppr = playerStats.FantasyPoints;
        }
      }
      
      // Add DFS platform points if available
      if (playerStats.FantasyPointsDraftKings !== undefined)
        points.draftkings = playerStats.FantasyPointsDraftKings;
      if (playerStats.FantasyPointsFanDuel !== undefined)
        points.fanduel = playerStats.FantasyPointsFanDuel;
      if (playerStats.FantasyPointsYahoo !== undefined)
        points.yahoo = playerStats.FantasyPointsYahoo;

      // Build stats object with all available stats
      const statsData: any = {};
      
      // Passing stats
      if (playerStats.PassingAttempts !== undefined)
        statsData.pass_att = playerStats.PassingAttempts;
      if (playerStats.PassingCompletions !== undefined)
        statsData.pass_cmp = playerStats.PassingCompletions;
      if (playerStats.PassingYards !== undefined)
        statsData.pass_yd = playerStats.PassingYards;
      if (playerStats.PassingTouchdowns !== undefined)
        statsData.pass_td = playerStats.PassingTouchdowns;
      if (playerStats.PassingInterceptions !== undefined)
        statsData.pass_int = playerStats.PassingInterceptions;
      if (playerStats.PassingSacks !== undefined)
        statsData.pass_sack = playerStats.PassingSacks;
      
      // Rushing stats
      if (playerStats.RushingAttempts !== undefined)
        statsData.rush_att = playerStats.RushingAttempts;
      if (playerStats.RushingYards !== undefined)
        statsData.rush_yd = playerStats.RushingYards;
      if (playerStats.RushingTouchdowns !== undefined)
        statsData.rush_td = playerStats.RushingTouchdowns;
      
      // Receiving stats
      if (playerStats.ReceivingTargets !== undefined)
        statsData.rec_tgt = playerStats.ReceivingTargets;
      if (playerStats.Receptions !== undefined)
        statsData.rec = playerStats.Receptions;
      if (playerStats.ReceivingYards !== undefined)
        statsData.rec_yd = playerStats.ReceivingYards;
      if (playerStats.ReceivingTouchdowns !== undefined)
        statsData.rec_td = playerStats.ReceivingTouchdowns;
      
      // Other stats
      if (playerStats.Fumbles !== undefined)
        statsData.fum = playerStats.Fumbles;
      if (playerStats.FumblesLost !== undefined)
        statsData.fum_lost = playerStats.FumblesLost;

      // Add metadata about the game
      if (playerStats.Name) statsData.player_name = playerStats.Name;
      if (playerStats.Team) statsData.team = playerStats.Team;
      if (playerStats.Opponent) statsData.opponent = playerStats.Opponent;
      if (playerStats.HomeOrAway) statsData.home_away = playerStats.HomeOrAway;
      if (playerStats.IsGameOver !== undefined) statsData.game_finished = playerStats.IsGameOver;

      stats[playerId] = {
        player_id: playerId,
        stats: statsData,
        points: Object.keys(points).length > 0 ? points : undefined,
      };
    });

    return stats;
  }

  /**
   * Transform SportsData projections to our format
   */
  private transformSportsDataProjections(
    sportsDataProjections: any[]
  ): ProjectionsMap {
    const projections: ProjectionsMap = {};

    if (!Array.isArray(sportsDataProjections)) {
      return projections;
    }

    sportsDataProjections.forEach((playerProjection: SportsDataProjection) => {
      const playerId = String(playerProjection.PlayerID);

      // Extract points for different scoring systems
      const points: any = {};
      if (playerProjection.FantasyPointsPPR !== undefined)
        points.ppr = playerProjection.FantasyPointsPPR;
      if (playerProjection.FantasyPoints !== undefined)
        points.half_ppr = playerProjection.FantasyPoints;
      if (playerProjection.FantasyPoints !== undefined)
        points.standard = playerProjection.FantasyPoints;

      // Build projection stats object with all available stats
      const projectionData: any = {};
      
      // Passing projections
      if (playerProjection.PassingAttempts !== undefined)
        projectionData.pass_att = playerProjection.PassingAttempts;
      if (playerProjection.PassingCompletions !== undefined)
        projectionData.pass_cmp = playerProjection.PassingCompletions;
      if (playerProjection.PassingYards !== undefined)
        projectionData.pass_yd = playerProjection.PassingYards;
      if (playerProjection.PassingTouchdowns !== undefined)
        projectionData.pass_td = playerProjection.PassingTouchdowns;
      if (playerProjection.PassingInterceptions !== undefined)
        projectionData.pass_int = playerProjection.PassingInterceptions;
      
      // Rushing projections
      if (playerProjection.RushingAttempts !== undefined)
        projectionData.rush_att = playerProjection.RushingAttempts;
      if (playerProjection.RushingYards !== undefined)
        projectionData.rush_yd = playerProjection.RushingYards;
      if (playerProjection.RushingTouchdowns !== undefined)
        projectionData.rush_td = playerProjection.RushingTouchdowns;
      
      // Receiving projections
      if (playerProjection.ReceivingTargets !== undefined)
        projectionData.rec_tgt = playerProjection.ReceivingTargets;
      if (playerProjection.Receptions !== undefined)
        projectionData.rec = playerProjection.Receptions;
      if (playerProjection.ReceivingYards !== undefined)
        projectionData.rec_yd = playerProjection.ReceivingYards;
      if (playerProjection.ReceivingTouchdowns !== undefined)
        projectionData.rec_td = playerProjection.ReceivingTouchdowns;
      
      // Other projections
      if (playerProjection.Fumbles !== undefined)
        projectionData.fum = playerProjection.Fumbles;
      if (playerProjection.FumblesLost !== undefined)
        projectionData.fum_lost = playerProjection.FumblesLost;

      // Add player metadata for mapping
      if (playerProjection.Name) projectionData.player_name = playerProjection.Name;
      if (playerProjection.Team) projectionData.team = playerProjection.Team;

      projections[playerId] = {
        player_id: playerId,
        stats: projectionData,
        points: Object.keys(points).length > 0 ? points : undefined,
        player_name: playerProjection.Name,
      };
    });

    return projections;
  }

  /**
   * Health check for SportsData provider
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    try {
      const result = await this.fetchFromEdgeFunction("/health");

      return {
        healthy: result?.status === "healthy",
        details: result,
      };
    } catch (error) {
      return {
        healthy: false,
        details: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }
}

// Export singleton instance for convenience
export const sportsDataProvider = new SportsDataProvider({
  apiKey: "a7fdf8e0c4914c15894d1cb3bb3c884a",
});

// Export factory function for testing
export function createSportsDataProvider(
  config?: ProviderConfig
): SportsDataProvider {
  return new SportsDataProvider(config);
}