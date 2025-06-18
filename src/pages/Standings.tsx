
import { Layout } from "@/components/Layout";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useCurrentMVP } from "@/hooks/useCurrentMVP";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WeeklyElimination } from "@/components/WeeklyElimination";
import { Trophy, User, Crown, DollarSign } from "lucide-react";
import { useLocation } from "react-router-dom";
import { LeagueNav } from "@/components/LeagueNav";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Standings() {
  // Obtener el leagueId desde la URL
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "default";

  // Hooks para datos reales
  const { data: teams = [], isLoading: loadingTeams } = useFantasyTeams(leagueId);
  const { data: userTeam, isLoading: loadingUserTeam } = useUserFantasyTeam(leagueId);
  const { data: currentMVP } = useCurrentMVP(leagueId, 1);

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
      <div className="container mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Columna principal con tabla */}
          <div className="lg:col-span-3 space-y-8">
            {/* Equipos activos */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white/90">League Standings</h2>
                <Badge className="bg-nfl-green">
                  {activeTeams.length} Active Teams
                </Badge>
              </div>
              
              {loadingTeams || loadingUserTeam ? (
                <div className="bg-nfl-gray border border-nfl-light-gray/20 rounded-lg p-8">
                  <p className="text-gray-400 text-center">Loading standings...</p>
                </div>
              ) : (
                <Card className="bg-nfl-gray border-nfl-light-gray/20">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-nfl-light-gray/20 hover:bg-transparent">
                        <TableHead className="text-nfl-blue font-bold w-16">#</TableHead>
                        <TableHead className="text-nfl-blue font-bold">Team</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">Owner</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">Points</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">MVP/Earnings</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">Status</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">Players</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeTeams.map((team) => (
                        <TableRow 
                          key={team.id} 
                          className={`border-b border-nfl-light-gray/10 hover:bg-nfl-light-gray/10 ${
                            userTeam && team.id === userTeam.id ? 'bg-nfl-blue/10 border-nfl-blue/30' : ''
                          }`}
                        >
                          <TableCell className="font-bold">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getRankColor(team.rank)}`}>
                              {getRankIcon(team.rank)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{team.name}</span>
                              {userTeam && team.id === userTeam.id && (
                                <Badge className="bg-nfl-blue text-xs">You</Badge>
                              )}
                              {isCurrentMVP(team.id) && (
                                <Crown className="w-4 h-4 text-yellow-400" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-300">{team.owner}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-nfl-blue text-lg">{team.points}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {(team.mvp_wins || 0) > 0 && (
                                <div className="flex items-center gap-1">
                                  <Crown className="w-3 h-3 text-yellow-400" />
                                  <span className="text-yellow-400 font-bold text-sm">{team.mvp_wins}</span>
                                </div>
                              )}
                              {(team.total_earnings || 0) > 0 && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3 text-green-400" />
                                  <span className="text-green-400 font-bold text-sm">{team.total_earnings}</span>
                                </div>
                              )}
                              {!(team.mvp_wins || 0) && !(team.total_earnings || 0) && (
                                <span className="text-gray-500 text-sm">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-nfl-green/20 text-nfl-green border-nfl-green/30">
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-gray-300">{team.players.length}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </section>

            {/* Equipos eliminados */}
            {eliminatedTeams.length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white/90">Eliminated Teams</h2>
                  <Badge variant="destructive">
                    {eliminatedTeams.length} Teams
                  </Badge>
                </div>
                
                <Card className="bg-nfl-gray border-nfl-light-gray/20">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-nfl-light-gray/20 hover:bg-transparent">
                        <TableHead className="text-nfl-blue font-bold w-16">#</TableHead>
                        <TableHead className="text-nfl-blue font-bold">Team</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">Owner</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">Points</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">MVP/Earnings</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">Status</TableHead>
                        <TableHead className="text-nfl-blue font-bold text-center">Week Out</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eliminatedTeams.map((team) => (
                        <TableRow 
                          key={team.id} 
                          className={`border-b border-nfl-light-gray/10 hover:bg-nfl-light-gray/10 opacity-75 ${
                            userTeam && team.id === userTeam.id ? 'bg-nfl-blue/10 border-nfl-blue/30' : ''
                          }`}
                        >
                          <TableCell className="font-bold text-gray-400">{team.rank}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-300">{team.name}</span>
                              {userTeam && team.id === userTeam.id && (
                                <Badge className="bg-nfl-blue text-xs">You</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-400">{team.owner}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-gray-400">{team.points}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {(team.mvp_wins || 0) > 0 && (
                                <div className="flex items-center gap-1">
                                  <Crown className="w-3 h-3 text-yellow-400/60" />
                                  <span className="text-yellow-400/60 font-bold text-sm">{team.mvp_wins}</span>
                                </div>
                              )}
                              {(team.total_earnings || 0) > 0 && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3 text-green-400/60" />
                                  <span className="text-green-400/60 font-bold text-sm">{team.total_earnings}</span>
                                </div>
                              )}
                              {!(team.mvp_wins || 0) && !(team.total_earnings || 0) && (
                                <span className="text-gray-500 text-sm">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">
                              Eliminated
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-gray-400">Week {team.eliminated ? 'N/A'   : '-'}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Weekly Elimination */}
            <WeeklyElimination />

            {/* Leaderboard Summary */}
            <Card className="bg-gradient-to-br from-nfl-gray to-nfl-gray/90 border-nfl-light-gray/20">
              <CardHeader className="bg-nfl-dark-gray/50 border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-nfl-blue" />
                  <span>Top 3</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {loadingTeams ? (
                  <p className="text-gray-400">Loading teams...</p>
                ) : (
                  <div className="space-y-3">
                    {sortedTeams.slice(0, 3).map((team, index) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-3 py-2 transition-colors hover:bg-white/5 rounded-lg px-2"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold 
                          ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : 
                            index === 1 ? 'bg-gray-400/20 text-gray-300' : 
                            'bg-amber-800/20 text-amber-600'}`}>
                          <Trophy className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-bold truncate">{team.name}</span>
                            {isCurrentMVP(team.id) && (
                              <Crown className="w-3 h-3 text-yellow-400" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-400">
                            <User className="w-3 h-3" />
                            <span className="truncate">{team.owner}</span>
                            {(team.mvp_wins || 0) > 0 && (
                              <>
                                <Crown className="w-3 h-3 text-yellow-400/60 ml-1" />
                                <span className="text-yellow-400/60">{team.mvp_wins}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-nfl-blue">{team.points}</div>
                          <div className="text-xs text-gray-400">points</div>
                          {(team.total_earnings || 0) > 0 && (
                            <div className="text-xs text-green-400">${team.total_earnings}</div>
                          )}
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
