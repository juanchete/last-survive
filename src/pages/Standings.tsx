import { Layout } from "@/components/Layout";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useCurrentMVP } from "@/hooks/useCurrentMVP";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WeeklyElimination } from "@/components/WeeklyElimination";
import { Trophy, User, Crown, DollarSign, TrendingUp, Users, Award, Loader2, BarChart3, Calendar } from "lucide-react";
import { useLocation } from "react-router-dom";
import { LeagueNav } from "@/components/LeagueNav";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Standings() {
  // Obtener el leagueId desde la URL
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "default";
  const currentWeek = 1; // This should come from your current week logic

  // Hooks para datos reales
  const {
    data: teams = [],
    isLoading: loadingTeams
  } = useFantasyTeams(leagueId);
  const {
    data: userTeam,
    isLoading: loadingUserTeam
  } = useUserFantasyTeam(leagueId);
  const {
    data: currentMVP
  } = useCurrentMVP(leagueId, currentWeek);

  // Ordenar equipos por ranking
  const sortedTeams = [...teams].sort((a, b) => a.rank - b.rank);
  // Separar activos y eliminados
  const activeTeams = sortedTeams.filter(team => !team.eliminated);
  const eliminatedTeams = sortedTeams.filter(team => team.eliminated);
  
  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-amber-600";
    return "text-white";
  };
  
  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return <Trophy className="w-4 h-4" />;
    }
    return rank;
  };
  
  const isCurrentMVP = (teamId: string) => {
    return currentMVP?.fantasy_team_id === teamId;
  };

  return (
    <Layout>
      <LeagueNav leagueId={leagueId} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Enhanced Header - matching Waiver Wire design */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-nfl-blue via-nfl-blue/90 to-blue-700 border border-nfl-blue/20 mb-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23ffffff&quot; fill-opacity=&quot;0.05&quot;%3E%3Ccircle cx=&quot;30&quot; cy=&quot;30&quot; r=&quot;2&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
          <div className="relative p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">League Standings</h1>
                  <p className="text-blue-100 text-lg">Track team performance and rankings across the season</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20">
                  <div className="text-white text-sm mb-1">Week</div>
                  <div className="text-2xl font-bold text-white">{currentWeek}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 mt-6">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full border border-white/20 backdrop-blur-sm">
                <Users className="w-4 h-4 text-white" />
                <span className="text-white font-medium">{activeTeams.length} Active Teams</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full border border-white/20 backdrop-blur-sm">
                <Award className="w-4 h-4 text-white" />
                <span className="text-white font-medium">{eliminatedTeams.length} Eliminated</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full border border-white/20 backdrop-blur-sm">
                <TrendingUp className="w-4 h-4 text-white" />
                <span className="text-white font-medium">Season Progress</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Content Grid */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Standings Table */}
          <div className="lg:col-span-3">
            <Card className="bg-gradient-to-br from-nfl-dark-gray to-nfl-gray border-nfl-light-gray/20 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-2 text-xl">
                  <Trophy className="w-5 h-5 text-nfl-blue" />
                  Team Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTeams ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3 text-gray-400">
                      <Loader2 className="animate-spin w-6 h-6" />
                      <span className="text-lg">Loading standings...</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-nfl-darker/50 rounded-xl overflow-hidden border border-nfl-light-gray/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-nfl-light-gray/20 hover:bg-transparent">
                          <TableHead className="text-nfl-blue font-bold w-16 text-center">#</TableHead>
                          <TableHead className="text-nfl-blue font-bold">Team</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center">Owner</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center">Points</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center">MVP/Earnings</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center">Status</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center">Players</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeTeams.map(team => (
                          <TableRow 
                            key={team.id} 
                            className={`border-b border-nfl-light-gray/10 hover:bg-nfl-light-gray/5 transition-colors ${
                              userTeam && team.id === userTeam.id ? 'bg-nfl-blue/10 border-nfl-blue/30' : ''
                            } ${
                              isCurrentMVP(team.id) ? 'bg-gradient-to-r from-yellow-500/5 to-transparent border-yellow-500/20' : ''
                            }`}
                          >
                            <TableCell className="font-bold text-center">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold ${
                                team.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                                team.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                                team.rank === 3 ? 'bg-amber-600/20 text-amber-600' :
                                'bg-nfl-dark-gray/50 text-white'
                              }`}>
                                {getRankIcon(team.rank)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-lg">{team.name}</span>
                                    {isCurrentMVP(team.id) && (
                                      <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    )}
                                    {userTeam && team.id === userTeam.id && (
                                      <Badge className="bg-nfl-blue/20 text-nfl-blue border-nfl-blue/30 text-xs">
                                        You
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-400">Rank #{team.rank}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-8 h-8 bg-nfl-dark-gray rounded-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-gray-400" />
                                </div>
                                <span className="text-gray-300 font-medium">{team.owner}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-nfl-blue text-xl">{team.points}</span>
                                <span className="text-xs text-gray-400">points</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-full">
                                  <Trophy className="w-3 h-3 text-yellow-400" />
                                  <span className="text-yellow-400 font-bold text-sm">{team.mvp_wins || 0}</span>
                                </div>
                                <div className="flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full">
                                  <DollarSign className="w-3 h-3 text-green-400" />
                                  <span className="text-green-400 text-sm font-medium">${team.total_earnings || 0}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-nfl-green/20 text-nfl-green border-nfl-green/30 px-3 py-1">
                                Active
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-white font-medium">{team.players.length}</span>
                                <span className="text-xs text-gray-400">players</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* League Stats Card */}
            <Card className="bg-gradient-to-br from-nfl-dark-gray to-nfl-gray border-nfl-light-gray/20 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-nfl-blue" />
                  League Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-nfl-darker/50 rounded-lg p-4 border border-nfl-light-gray/10">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Teams</span>
                    <span className="text-white font-bold">{fantasyTeams.length}</span>
                  </div>
                </div>
                <div className="bg-nfl-darker/50 rounded-lg p-4 border border-nfl-light-gray/10">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Active Teams</span>
                    <span className="text-green-400 font-bold">{activeTeams.length}</span>
                  </div>
                </div>
                <div className="bg-nfl-darker/50 rounded-lg p-4 border border-nfl-light-gray/10">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Eliminated</span>
                    <span className="text-red-400 font-bold">{eliminatedTeams.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Week Card */}
            <Card className="bg-gradient-to-br from-nfl-dark-gray to-nfl-gray border-nfl-light-gray/20 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-nfl-blue" />
                  Current Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-nfl-blue mb-2">Week {currentWeek}</div>
                  <p className="text-gray-400 text-sm">Regular Season</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
