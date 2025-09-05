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
      <Table>
        <TableHeader>
          <TableRow className="border-nfl-light-gray/20 hover:bg-transparent">
            <TableHead className="text-gray-400 font-medium">Pos</TableHead>
            <TableHead className="text-gray-400 font-medium">Team</TableHead>
            <TableHead className="text-gray-400 font-medium">Owner</TableHead>
            <TableHead className="text-gray-400 font-medium text-right">Avg Pts</TableHead>
            <TableHead className="text-gray-400 font-medium text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTeams.map((team) => {
            const isUserTeam = team.owner_id === user?.id;
            const avgPoints = (team.points / currentWeek).toFixed(1);
            const isInDanger = !team.eliminated && lastPlaceTeam && team.id === lastPlaceTeam.id;
            
            return (
              <TableRow 
                key={team.id} 
                className={`
                  border-nfl-light-gray/20 
                  hover:bg-nfl-light-gray/10
                  ${isUserTeam ? 'bg-nfl-blue/10' : ''}
                `}
              >
                <TableCell className="font-medium text-white">
                  {team.rank}
                </TableCell>
                <TableCell className="font-medium text-white">
                  <div className="flex items-center gap-2">
                    {team.name}
                    {isUserTeam && (
                      <Badge variant="outline" className="text-xs border-nfl-blue text-nfl-blue">
                        YOU
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-gray-300">
                  {team.owner}
                </TableCell>
                <TableCell className="text-right text-white font-medium">
                  {avgPoints}
                </TableCell>
                <TableCell className="text-right">
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}