// Season Simulator for Testing Outside NFL Season
// Uses real 2023 NFL season data for realistic testing

export interface SimulatedWeekData {
  week: number;
  startDate: string;
  endDate: string;
  games: SimulatedGame[];
}

export interface SimulatedGame {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  gameDate: string;
}

export interface SimulatedPlayerStats {
  playerId: number;
  playerName: string;
  week: number;
  passingYards?: number;
  passingTD?: number;
  rushingYards?: number;
  rushingTD?: number;
  receivingYards?: number;
  receivingTD?: number;
  interceptions?: number;
  fumbles?: number;
  fieldGoals?: number;
  extraPoints?: number;
  fantasyPoints: number;
}

// Sample 2023 season data for top fantasy players
export const SIMULATED_2023_SEASON_DATA = {
  weeks: [
    {
      week: 1,
      startDate: "2023-09-07",
      endDate: "2023-09-11",
      topPerformers: [
        { name: "Tyreek Hill", position: "WR", team: "MIA", fantasyPoints: 31.4 },
        { name: "CeeDee Lamb", position: "WR", team: "DAL", fantasyPoints: 28.3 },
        { name: "Puka Nacua", position: "WR", team: "LAR", fantasyPoints: 25.9 },
        { name: "Raheem Mostert", position: "RB", team: "MIA", fantasyPoints: 24.5 },
        { name: "James Cook", position: "RB", team: "BUF", fantasyPoints: 23.2 }
      ]
    },
    {
      week: 2,
      startDate: "2023-09-14",
      endDate: "2023-09-18",
      topPerformers: [
        { name: "Keenan Allen", position: "WR", team: "LAC", fantasyPoints: 32.5 },
        { name: "Stefon Diggs", position: "WR", team: "BUF", fantasyPoints: 30.2 },
        { name: "Tony Pollard", position: "RB", team: "DAL", fantasyPoints: 28.1 },
        { name: "Kyren Williams", position: "RB", team: "LAR", fantasyPoints: 26.8 },
        { name: "Davante Adams", position: "WR", team: "LV", fantasyPoints: 25.7 }
      ]
    },
    // Add more weeks as needed
  ],
  
  // Top fantasy players for 2023 season
  topPlayers: {
    QB: [
      { name: "Dak Prescott", team: "DAL", seasonPoints: 308.7 },
      { name: "Josh Allen", team: "BUF", seasonPoints: 306.2 },
      { name: "Lamar Jackson", team: "BAL", seasonPoints: 299.4 },
      { name: "Jalen Hurts", team: "PHI", seasonPoints: 295.8 },
      { name: "Tua Tagovailoa", team: "MIA", seasonPoints: 271.3 }
    ],
    RB: [
      { name: "Christian McCaffrey", team: "SF", seasonPoints: 320.2 },
      { name: "Raheem Mostert", team: "MIA", seasonPoints: 236.5 },
      { name: "Kyren Williams", team: "LAR", seasonPoints: 228.3 },
      { name: "Travis Etienne", team: "JAX", seasonPoints: 217.4 },
      { name: "Rachaad White", team: "TB", seasonPoints: 213.6 }
    ],
    WR: [
      { name: "CeeDee Lamb", team: "DAL", seasonPoints: 295.5 },
      { name: "Tyreek Hill", team: "MIA", seasonPoints: 291.9 },
      { name: "A.J. Brown", team: "PHI", seasonPoints: 257.6 },
      { name: "Stefon Diggs", team: "BUF", seasonPoints: 244.3 },
      { name: "Amon-Ra St. Brown", team: "DET", seasonPoints: 241.8 }
    ],
    TE: [
      { name: "Travis Kelce", team: "KC", seasonPoints: 167.4 },
      { name: "T.J. Hockenson", team: "MIN", seasonPoints: 147.5 },
      { name: "Mark Andrews", team: "BAL", seasonPoints: 138.4 },
      { name: "George Kittle", team: "SF", seasonPoints: 134.7 },
      { name: "Evan Engram", team: "JAX", seasonPoints: 128.2 }
    ]
  }
};

export class SeasonSimulator {
  private currentWeek: number = 1;
  private isSimulationMode: boolean = false;
  
  constructor() {
    // Check if we're in simulation mode based on date or env variable
    const currentDate = new Date();
    const nflSeasonStart = new Date(currentDate.getFullYear(), 8, 1); // September 1st
    const nflSeasonEnd = new Date(currentDate.getFullYear() + 1, 1, 15); // February 15th next year
    
    this.isSimulationMode = currentDate < nflSeasonStart || currentDate > nflSeasonEnd;
  }
  
  // Enable/disable simulation mode
  setSimulationMode(enabled: boolean) {
    this.isSimulationMode = enabled;
  }
  
