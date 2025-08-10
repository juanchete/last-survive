import { supabase } from "@/integrations/supabase/client";
import { seasonSimulator } from "./seasonSimulator";

export interface TestDataConfig {
  createUsers?: boolean;
  createLeague?: boolean;
  createFantasyTeams?: boolean;
  populateRosters?: boolean;
  simulateWeeks?: number;
  leagueName?: string;
  numberOfTeams?: number;
}

export class TestDataSeeder {
  private testUserIds: string[] = [];
  private testLeagueId: string | null = null;
  private testTeamIds: string[] = [];
  
  async seedTestData(config: TestDataConfig = {}) {
    const {
      createUsers = true,
      createLeague = true,
      createFantasyTeams = true,
      populateRosters = true,
      simulateWeeks = 0,
      leagueName = "Test League 2023",
      numberOfTeams = 8
    } = config;
    
    console.log("🌱 Starting test data seeding...");
    
    try {
      // Step 1: Create test users
      if (createUsers) {
        await this.createTestUsers(numberOfTeams);
      }
      
      // Step 2: Create test league
      if (createLeague) {
        await this.createTestLeague(leagueName);
      }
      
      // Step 3: Create fantasy teams
      if (createFantasyTeams && this.testLeagueId) {
        await this.createFantasyTeams(numberOfTeams);
      }
      
      // Step 4: Run draft and populate rosters
      if (populateRosters && this.testLeagueId) {
        await this.runMockDraft();
      }
      
      // Step 5: Simulate weeks if requested
      if (simulateWeeks > 0 && this.testLeagueId) {
        await this.simulateSeasonWeeks(simulateWeeks);
      }
      
      console.log("✅ Test data seeding completed successfully!");
      
      return {
        userIds: this.testUserIds,
        leagueId: this.testLeagueId,
        teamIds: this.testTeamIds
      };
      
    } catch (error) {
      console.error("❌ Error seeding test data:", error);
      throw error;
    }
  }
  
  private async createTestUsers(count: number) {
    console.log(`Creating ${count} test users...`);
    
    const testUsers = [];
    for (let i = 1; i <= count; i++) {
      testUsers.push({
        email: `testuser${i}@lastsurvive.test`,
        full_name: `Test User ${i}`,
        favorite_team: this.getRandomNFLTeam()
      });
    }
    
    // Note: In a real implementation, you'd need to handle auth properly
    // For testing, we'll create users directly in the users table
    const { data, error } = await supabase
      .from("users")
      .insert(testUsers)
      .select("id");
    
    if (error) throw error;
    
    this.testUserIds = data.map(u => u.id);
    console.log(`✅ Created ${this.testUserIds.length} test users`);
  }
  
  private async createTestLeague(leagueName: string) {
    console.log(`Creating test league: ${leagueName}...`);
    
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser?.user) throw new Error("No authenticated user");
    
    const { data, error } = await supabase
      .from("leagues")
      .insert({
        name: leagueName,
        owner_id: authUser.user.id,
        max_members: 8,
        entry_fee: 0,
        prize_distribution: { "1st": 100 },
        rules: {
          roster_size: 9,
          positions: {
            QB: 1,
            RB: 2,
            WR: 2,
            TE: 1,
            FLEX: 1,
            K: 1,
            DEF: 1
          },
          scoring: "standard",
          waiver_type: "priority",
          trade_deadline_week: 10
        },
        status: "active",
        draft_date: new Date().toISOString(),
        draft_type: "snake",
        draft_order_type: "random",
        owner_plays: true
      })
      .select("id")
      .single();
    
    if (error) throw error;
    
