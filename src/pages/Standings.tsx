import { Layout } from "@/components/Layout";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useLocation } from "react-router-dom";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Users, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";

export default function Standings() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "";
  const { user } = useAuth();

  // Hooks for real data
  const { data: teams = [], isLoading: loadingTeams } = useFantasyTeams(leagueId);
  const { data: userTeam } = useUserFantasyTeam(leagueId);

  // Sort teams by ranking
  const sortedTeams = [...teams].sort((a, b) => a.rank - b.rank);
  
  // Calculate average points (assuming at least 1 week played)
  const currentWeek = Math.max(1, 1); // This should come from actual week data

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
            subtitle={`Week ${currentWeek} Rankings`}
          />
          
          {/* Standings Table */}
          <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-nfl-light-gray/20 hover:bg-transparent">
                  <TableHead className="text-gray-400 font-medium w-16">Pos</TableHead>
                  <TableHead className="text-gray-400 font-medium">Team</TableHead>
                  <TableHead className="text-gray-400 font-medium">Owner</TableHead>
                  <TableHead className="text-gray-400 font-medium text-center">Top Performer</TableHead>
                  <TableHead className="text-gray-400 font-medium text-right">Avg Pts</TableHead>
                  <TableHead className="text-gray-400 font-medium text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTeams ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-700 rounded w-1/4 mx-auto mb-2"></div>
                        <div className="h-3 bg-gray-700 rounded w-1/6 mx-auto"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedTeams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                      No teams found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTeams.map((team, index) => {
                    const isUserTeam = team.owner_id === user?.id;
                    const avgPoints = (team.points / currentWeek).toFixed(1);
                    const isTopThree = index < 3;
                    
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
                          {team.top_performers || Math.floor(Math.random() * 10)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-nfl-accent">
                          {avgPoints}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={team.eliminated ? "destructive" : "default"}
                            className={`
                              ${team.eliminated 
                                ? 'bg-nfl-red/20 text-nfl-red border-nfl-red/30' 
                                : 'bg-nfl-green/20 text-nfl-green border-nfl-green/30'
                              }
                            `}
                          >
                            {team.eliminated ? 'Eliminated' : 'Safe'}
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
                  {sortedTeams.slice(-3).map((team) => (
                    <div key={team.id} className="flex items-center justify-between">
                      <span className="text-gray-300">{team.name}</span>
                      <Badge className="bg-nfl-red/20 text-nfl-red border-nfl-red/30">
                        At Risk
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}