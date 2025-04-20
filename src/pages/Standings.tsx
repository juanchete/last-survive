
import { Layout } from "@/components/Layout";
import { useLeagueStore } from "@/store/leagueStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamCard } from "@/components/TeamCard";
import { WeeklyElimination } from "@/components/WeeklyElimination";
import { Trophy } from "lucide-react";

export default function Standings() {
  const { teams } = useLeagueStore();
  
  // Sort teams by rank
  const sortedTeams = [...teams].sort((a, b) => a.rank - b.rank);
  
  // Split into active and eliminated teams
  const activeTeams = sortedTeams.filter(team => !team.eliminated);
  const eliminatedTeams = sortedTeams.filter(team => team.eliminated);
  
  // User's team (first team for demo)
  const userTeam = teams[0];
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-6">League Standings</h1>
            
            {/* Active Teams */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Active Teams</h2>
                <Badge className="bg-nfl-green">
                  {activeTeams.length} Teams
                </Badge>
              </div>
              
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeTeams.map(team => (
                  <TeamCard 
                    key={team.id} 
                    team={team} 
                    isUser={team.id === userTeam.id}
                  />
                ))}
              </div>
            </div>
            
            {/* Eliminated Teams */}
            {eliminatedTeams.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Eliminated Teams</h2>
                  <Badge variant="destructive">
                    {eliminatedTeams.length} Teams
                  </Badge>
                </div>
                
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {eliminatedTeams.map(team => (
                    <TeamCard 
                      key={team.id} 
                      team={team} 
                      isUser={team.id === userTeam.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="lg:w-80 space-y-8">
            <WeeklyElimination />
            
            {/* Standings Overview */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-nfl-blue" />
                  <span>Standings Overview</span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Your Position</div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-nfl-blue rounded-full flex items-center justify-center text-white font-bold">
                        {userTeam.rank}
                      </div>
                      <div className="font-bold">{userTeam.name}</div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-nfl-light-gray/20">
                    <div className="text-sm text-gray-400 mb-1">Points Range</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400">Highest</div>
                        <div className="font-bold text-nfl-blue">
                          {Math.max(...teams.map(t => t.points))}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Lowest</div>
                        <div className="font-bold text-nfl-red">
                          {Math.min(...activeTeams.map(t => t.points))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-nfl-light-gray/20">
                    <div className="text-sm text-gray-400 mb-1">Team Status</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400">Active</div>
                        <div className="font-bold text-nfl-green">
                          {activeTeams.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Eliminated</div>
                        <div className="font-bold text-nfl-red">
                          {eliminatedTeams.length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