    this.testLeagueId = data.id;
    console.log(`✅ Created test league with ID: ${this.testLeagueId}`);
  }
  
  private async createFantasyTeams(count: number) {
    console.log(`Creating ${count} fantasy teams...`);
    
    const teams = [];
    const teamNames = [
      "Touchdown Titans",
      "Gridiron Gladiators",
      "End Zone Elite",
      "Field Goal Fanatics",
      "Red Zone Raiders",
      "Pigskin Pros",
      "Hail Mary Heroes",
      "Blitz Brigade"
    ];
    
    // Get the current user
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser?.user) throw new Error("No authenticated user");
    
    // First team is the authenticated user's team
    teams.push({
      name: teamNames[0],
      user_id: authUser.user.id,
      league_id: this.testLeagueId
    });
    
    // Create teams for test users
    for (let i = 1; i < count && i < this.testUserIds.length + 1; i++) {
      teams.push({
        name: teamNames[i] || `Team ${i}`,
        user_id: this.testUserIds[i - 1],
        league_id: this.testLeagueId
      });
    }
    
    const { data, error } = await supabase
      .from("fantasy_teams")
      .insert(teams)
      .select("id");
    
    if (error) throw error;
    
    this.testTeamIds = data.map(t => t.id);
    console.log(`✅ Created ${this.testTeamIds.length} fantasy teams`);
  }
  
  private async runMockDraft() {
    console.log("Running mock draft...");
    
    // Get available players
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, name, position, nfl_team_id")
      .order("name");
    
    if (playersError) throw playersError;
    
    // Group players by position
    const playersByPosition = players.reduce((acc, player) => {
      if (!acc[player.position]) acc[player.position] = [];
      acc[player.position].push(player);
      return acc;
    }, {} as Record<string, typeof players>);
    
    // Snake draft order
    const draftOrder = [];
    for (let round = 1; round <= 9; round++) {
      const roundOrder = round % 2 === 1 
        ? [...this.testTeamIds]
        : [...this.testTeamIds].reverse();
      draftOrder.push(...roundOrder);
    }
    
    // Roster requirements
    const rosterNeeds = {
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      K: 1,
      DEF: 1,
      FLEX: 1 // Can be RB, WR, or TE
    };
    
    // Track drafted players and team rosters
    const draftedPlayerIds = new Set<number>();
    const teamRosters = new Map(this.testTeamIds.map(id => [id, {
      QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0
    }]));
    
    // Execute draft
    for (const teamId of draftOrder) {
      const roster = teamRosters.get(teamId)!;
      let position = "";
      
      // Determine which position to draft
      if (roster.QB < rosterNeeds.QB) position = "QB";
      else if (roster.RB < rosterNeeds.RB) position = "RB";
      else if (roster.WR < rosterNeeds.WR) position = "WR";
      else if (roster.TE < rosterNeeds.TE) position = "TE";
      else if (roster.K < rosterNeeds.K) position = "K";
      else if (roster.DEF < rosterNeeds.DEF) position = "DEF";
      else if (roster.RB < 3) position = "RB"; // FLEX preference
      else if (roster.WR < 3) position = "WR";
      else position = "TE";
      
      // Find best available player at position
      const availablePlayers = playersByPosition[position]?.filter(
        p => !draftedPlayerIds.has(p.id)
      ) || [];
      
      if (availablePlayers.length > 0) {
        const player = availablePlayers[0]; // In real draft, this would be based on rankings
        draftedPlayerIds.add(player.id);
        roster[position as keyof typeof roster]++;
        
        // Add to team roster
        await supabase.from("team_rosters").insert({
          fantasy_team_id: teamId,
          player_id: player.id,
          week: 1,
          slot: this.getSlotForPosition(position, roster),
          is_active: true,
          acquired_week: 0,
          acquired_type: "draft"
        });
      }
    }
    
    console.log("✅ Mock draft completed");
  }
  
  private async simulateSeasonWeeks(weeks: number) {
    console.log(`Simulating ${weeks} weeks of the season...`);
    
    // Enable simulation mode
    seasonSimulator.setSimulationMode(true);
    
    for (let week = 1; week <= weeks; week++) {
      console.log(`Simulating week ${week}...`);
      
      // Generate stats for all players
      const weeklyStats = seasonSimulator.generateWeeklyStats(week);
      
      // Insert player stats (you'd need to map player names to IDs)
      // For now, we'll use a simplified approach
      const statsToInsert = weeklyStats.slice(0, 100).map(stat => ({
        player_id: stat.playerId,
        week: week,
        season: 2023,
        fantasy_points: stat.fantasyPoints,
        passing_yards: stat.passingYards || 0,
        passing_touchdowns: stat.passingTD || 0,
        rushing_yards: stat.rushingYards || 0,
        rushing_touchdowns: stat.rushingTD || 0,
        receiving_yards: stat.receivingYards || 0,
        receiving_touchdowns: stat.receivingTD || 0,
        interceptions_thrown: stat.interceptions || 0,
        fumbles_lost: stat.fumbles || 0
      }));
      
      const { error } = await supabase
        .from("player_stats")
        .insert(statsToInsert);
      
      if (error) console.error(`Error inserting stats for week ${week}:`, error);
      
      // Advance to next week
      seasonSimulator.advanceWeek();
    }
    
    console.log(`✅ Simulated ${weeks} weeks of season data`);
  }
  
  private getSlotForPosition(position: string, roster: Record<string, number>): string {
    const slotCounts = {
      QB: { current: 0, slots: ["QB"] },
      RB: { current: 0, slots: ["RB1", "RB2", "FLEX", "BENCH"] },
      WR: { current: 0, slots: ["WR1", "WR2", "FLEX", "BENCH"] },
      TE: { current: 0, slots: ["TE", "FLEX", "BENCH"] },
      K: { current: 0, slots: ["K"] },
      DEF: { current: 0, slots: ["DEF"] }
    };
    
    const posConfig = slotCounts[position as keyof typeof slotCounts];
    return posConfig.slots[roster[position as keyof typeof roster] - 1] || "BENCH";
  }
  
  private getRandomNFLTeam(): string {
    const teams = ["BUF", "MIA", "NE", "NYJ", "BAL", "CIN", "CLE", "PIT", 
                  "HOU", "IND", "JAX", "TEN", "DEN", "KC", "LV", "LAC",
                  "DAL", "NYG", "PHI", "WAS", "CHI", "DET", "GB", "MIN",
                  "ATL", "CAR", "NO", "TB", "ARI", "LAR", "SF", "SEA"];
    return teams[Math.floor(Math.random() * teams.length)];
  }
  
  // Clean up test data
  async cleanupTestData() {
    console.log("🧹 Cleaning up test data...");
    
    try {
      // Delete in reverse order of creation
      if (this.testTeamIds.length > 0) {
        await supabase
          .from("fantasy_teams")
          .delete()
          .in("id", this.testTeamIds);
      }
      
      if (this.testLeagueId) {
        await supabase
          .from("leagues")
          .delete()
          .eq("id", this.testLeagueId);
      }
      
      if (this.testUserIds.length > 0) {
        await supabase
          .from("users")
          .delete()
          .in("id", this.testUserIds);
      }
      
      console.log("✅ Test data cleaned up successfully");
    } catch (error) {
      console.error("❌ Error cleaning up test data:", error);
    }
  }
}

// Export singleton instance
export const testDataSeeder = new TestDataSeeder();