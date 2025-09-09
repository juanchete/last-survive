import { Layout } from "@/components/Layout";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useLocation } from "react-router-dom";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { Trophy, TrendingUp, Users, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Standings() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "";
  const { user } = useAuth();
  
  // Determine if we're in game week (Thu night - Mon) or non-game week (Tue - Thu day)
  const isGameWeek = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hour = now.getHours();
    
    // Game week: Thursday night (4 @ 20:00) through Monday (1)
    // Non-game week: Tuesday (2), Wednesday (3), Thursday day (4 before 20:00)
    
    if (day === 0 || day === 1 || day === 5 || day === 6) {
      // Sunday, Monday, Friday, Saturday - always game week
      return true;
    } else if (day === 2 || day === 3) {
      // Tuesday, Wednesday - always non-game week
      return false;
    } else if (day === 4) {
      // Thursday - game week starts at 8 PM (20:00)
      return hour >= 20;
    }
    return false;
  };
  
  const sortingMode = isGameWeek() ? 'actual' : 'projected';

  // Hooks for real data
  const { data: teams = [], isLoading: loadingTeams } = useFantasyTeams(leagueId);
  const { data: userTeam } = useUserFantasyTeam(leagueId);

  // Get current week
  const { data: currentWeekData } = useQuery({
    queryKey: ["currentWeek", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weeks")
        .select("number")
        .eq("league_id", leagueId)
        .eq("status", "active")
        .single();
      
      if (error) return { number: 1 };
      return data;
    },
    enabled: !!leagueId,
  });
  
  const currentWeek = currentWeekData?.number || 1;
  
  // Get projected points for each team
  const { data: projections } = useQuery({
    queryKey: ["teamProjections", leagueId, currentWeek],
    queryFn: async () => {
      // Get all rosters for this week
      const { data: rosters, error: rostersError } = await supabase
        .from("team_rosters")
        .select(`
          fantasy_team_id,
          player_id,
          slot
        `)
        .eq("week", currentWeek);
      
      if (rostersError) return [];
      
      // Get player projections for this week
      const playerIds = rosters?.map(r => r.player_id) || [];
      const { data: stats, error: statsError } = await supabase
        .from("player_stats")
        .select("player_id, projected_points")
        .in("player_id", playerIds)
        .eq("week", currentWeek)
        .eq("season", new Date().getFullYear());
      
      if (statsError) return [];
      
      // Calculate projected points per team
      const statsMap = new Map(stats?.map(s => [s.player_id, s.projected_points || 0]) || []);
      const teamProjections = new Map();
      
      rosters?.forEach(roster => {
        const currentProjection = teamProjections.get(roster.fantasy_team_id) || 0;
        const playerProjection = statsMap.get(roster.player_id) || 0;
        teamProjections.set(roster.fantasy_team_id, currentProjection + playerProjection);
      });
      
      return Array.from(teamProjections.entries()).map(([teamId, projectedPoints]) => ({
        teamId,
        projectedPoints
      }));
    },
    enabled: !!leagueId && !!currentWeek,
  });
  
  // Sort teams based on current mode (projected vs actual points)
  const sortedTeams = [...teams].sort((a, b) => {
    if (sortingMode === 'projected') {
      // Sort by projected points for non-game week
      const aProjection = projections?.find(p => p.teamId === a.id)?.projectedPoints || 0;
      const bProjection = projections?.find(p => p.teamId === b.id)?.projectedPoints || 0;
      return bProjection - aProjection; // Highest first
    } else {
      // Sort by actual points for game week
      return b.points - a.points; // Highest first
    }
  });
  
  // Update rankings based on sorted order
  sortedTeams.forEach((team, index) => {
    team.rank = index + 1;
  });

  return (
    <Layout>
      <div className="min-h-screen bg-nfl-dark-gray">
        {/* League Header */}
        <LeagueHeader leagueId={leagueId} />

        {/* League Navigation Tabs */}
        <LeagueTabs leagueId={leagueId} activeTab="standings" />

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Trophy}
              iconColor="text-yellow-400"
              label="League Leader"
              value={sortedTeams[0]?.name || "TBD"}
              subValue={sortedTeams[0] ? `${sortedTeams[0].points} points` : ""}
            />
            <StatCard
              icon={Users}
              iconColor="text-nfl-blue"
              label="Active Teams"
              value={teams.filter(t => !t.eliminated).length}
              subValue={`of ${teams.length} total`}
            />
            <StatCard
              icon={TrendingUp}
              iconColor="text-nfl-green"
              label="Avg Points/Week"
              value={(teams.reduce((sum, t) => sum + t.points, 0) / teams.length / currentWeek).toFixed(1)}
              subValue="League average"
            />
            <StatCard
              icon={Shield}
              iconColor="text-purple-400"
              label="Survival Rate"
              value={`${Math.round((teams.filter(t => !t.eliminated).length / teams.length) * 100)}%`}
              subValue="This week"
            />
          </div>

          <SectionHeader
            title="Full League Standings"
            subtitle={`Week ${currentWeek} Rankings - Sorting by ${sortingMode === 'projected' ? 'Projected' : 'Actual'} Points`}
          />
          
          {/* Standings Table */}
          <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-nfl-light-gray/20 hover:bg-transparent">
                  <TableHead className="text-gray-400 font-medium w-16">Pos</TableHead>
                  <TableHead className="text-gray-400 font-medium">Team</TableHead>
                  <TableHead className="text-gray-400 font-medium">Owner</TableHead>
                  <TableHead className="text-gray-400 font-medium text-center">1st Place Weeks</TableHead>
                  <TableHead className="text-gray-400 font-medium text-right">Points</TableHead>
                  <TableHead className="text-gray-400 font-medium text-right">Projected</TableHead>
                  <TableHead className="text-gray-400 font-medium text-right">Points to Safety</TableHead>
                  <TableHead className="text-gray-400 font-medium text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTeams ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-700 rounded w-1/4 mx-auto mb-2"></div>
                        <div className="h-3 bg-gray-700 rounded w-1/6 mx-auto"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedTeams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                      No teams found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTeams.map((team, index) => {
                    const isUserTeam = team.owner_id === user?.id;
                    const isTopThree = index < 3;
                    
                    // Find the team in last place based on current sorting mode
                    const activeTeams = sortedTeams.filter(t => !t.eliminated);
                    const lastPlaceTeam = activeTeams.length > 0 ? activeTeams[activeTeams.length - 1] : null;
                    
                    const teamProjection = projections?.find(p => p.teamId === team.id)?.projectedPoints || 0;
                    
                    // Points needed to be safe - based on current sorting mode
                    let pointsToSafety = 0;
                    let isInDanger = false;
                    
                    if (!team.eliminated && lastPlaceTeam) {
                      if (sortingMode === 'projected') {
                        const lastPlaceProjection = projections?.find(p => p.teamId === lastPlaceTeam.id)?.projectedPoints || 0;
                        pointsToSafety = Math.max(0, (lastPlaceProjection + 0.1) - teamProjection);
                        isInDanger = team.id === lastPlaceTeam.id;
                      } else {
                        // For actual points mode, the team in danger is the one currently in last place
                        pointsToSafety = Math.max(0, (lastPlaceTeam.points + 0.1) - team.points);
                        isInDanger = team.id === lastPlaceTeam.id;
                      }
                    }
                    
                    return (
                      <TableRow 
                        key={team.id} 
                        className={`border-nfl-light-gray/20 hover:bg-nfl-light-gray/10 transition-colors ${
                          isUserTeam ? 'bg-nfl-blue/5' : ''
                        }`}
                      >
                        <TableCell className="font-medium">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                            index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                            'bg-gray-800 text-gray-400'
                          }`}>
                            {team.rank}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className={isTopThree ? 'text-white font-bold' : 'text-white'}>
                              {team.name}
                            </span>
                            {isUserTeam && (
                              <Badge 
                                variant="outline" 
                                className="text-xs border-nfl-blue text-nfl-blue bg-nfl-blue/10"
                              >
                                YOU
                              </Badge>
                            )}
                            {isTopThree && (
                              <Trophy className={`w-4 h-4 ${
                                index === 0 ? 'text-yellow-400' :
                                index === 1 ? 'text-gray-400' :
                                'text-amber-600'
                              }`} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {team.owner}
                        </TableCell>
                        <TableCell className="text-center text-white">
                          {team.first_place_weeks || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium text-nfl-accent">
                          {team.points.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-gray-400">
                          {teamProjection.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {team.eliminated ? (
                            <span className="text-gray-500">-</span>
                          ) : pointsToSafety > 0 ? (
                            <span className="text-yellow-400">+{pointsToSafety.toFixed(1)}</span>
                          ) : (
                            <span className="text-nfl-green">Safe</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={team.eliminated ? "destructive" : isInDanger ? "warning" : "default"}
                            className={`
                              ${team.eliminated 
                                ? 'bg-nfl-red/20 text-nfl-red border-nfl-red/30' 
                                : isInDanger
                                ? 'bg-orange-500/20 text-orange-500 border-orange-500/30'
                                : 'bg-nfl-green/20 text-nfl-green border-nfl-green/30'
                              }
                            `}
                          >
                            {team.eliminated ? 'Eliminated' : isInDanger ? 'IN DANGER' : 'Safe'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Additional Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-nfl-green" />
                  Biggest Movers
                </h3>
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm">Coming soon: Track weekly ranking changes</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-nfl-red" />
                  Elimination Zone
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const activeTeams = sortedTeams.filter(t => !t.eliminated);
                    // Get the last 3 teams from the already sorted list
                    const bottomThree = activeTeams.slice(-3).reverse();
                    
                    return bottomThree.map((team, idx) => {
                      const teamProjection = projections?.find(p => p.teamId === team.id)?.projectedPoints || 0;
                      return (
                        <div key={team.id} className="flex items-center justify-between">
                          <span className="text-gray-300">{team.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              {sortingMode === 'projected' ? `Proj: ${teamProjection.toFixed(1)}` : `Pts: ${team.points.toFixed(1)}`}
                            </span>
                            <Badge className={idx === 0 ? 
                              "bg-orange-500/20 text-orange-500 border-orange-500/30" :
                              "bg-nfl-red/20 text-nfl-red border-nfl-red/30"
                            }>
                              {idx === 0 ? 'In Danger' : 'At Risk'}
                            </Badge>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}