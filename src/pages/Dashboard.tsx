
import { Layout } from "@/components/Layout";
import { useLeagueStore } from "@/store/leagueStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamCard } from "@/components/TeamCard";
import { PlayerCard } from "@/components/PlayerCard";
import { WeeklyElimination } from "@/components/WeeklyElimination";
import { ArrowRight, User, Trophy, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { teams, availablePlayers, currentWeek } = useLeagueStore();
  
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Welcome Card */}
            <Card className="mb-8 bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-nfl-blue" />
                  <span>Welcome to Week {currentWeek}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-gray-300 mb-4">
                  Your team "{userTeam.name}" is currently ranked #{userTeam.rank}. 
                  Check out this week's matchups and available players.
                </p>
                
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="default" className="bg-nfl-blue hover:bg-nfl-lightblue">
                    <Link to="/draft">Draft Players</Link>
                  </Button>
                  <Button asChild variant="outline" className="border-nfl-blue text-nfl-blue hover:bg-nfl-blue/10">
                    <Link to="/standings">View Standings</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          
            {/* Your Team Card */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Your Team</h2>
                <Button asChild variant="link" className="text-nfl-blue p-0">
                  <Link to="/team" className="flex items-center gap-1">
                    Manage Team <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
              
              <TeamCard team={userTeam} isUser={true} />
            </div>
            
            {/* Top Available Players */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Top Available Players</h2>
                <Button asChild variant="link" className="text-nfl-blue p-0">
                  <Link to="/draft" className="flex items-center gap-1">
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
              
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                {topAvailablePlayers.map(player => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>
            </div>
          </div>
          
          {/* Sidebar Content */}
          <div className="lg:w-80 space-y-8">
            {/* Weekly Elimination */}
            <WeeklyElimination />
            
            {/* Leaderboard */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-nfl-blue" />
                  <span>Top Teams</span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-4">
                <div className="space-y-4">
                  {topTeams.map((team, index) => (
                    <div key={team.id} className="flex items-center gap-3 border-b border-nfl-light-gray/10 pb-3 last:border-0">
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
                  <Link to="/standings">View All Teams</Link>
                </Button>
              </CardContent>
            </Card>
            
            {/* Upcoming Schedule */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-nfl-blue" />
                  <span>Season Timeline</span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-4">
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
                    <div key={week} className="flex items-center justify-between py-2 border-b border-nfl-light-gray/10 last:border-0">
                      <div className="flex items-center gap-2">
                        <Badge className={
                          week < currentWeek ? "bg-nfl-green" : 
                          week === currentWeek ? "bg-nfl-blue" : 
                          "bg-nfl-gray"
                        }>
                          W{week}
                        </Badge>
                        <span>Week {week}</span>
                      </div>
                      <Badge variant="outline" className="bg-transparent">
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
