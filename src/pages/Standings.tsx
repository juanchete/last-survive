
import { Layout } from "@/components/Layout";
import { useLeagueStore } from "@/store/leagueStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamCard } from "@/components/TeamCard";
import { WeeklyElimination } from "@/components/WeeklyElimination";
import { Trophy, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import { LeagueNav } from "@/components/LeagueNav";

export default function Standings() {
  const { teams } = useLeagueStore();
  
  // Get URL params to identify league context
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "default";
  
  // Sort teams by rank
  const sortedTeams = [...teams].sort((a, b) => a.rank - b.rank);
  
  // Split into active and eliminated teams
  const activeTeams = sortedTeams.filter(team => !team.eliminated);
  const eliminatedTeams = sortedTeams.filter(team => team.eliminated);
  
  // User's team (first team for demo)
  const userTeam = teams[0];
  
  return (
    <Layout>
      {/* Add LeagueNav for context-specific navigation */}
      <LeagueNav leagueId={leagueId} />
      
      <div className="container mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Active Teams Section */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white/90">Active Teams</h2>
                <Badge className="bg-nfl-green">
                  {activeTeams.length} Teams
                </Badge>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {activeTeams.map(team => (
                  <TeamCard 
                    key={team.id} 
                    team={team} 
                    isUser={team.id === userTeam.id}
                  />
                ))}
              </div>
            </section>

            {/* Eliminated Teams Section */}
            {eliminatedTeams.length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white/90">Eliminated Teams</h2>
                  <Badge variant="destructive">
                    {eliminatedTeams.length} Teams
                  </Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {eliminatedTeams.map(team => (
                    <TeamCard 
                      key={team.id} 
                      team={team} 
                      isUser={team.id === userTeam.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Weekly Elimination */}
            <WeeklyElimination />

            {/* Standings Overview - List Style */}
            <Card className="bg-gradient-to-br from-nfl-gray to-nfl-gray/90 border-nfl-light-gray/20">
              <CardHeader className="bg-nfl-dark-gray/50 border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-nfl-blue" />
                  <span>Standings Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="divide-y divide-nfl-light-gray/10">
                  {sortedTeams.map((team, index) => (
                    <div 
                      key={team.id}
                      className="flex items-center gap-3 py-3 transition-colors hover:bg-white/5 rounded-lg px-2"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold 
                        ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : 
                          index === 1 ? 'bg-gray-400/20 text-gray-300' : 
                          index === 2 ? 'bg-amber-800/20 text-amber-600' :
                          'bg-nfl-dark-gray/50 text-gray-400'}`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{team.name}</div>
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <User className="w-3 h-3" />
                          <span className="truncate">{team.owner}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-nfl-blue">{team.points}</div>
                        <div className="text-xs text-gray-400">points</div>
                      </div>
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
