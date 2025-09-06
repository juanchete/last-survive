import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeagueTeam } from "@/hooks/useLeagueDashboardData";
import { useAuth } from "@/hooks/useAuth";

interface LeagueStandingsTableProps {
  teams: LeagueTeam[] | undefined;
  isLoading: boolean;
}

export function LeagueStandingsTable({ teams, isLoading }: LeagueStandingsTableProps) {
  const { user } = useAuth();

  if (isLoading || !teams) {
    return (
      <Card className="bg-nfl-gray border-nfl-light-gray/20">
        <div className="p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Sort teams by points and assign proper ranks
  const sortedTeams = [...teams]
    .sort((a, b) => {
      // Sort by points (descending)
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      // If points are equal, sort by name for consistent ordering
      return a.name.localeCompare(b.name);
    })
    .map((team, index) => ({ ...team, rank: index + 1 }));

  // Show all teams (not just top 5)
  const currentWeek = Math.max(1, 1); // This should come from actual week data
  
  // Find team in last place among non-eliminated teams
  const activeTeams = sortedTeams.filter(t => !t.eliminated);
  const lastPlaceTeam = activeTeams.length > 0 ? activeTeams[activeTeams.length - 1] : null;

  return (
    <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden">
      {/* Horizontal Scrolling Container */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 p-4 min-w-max">
          {sortedTeams.map((team) => {
            const isUserTeam = team.owner_id === user?.id;
            const avgPoints = (team.points / currentWeek).toFixed(1);
            const isInDanger = !team.eliminated && lastPlaceTeam && team.id === lastPlaceTeam.id;
            
            return (
              <div 
                key={team.id} 
                className={`
                  flex-shrink-0 w-64 bg-nfl-dark/50 border rounded-lg p-4 transition-all duration-300
                  ${isUserTeam 
                    ? 'border-nfl-blue ring-2 ring-nfl-blue/30 bg-nfl-blue/5' 
                    : 'border-nfl-light-gray/20 hover:border-nfl-blue/30'
                  }
                  ${isInDanger ? 'ring-2 ring-orange-500/30' : ''}
                `}
              >
                {/* Position Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                    ${team.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900' : 
                      team.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900' : 
                      team.rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100' :
                      'bg-gradient-to-br from-nfl-gray to-nfl-light-gray text-white'}`}>
                    {team.rank}
                  </div>
                  
                  <Badge 
                    variant={team.eliminated ? "destructive" : isInDanger ? "warning" : "default"}
                    className={`
                      ${team.eliminated 
                        ? 'bg-nfl-red/20 text-nfl-red border-nfl-red/30' 
                        : isInDanger
                        ? 'bg-orange-500/20 text-orange-500 border-orange-500/30'
                        : 'bg-nfl-green/20 text-nfl-green border-nfl-green/30'
                      }
                    `}
                  >
                    {team.eliminated ? 'Eliminated' : isInDanger ? 'IN DANGER' : 'Safe'}
                  </Badge>
                </div>

                {/* Team Info */}
                <div className="space-y-2">
                  <div>
                    <h4 className="font-bold text-white text-sm leading-tight">{team.name}</h4>
                    {isUserTeam && (
                      <Badge variant="outline" className="text-xs border-nfl-blue text-nfl-blue mt-1">
                        YOUR TEAM
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-400 truncate">
                    Owner: {team.owner}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-nfl-light-gray/20">
                    <span className="text-xs text-gray-400">Avg Points</span>
                    <span className="font-bold text-white text-lg">{avgPoints}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Scroll Hint */}
      <div className="bg-nfl-dark/30 border-t border-nfl-light-gray/20 px-4 py-2">
        <p className="text-xs text-gray-400 text-center">
          ← Desliza horizontalmente para ver todos los equipos →
        </p>
      </div>
    </Card>
  );
}