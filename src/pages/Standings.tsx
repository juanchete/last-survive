
import { Layout } from "@/components/Layout";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useCurrentMVP } from "@/hooks/useCurrentMVP";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WeeklyElimination } from "@/components/WeeklyElimination";
import { Trophy, User, Crown, DollarSign, TrendingUp, Users, Award } from "lucide-react";
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
      
      {/* Modern Header */}
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-gradient-to-br from-nfl-blue/20 via-nfl-accent/10 to-nfl-blue/20 border-nfl-blue/30 mb-8">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-nfl-blue/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-nfl-blue/30">
                  <Trophy className="w-8 h-8 text-nfl-blue" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">League Standings</h1>
                  <p className="text-xl text-gray-300 mb-4">
                    Track team performance and rankings across the season
                  </p>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 bg-nfl-blue/10 px-3 py-1 rounded-full border border-nfl-blue/20">
                      <Users className="w-4 h-4 text-nfl-blue" />
                      <span className="text-nfl-blue font-medium">{activeTeams.length} Active Teams</span>
                    </div>
                    <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                      <Award className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 font-medium">{eliminatedTeams.length} Eliminated</span>
                    </div>
                    <div className="flex items-center gap-2 bg-nfl-accent/10 px-3 py-1 rounded-full border border-nfl-accent/20">
                      <TrendingUp className="w-4 h-4 text-nfl-accent" />
                      <span className="text-nfl-accent font-medium">Week {currentWeek}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="container mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content - Active Teams */}
          <div className="lg:col-span-3 space-y-8">
            <section>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white/90 mb-2">Active Teams</h2>
                  <p className="text-gray-400">Teams still competing for the championship</p>
                </div>
                <Badge className="bg-nfl-green/20 text-nfl-green border-nfl-green/30 px-4 py-2">
                  <Users className="w-4 h-4 mr-2" />
                  {activeTeams.length} Teams
                </Badge>
              </div>
              
              {loadingTeams || loadingUserTeam ? (
                <Card className="bg-nfl-gray/50 border-nfl-light-gray/20">
                  <CardContent className="p-12">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-12 h-12 bg-nfl-blue/20 rounded-xl flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-nfl-blue animate-pulse" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-white mb-2">Loading Standings</h3>
                        <p className="text-gray-400">Fetching team rankings and statistics...</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-nfl-gray/30 border-nfl-light-gray/20 backdrop-blur-sm">
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
                </Card>
              )}
            </section>

            {/* Eliminated Teams */}
            {eliminatedTeams.length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white/90 mb-2">Eliminated Teams</h2>
                    <p className="text-gray-400">Teams that have been eliminated from competition</p>
                  </div>
                  <Badge variant="destructive" className="px-4 py-2">
                    <Award className="w-4 h-4 mr-2" />
                    {eliminatedTeams.length} Teams
                  </Badge>
                </div>
                
                <Card className="bg-nfl-gray/20 border-nfl-light-gray/20 backdrop-blur-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-nfl-light-gray/20 hover:bg-transparent">
                        <TableHead className="text-nfl-blue font-bold w-16 text-center">#</TableHead>
                        <TableHead className="text-nfl-blue font-bold">Team</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">Owner</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">Points</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">MVP/Earnings</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">Status</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">Week Out</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eliminatedTeams.map(team => (
                        <TableRow 
                          key={team.id} 
                          className={`border-b border-nfl-light-gray/10 hover:bg-nfl-light-gray/5 opacity-75 transition-colors ${
                            userTeam && team.id === userTeam.id ? 'bg-nfl-blue/10 border-nfl-blue/30' : ''
                          }`}
                        >
                          <TableCell className="font-bold text-center">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-nfl-dark-gray/30 text-gray-400 font-bold">
                              {team.rank}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-300">{team.name}</span>
                                  {userTeam && team.id === userTeam.id && (
                                    <Badge className="bg-nfl-blue/20 text-nfl-blue border-nfl-blue/30 text-xs">
                                      You
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-sm text-gray-500">Eliminated</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-8 h-8 bg-nfl-dark-gray/30 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-500" />
                              </div>
                              <span className="text-gray-400">{team.owner}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-gray-400 text-lg">{team.points}</span>
                              <span className="text-xs text-gray-500">points</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex items-center gap-1 bg-gray-500/10 px-2 py-1 rounded-full">
                                <Trophy className="w-3 h-3 text-gray-500" />
                                <span className="text-gray-500 font-bold text-sm">{team.mvp_wins || 0}</span>
                              </div>
                              <div className="flex items-center gap-1 bg-gray-500/10 px-2 py-1 rounded-full">
                                <DollarSign className="w-3 h-3 text-gray-500" />
                                <span className="text-gray-500 text-sm">${team.total_earnings || 0}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive" className="px-3 py-1">
                              Eliminated
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-gray-400 font-medium">Week {team.eliminated ? 'N/A' : '-'}</span>
                              <span className="text-xs text-gray-500">eliminated</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </section>
            )}
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Weekly Elimination */}
            <WeeklyElimination />

            {/* Current MVP Card */}
            {currentMVP && (
              <Card className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border-yellow-500/30 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-b border-yellow-500/20">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                      <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div>
                      <span className="text-yellow-400 font-bold">Current MVP</span>
                      <p className="text-sm text-yellow-300/70 font-normal">Week {currentMVP.week} Champion</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="font-bold text-white text-xl">
                      {currentMVP.fantasy_team?.name}
                    </div>
                    <div className="text-gray-300">
                      {currentMVP.fantasy_team?.user?.full_name}
                    </div>
                    <div className="bg-yellow-500/10 rounded-xl p-4">
                      <div className="text-3xl font-bold text-yellow-400 mb-1">
                        {currentMVP.points} pts
                      </div>
                      <div className="text-yellow-300/70 text-sm">Performance Points</div>
                    </div>
                    <div className="bg-green-500/10 rounded-xl p-3">
                      <div className="text-xl font-semibold text-green-400">
                        +${currentMVP.earnings}
                      </div>
                      <div className="text-green-300/70 text-sm">Weekly Earnings</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Top 3 Leaderboard */}
            <Card className="bg-gradient-to-br from-nfl-gray/50 to-nfl-gray/30 border-nfl-light-gray/20 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-nfl-blue/20 to-nfl-accent/10 border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 bg-nfl-blue/20 rounded-xl flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-nfl-blue" />
                  </div>
                  <div>
                    <span className="text-white">Top Performers</span>
                    <p className="text-sm text-gray-400 font-normal">Leading teams this season</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loadingTeams ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-nfl-dark-gray/30 rounded-xl animate-pulse">
                        <div className="w-12 h-12 bg-nfl-light-gray/20 rounded-xl"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-nfl-light-gray/20 rounded mb-2"></div>
                          <div className="h-3 bg-nfl-light-gray/20 rounded w-2/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sortedTeams.slice(0, 3).map((team, index) => (
                      <div 
                        key={team.id} 
                        className="flex items-center gap-4 p-4 bg-gradient-to-r from-nfl-dark-gray/50 to-transparent rounded-xl border border-nfl-light-gray/10 hover:border-nfl-light-gray/20 transition-all hover:bg-nfl-light-gray/5"
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/30' :
                          index === 1 ? 'bg-gray-400/20 text-gray-300 border-2 border-gray-400/30' :
                          'bg-amber-600/20 text-amber-600 border-2 border-amber-600/30'
                        }`}>
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white truncate">{team.name}</span>
                            {isCurrentMVP(team.id) && (
                              <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-gray-400">
                              <User className="w-3 h-3" />
                              <span className="truncate">{team.owner}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-full">
                              <Trophy className="w-3 h-3 text-yellow-500" />
                              <span className="text-yellow-400 font-medium">{team.mvp_wins || 0}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-nfl-blue text-lg">{team.points}</div>
                          <div className="text-xs text-green-400 font-medium">${team.total_earnings || 0}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
