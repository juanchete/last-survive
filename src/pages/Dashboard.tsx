import { Layout } from "@/components/Layout";
import { useLeagueStore } from "@/store/leagueStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamCard } from "@/components/TeamCard";
import { PlayerCard } from "@/components/PlayerCard";
import { WeeklyElimination } from "@/components/WeeklyElimination";
import { ArrowRight, User, Trophy, Calendar } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { LeagueNav } from "@/components/LeagueNav";

export default function Dashboard() {
  const { teams, availablePlayers, currentWeek } = useLeagueStore();
  
  // Get URL params to identify league context
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "default";
  
  // Get user's team (first team for demo)
  const userTeam = teams[0];
  
  // Get top-ranked teams
  const topTeams = [...teams].sort((a, b) => a.rank - b.rank).slice(0, 3);
  
  // Get available players (top 4 for display)
  const topAvailablePlayers = availablePlayers
    .filter(player => player.available && !player.eliminated)
    .sort((a, b) => b.points - a.points)
    .slice(0, 4);
  
  return (
    <Layout>
      {/* Add LeagueNav for context-specific navigation */}
      <LeagueNav leagueId={leagueId} />
      
      <div className="container mx-auto px-4 py-4">
        {/* Welcome Section */}
        <Card className="mb-8 bg-gradient-to-br from-nfl-blue/10 to-nfl-blue/5 border-nfl-light-gray/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-nfl-blue" />
              <span className="text-xl">Welcome to Week {currentWeek}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-300 mb-4">
              Your team "{userTeam.name}" is currently ranked #{userTeam.rank}. 
              Check out this week's matchups and available players.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="default" className="bg-nfl-blue hover:bg-nfl-lightblue">
                <Link to={`/draft?league=${leagueId}`}>Draft Players</Link>
              </Button>
              <Button asChild variant="outline" className="border-nfl-blue text-nfl-blue hover:bg-nfl-blue/10">
                <Link to={`/standings?league=${leagueId}`}>View Standings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Your Team Section */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white/90">Your Team</h2>
                <Button asChild variant="link" className="text-nfl-blue p-0">
                  <Link to="/team" className="flex items-center gap-1">
                    Manage Team <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
              <TeamCard team={userTeam} isUser={true} />
            </section>

            {/* Top Available Players */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white/90">Top Available Players</h2>
                <Button asChild variant="link" className="text-nfl-blue p-0">
                  <Link to={`/draft?league=${leagueId}`} className="flex items-center gap-1">
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {topAvailablePlayers.map(player => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Weekly Elimination */}
            <WeeklyElimination />

            {/* Leaderboard */}
            <Card className="bg-gradient-to-br from-nfl-gray to-nfl-gray/90 border-nfl-light-gray/20">
              <CardHeader className="bg-nfl-dark-gray/50 border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-nfl-blue" />
                  <span>Top Teams</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {topTeams.map((team, index) => (
                    <div key={team.id} 
                      className="flex items-center gap-3 border-b border-nfl-light-gray/10 pb-3 last:border-0 transition-colors hover:bg-white/5 rounded-lg p-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold 
                        ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : 
                          index === 1 ? 'bg-gray-400/20 text-gray-300' : 
                          'bg-amber-800/20 text-amber-600'}`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold">{team.name}</div>
                        <div className="text-sm text-gray-400">{team.owner}</div>
                      </div>
                      <div className="text-nfl-blue font-bold">{team.points}</div>
                    </div>
                  ))}
                </div>
                <Button asChild variant="outline" className="w-full mt-4 text-nfl-blue border-nfl-blue hover:bg-nfl-blue/10">
                  <Link to={`/standings?league=${leagueId}`}>View All Teams</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Season Timeline */}
            <Card className="bg-gradient-to-br from-nfl-gray to-nfl-gray/90 border-nfl-light-gray/20">
              <CardHeader className="bg-nfl-dark-gray/50 border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-nfl-blue" />
                  <span>Season Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-nfl-blue/20 scrollbar-track-transparent pr-2">
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
                    <div key={week} 
                      className="flex items-center justify-between py-2 px-3 border-b border-nfl-light-gray/10 last:border-0 transition-colors hover:bg-white/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge className={
                          week < currentWeek ? "bg-nfl-green" : 
                          week === currentWeek ? "bg-nfl-blue" : 
                          "bg-nfl-gray/50"
                        }>
                          W{week}
                        </Badge>
                        <span className="text-sm">Week {week}</span>
                      </div>
                      <Badge variant="outline" className={`bg-transparent text-xs ${
                        week < currentWeek ? "text-nfl-green" :
                        week === currentWeek ? "text-nfl-blue" :
                        "text-gray-400"
                      }`}>
                        {week < currentWeek ? 'Completed' : 
                         week === currentWeek ? 'Active' : 
                         'Upcoming'}
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
