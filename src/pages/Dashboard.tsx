import { Layout } from "@/components/Layout";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useAvailablePlayers } from "@/hooks/useAvailablePlayers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamCard } from "@/components/TeamCard";
import { PlayerCard } from "@/components/PlayerCard";
import { WeeklyElimination } from "@/components/WeeklyElimination";
import { ArrowRight, User, Trophy, Calendar, LayoutDashboard, TrendingUp, Star } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { LeagueNav } from "@/components/LeagueNav";
import { FantasyTeam, Player } from "@/types";


export default function Dashboard() {
  // Obtener el leagueId desde la URL
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "default";

  // Hooks para datos reales
  const { data: currentWeekData, isLoading: loadingWeek } = useCurrentWeek(leagueId);
  const currentWeek = currentWeekData?.number || 1;
  const { data: teams = [], isLoading: loadingTeams } = useFantasyTeams(leagueId);
  const { data: userTeam, isLoading: loadingUserTeam } = useUserFantasyTeam(leagueId);
  const { data: availablePlayers = [], isLoading: loadingPlayers } = useAvailablePlayers(leagueId, currentWeek);

  // Top equipos ordenados por ranking
  const topTeams = [...teams].sort((a, b) => a.rank - b.rank).slice(0, 3);
  // Top jugadores disponibles por puntos
  const topAvailablePlayers = availablePlayers
    .sort((a, b) => b.points - a.points)
    .slice(0, 4)
    .map(player => ({
      ...player,
      position: player.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF"
    }));

  // Loading state global
  const isLoading = loadingWeek || loadingTeams || loadingUserTeam || loadingPlayers;

  return (
    <Layout>
      <LeagueNav leagueId={leagueId} />
      <div className="container mx-auto px-4 py-6">
        {/* Enhanced Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-nfl-blue via-nfl-blue/90 to-blue-700 border border-nfl-blue/20 mb-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23ffffff&quot; fill-opacity=&quot;0.05&quot;%3E%3Ccircle cx=&quot;30&quot; cy=&quot;30&quot; r=&quot;2&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
          <div className="relative p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <LayoutDashboard className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
                  <p className="text-blue-100 text-lg">Week {currentWeek} • Command your fantasy empire</p>
                </div>
              </div>
              {userTeam && (
                <div className="text-right">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/30 backdrop-blur-sm px-4 py-2 text-sm mb-2">
                    <Star className="w-4 h-4 mr-2" />
                    Rank #{userTeam.rank}
                  </Badge>
                  <div className="text-white/80 text-sm">
                    {userTeam.points} Points
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Your Team Section */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Your Team</h2>
                  <p className="text-gray-400">Manage your roster and optimize your lineup</p>
                </div>
                <Button asChild variant="outline" className="border-nfl-blue text-nfl-blue hover:bg-nfl-blue/10 backdrop-blur-sm">
                  <Link to="/team" className="flex items-center gap-1">
                    Manage Team <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
              
              {loadingUserTeam ? (
                <Card className="bg-gradient-to-br from-nfl-gray via-nfl-gray/95 to-nfl-gray/90 border-nfl-light-gray/20">
                  <CardContent className="p-8">
                    <div className="animate-pulse">
                      <div className="h-6 bg-gray-600 rounded mb-4 w-3/4"></div>
                      <div className="h-4 bg-gray-600 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ) : userTeam ? (
                <div className="bg-gradient-to-br from-nfl-gray via-nfl-gray/95 to-nfl-gray/90 border border-nfl-light-gray/20 rounded-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-nfl-blue/10 to-transparent p-1">
                    <div className="bg-nfl-dark-gray/50 rounded-xl p-6">
                      <TeamCard team={userTeam} isUser={true} />
                    </div>
                  </div>
                </div>
              ) : (
                <Card className="bg-gradient-to-br from-nfl-gray via-nfl-gray/95 to-nfl-gray/90 border-nfl-light-gray/20">
                  <CardContent className="p-8 text-center">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">You don't have a team in this league</p>
                    <Button asChild className="mt-4 bg-nfl-blue hover:bg-nfl-lightblue">
                      <Link to={`/join-league?league=${leagueId}`}>Join League</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Top Available Players */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Top Available Players</h2>
                  <p className="text-gray-400">High-performing players ready to join your roster</p>
                </div>
                <Button asChild variant="outline" className="border-nfl-blue text-nfl-blue hover:bg-nfl-blue/10 backdrop-blur-sm">
                  <Link to={`/draft?league=${leagueId}`} className="flex items-center gap-1">
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
              
              {loadingPlayers ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {Array(4).fill(0).map((_, i) => (
                    <Card key={i} className="bg-gradient-to-br from-nfl-gray via-nfl-gray/95 to-nfl-gray/90 border-nfl-light-gray/20">
                      <CardContent className="p-6">
                        <div className="animate-pulse">
                          <div className="h-6 bg-gray-600 rounded mb-2 w-3/4"></div>
                          <div className="h-4 bg-gray-600 rounded w-1/2"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : topAvailablePlayers.length === 0 ? (
                <Card className="bg-gradient-to-br from-nfl-gray via-nfl-gray/95 to-nfl-gray/90 border-nfl-light-gray/20">
                  <CardContent className="p-8 text-center">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No players available at the moment</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {topAvailablePlayers.map(player => (
                    <div key={player.id} className="bg-gradient-to-br from-nfl-gray via-nfl-gray/95 to-nfl-gray/90 border border-nfl-light-gray/20 rounded-2xl overflow-hidden hover:border-nfl-blue/30 transition-all duration-300">
                      <div className="bg-gradient-to-r from-nfl-blue/10 to-transparent p-1">
                        <div className="bg-nfl-dark-gray/50 rounded-xl p-4">
                          <PlayerCard player={player} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <Button asChild className="h-auto p-6 bg-gradient-to-br from-nfl-blue to-nfl-lightblue hover:from-nfl-lightblue hover:to-nfl-blue transition-all duration-300">
                  <Link to={`/draft?league=${leagueId}`} className="flex flex-col items-center gap-2">
                    <User className="w-6 h-6" />
                    <span className="font-semibold">Draft Players</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto p-6 border-nfl-blue text-nfl-blue hover:bg-nfl-blue/10 backdrop-blur-sm">
                  <Link to={`/waivers?league=${leagueId}`} className="flex flex-col items-center gap-2">
                    <TrendingUp className="w-6 h-6" />
                    <span className="font-semibold">Waivers</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto p-6 border-nfl-blue text-nfl-blue hover:bg-nfl-blue/10 backdrop-blur-sm">
                  <Link to={`/standings?league=${leagueId}`} className="flex flex-col items-center gap-2">
                    <Trophy className="w-6 h-6" />
                    <span className="font-semibold">Standings</span>
                  </Link>
                </Button>
              </div>
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Weekly Elimination */}
            <div className="bg-gradient-to-br from-nfl-gray via-nfl-gray/95 to-nfl-gray/90 border border-nfl-light-gray/20 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-nfl-red/10 to-transparent p-1">
                <div className="rounded-xl">
                  <WeeklyElimination />
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            <Card className="bg-gradient-to-br from-nfl-gray via-nfl-gray/95 to-nfl-gray/90 border-nfl-light-gray/20 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-500/10 to-transparent p-1">
                <CardHeader className="bg-nfl-dark-gray/50 border-b border-nfl-light-gray/20 rounded-t-xl">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span>League Leaders</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-nfl-dark-gray/30 rounded-b-xl">
                  {loadingTeams ? (
                    <div className="space-y-4">
                      {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                          <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-600 rounded mb-2 w-3/4"></div>
                            <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {topTeams.map((team, index) => (
                        <div key={team.id} 
                          className="flex items-center gap-3 border-b border-nfl-light-gray/10 pb-3 last:border-0 transition-colors hover:bg-white/5 rounded-lg p-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                            ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900' : 
                              index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900' : 
                              'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100'}`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-white">{team.name}</div>
                            <div className="text-sm text-gray-400">{team.owner}</div>
                          </div>
                          <div className="text-nfl-blue font-bold">{team.points}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button asChild variant="outline" className="w-full mt-4 text-nfl-blue border-nfl-blue hover:bg-nfl-blue/10 backdrop-blur-sm">
                    <Link to={`/standings?league=${leagueId}`}>View Full Standings</Link>
                  </Button>
                </CardContent>
              </div>
            </Card>

            {/* Season Timeline */}
            <Card className="bg-gradient-to-br from-nfl-gray via-nfl-gray/95 to-nfl-gray/90 border-nfl-light-gray/20 overflow-hidden">
              <div className="bg-gradient-to-r from-nfl-blue/10 to-transparent p-1">
                <CardHeader className="bg-nfl-dark-gray/50 border-b border-nfl-light-gray/20 rounded-t-xl">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="w-5 h-5 text-nfl-blue" />
                    <span>Season Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 bg-nfl-dark-gray/30 rounded-b-xl">
                  <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-nfl-blue/20 scrollbar-track-transparent pr-2">
                    {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
                      <div key={week} 
                        className="flex items-center justify-between py-2 px-3 border-b border-nfl-light-gray/10 last:border-0 transition-colors hover:bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge className={
                            week < currentWeek ? "bg-nfl-green hover:bg-nfl-green" : 
                            week === currentWeek ? "bg-nfl-blue hover:bg-nfl-blue" : 
                            "bg-nfl-gray/50 hover:bg-nfl-gray/50"
                          }>
                            W{week}
                          </Badge>
                          <span className="text-sm text-white">Week {week}</span>
                        </div>
                        <Badge variant="outline" className={`bg-transparent text-xs border-none ${
                          week < currentWeek ? "text-nfl-green" :
                          week === currentWeek ? "text-nfl-blue" :
                          "text-gray-400"
                        }`}>
                          {week < currentWeek ? 'Complete' : 
                           week === currentWeek ? 'Active' : 
                           'Upcoming'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
