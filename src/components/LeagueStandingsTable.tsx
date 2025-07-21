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

  // Show top 5 teams
  const topTeams = teams.slice(0, 5);

  // Calculate average points (assuming at least 1 week played)
  const currentWeek = Math.max(1, 1); // This should come from actual week data

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
          {topTeams.map((team) => {
            const isUserTeam = team.owner_id === user?.id;
            const avgPoints = (team.points / currentWeek).toFixed(1);
            
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
                    variant={team.eliminated ? "destructive" : "default"}
                    className={`
                      ${team.eliminated 
                        ? 'bg-nfl-red/20 text-nfl-red border-nfl-red/30' 
                        : 'bg-nfl-green/20 text-nfl-green border-nfl-green/30'
                      }
                    `}
                  >
                    {team.eliminated ? 'Eliminated' : 'Safe'}
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