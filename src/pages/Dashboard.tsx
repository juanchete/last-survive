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
import { ArrowRight, User, Trophy, Calendar, LayoutDashboard, TrendingUp, Star, Shield, Target } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { LeagueNav } from "@/components/LeagueNav";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";



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
      <div className="min-h-screen bg-nfl-dark-gray">
        <div className="container mx-auto px-4 py-6">
          {/* Enhanced Header Section */}
          <PageHeader 
            title="Team Dashboard"
            subtitle={`Week ${currentWeek} • Command your fantasy empire`}
            badge={userTeam && !userTeam.eliminated ? { text: "ACTIVE", variant: "default" } : undefined}
            stats={userTeam ? [
              { label: "Rank", value: `#${userTeam.rank}`, highlight: userTeam.rank <= 3 },
              { label: "Points", value: userTeam.points }
            ] : undefined}
            className="mb-8"
          />

          {/* Quick Stats */}
          {userTeam && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={Trophy}
                iconColor="text-yellow-400"
                label="Current Rank"
                value={`#${userTeam.rank}`}
                subValue={`of ${teams.length} teams`}
                trend={userTeam.rank <= 3 ? "up" : userTeam.rank > teams.length * 0.5 ? "down" : "neutral"}
              />
              <StatCard
                icon={TrendingUp}
                iconColor="text-nfl-green"
                label="Total Points"
                value={userTeam.points}
                subValue="Season total"
              />
              <StatCard
                icon={Shield}
                iconColor="text-nfl-blue"
                label="Win Rate"
                value="75%"
                subValue="Last 4 weeks"
                trend="up"
              />
              <StatCard
                icon={Target}
                iconColor="text-purple-400"
                label="Projected Finish"
                value="Top 5"
                subValue="Based on performance"
              />
            </div>
          )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Your Team Section */}
            <section>
              <SectionHeader
                title="Your Team"
                subtitle="Manage your roster and optimize your lineup"
                action={
                  <Button asChild variant="outline" className="border-nfl-blue text-nfl-blue hover:bg-nfl-blue/10 backdrop-blur-sm">
                    <Link to="/team" className="flex items-center gap-1">
                      Manage Team <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                }
              />
              
              {loadingUserTeam ? (
                <Card className="bg-nfl-gray border-nfl-light-gray/20">
                  <CardContent className="p-8">
                    <div className="animate-pulse">
                      <div className="h-6 bg-gray-700 rounded mb-4 w-3/4"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ) : userTeam ? (
                <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden hover:border-nfl-blue/30 transition-all duration-300">
                  <div className="bg-gradient-to-r from-nfl-blue/10 to-transparent p-1">
                    <div className="p-6">
                      <TeamCard team={userTeam} isUser={true} />
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="bg-nfl-gray border-nfl-light-gray/20">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-lg mb-2">You don't have a team in this league</p>
                    <p className="text-gray-500 text-sm mb-6">Join now to start competing</p>
                    <Button asChild className="bg-nfl-blue hover:bg-nfl-lightblue">
                      <Link to={`/join-league?league=${leagueId}`}>Join League</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Top Available Players */}
            <section>
              <SectionHeader
                title="Top Available Players"
                subtitle="High-performing players ready to join your roster"
                action={
                  <Button asChild variant="outline" className="border-nfl-blue text-nfl-blue hover:bg-nfl-blue/10 backdrop-blur-sm">
                    <Link to={`/draft?league=${leagueId}`} className="flex items-center gap-1">
                      View All <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                }
              />
              
              {loadingPlayers ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {Array(4).fill(0).map((_, i) => (
                    <Card key={i} className="bg-nfl-gray border-nfl-light-gray/20">
                      <CardContent className="p-6">
                        <div className="animate-pulse">
                          <div className="h-6 bg-gray-700 rounded mb-2 w-3/4"></div>
                          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : topAvailablePlayers.length === 0 ? (
                <Card className="bg-nfl-gray border-nfl-light-gray/20">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-lg">No players available at the moment</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {topAvailablePlayers.map(player => (
                    <Card key={player.id} className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden hover:border-nfl-blue/30 transition-all duration-300">
                      <CardContent className="p-4">
                        <PlayerCard player={player} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section>
              <SectionHeader title="Quick Actions" className="mb-4" />
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
            <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden">
              <div className="bg-gradient-to-r from-nfl-red/10 to-transparent p-1">
                <WeeklyElimination />
              </div>
            </Card>

            {/* Leaderboard */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-500/10 to-transparent p-1">
                <CardHeader className="border-b border-nfl-light-gray/20">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span>League Leaders</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {loadingTeams ? (
                    <div className="space-y-4">
                      {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                          <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-700 rounded mb-2 w-3/4"></div>
                            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
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
            <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden">
              <div className="bg-gradient-to-r from-nfl-blue/10 to-transparent p-1">
                <CardHeader className="border-b border-nfl-light-gray/20">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="w-5 h-5 text-nfl-blue" />
                    <span>Season Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
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
      </div>
    </Layout>
  );
}