  // Get current week (real or simulated)
  getCurrentWeek(): number {
    if (!this.isSimulationMode) {
      // Calculate real NFL week based on current date
      const seasonStart = new Date(2024, 8, 5); // 2024 season starts Sep 5
      const now = new Date();
      const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return Math.max(1, Math.min(18, weeksSinceStart + 1));
    }
    return this.currentWeek;
  }
  
  // Advance to next week in simulation
  advanceWeek(): number {
    if (this.isSimulationMode && this.currentWeek < 18) {
      this.currentWeek++;
    }
    return this.currentWeek;
  }
  
  // Set specific week for testing
  setWeek(week: number) {
    if (this.isSimulationMode && week >= 1 && week <= 18) {
      this.currentWeek = week;
    }
    return this.currentWeek;
  }
  
  // Generate realistic player stats for a given week
  generateWeeklyStats(week: number): SimulatedPlayerStats[] {
    const stats: SimulatedPlayerStats[] = [];
    const weekData = SIMULATED_2023_SEASON_DATA.weeks.find(w => w.week === week);
    
    if (!weekData) {
      // Generate random but realistic stats
      return this.generateRandomWeeklyStats(week);
    }
    
    // Use actual 2023 data
    weekData.topPerformers.forEach((performer, index) => {
      stats.push({
        playerId: index + 1, // This would map to actual player IDs
        playerName: performer.name,
        week: week,
        fantasyPoints: performer.fantasyPoints
      });
    });
    
    return stats;
  }
  
  // Generate random but realistic stats based on position
  private generateRandomWeeklyStats(week: number): SimulatedPlayerStats[] {
    const stats: SimulatedPlayerStats[] = [];
    
    // QB stats
    for (let i = 0; i < 32; i++) {
      const passingYards = Math.floor(Math.random() * 200) + 150;
      const passingTD = Math.floor(Math.random() * 3);
      const interceptions = Math.random() > 0.7 ? 1 : 0;
      const rushingYards = Math.floor(Math.random() * 30);
      const rushingTD = Math.random() > 0.9 ? 1 : 0;
      
      const fantasyPoints = 
        (passingYards * 0.04) + 
        (passingTD * 4) + 
        (interceptions * -2) + 
        (rushingYards * 0.1) + 
        (rushingTD * 6);
      
      stats.push({
        playerId: i + 1,
        playerName: `QB ${i + 1}`,
        week,
        passingYards,
        passingTD,
        interceptions,
        rushingYards,
        rushingTD,
        fantasyPoints: parseFloat(fantasyPoints.toFixed(2))
      });
    }
    
    // RB stats
    for (let i = 32; i < 96; i++) {
      const rushingYards = Math.floor(Math.random() * 80) + 20;
      const rushingTD = Math.random() > 0.7 ? 1 : 0;
      const receivingYards = Math.floor(Math.random() * 40);
      const receivingTD = Math.random() > 0.9 ? 1 : 0;
      const fumbles = Math.random() > 0.95 ? 1 : 0;
      
      const fantasyPoints = 
        (rushingYards * 0.1) + 
        (rushingTD * 6) + 
        (receivingYards * 0.1) + 
        (receivingTD * 6) + 
        (fumbles * -2);
      
      stats.push({
        playerId: i + 1,
        playerName: `RB ${i - 31}`,
        week,
        rushingYards,
        rushingTD,
        receivingYards,
        receivingTD,
        fumbles,
        fantasyPoints: parseFloat(fantasyPoints.toFixed(2))
      });
    }
    
    // WR stats
    for (let i = 96; i < 192; i++) {
      const receivingYards = Math.floor(Math.random() * 100) + 10;
      const receivingTD = Math.random() > 0.8 ? 1 : 0;
      const fumbles = Math.random() > 0.98 ? 1 : 0;
      
      const fantasyPoints = 
        (receivingYards * 0.1) + 
        (receivingTD * 6) + 
        (fumbles * -2);
      
      stats.push({
        playerId: i + 1,
        playerName: `WR ${i - 95}`,
        week,
        receivingYards,
        receivingTD,
        fumbles,
        fantasyPoints: parseFloat(fantasyPoints.toFixed(2))
      });
    }
    
    return stats;
  }
  
  // Simulate an entire season quickly for testing
  async simulateFullSeason(leagueId: string, progressCallback?: (week: number) => void) {
    const results = [];
    
    for (let week = 1; week <= 18; week++) {
      this.setWeek(week);
      const weekStats = this.generateWeeklyStats(week);
      results.push({
        week,
        stats: weekStats
      });
      
      if (progressCallback) {
        progressCallback(week);
      }
      
      // Small delay to simulate processing
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
}

// Export singleton instance
export const seasonSimulator = new SeasonSimulator();