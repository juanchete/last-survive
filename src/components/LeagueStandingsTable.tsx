import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeagueTeam } from "@/hooks/useLeagueDashboardData";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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

  // Filter out eliminated teams and sort by points
  const activeTeams = [...teams]
    .filter(team => !team.eliminated)
    .sort((a, b) => {
      // Sort by points (descending)
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      // If points are equal, sort by name for consistent ordering
      return a.name.localeCompare(b.name);
    })
    .map((team, index) => ({ ...team, rank: index + 1 }));

  const currentWeek = Math.max(1, 1); // This should come from actual week data

  // Find team in last place among active teams
  const lastPlaceTeam = activeTeams.length > 0 ? activeTeams[activeTeams.length - 1] : null;

  return (
    <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-nfl-light-gray/20 hover:bg-transparent">
            <TableHead className="text-gray-400 font-semibold w-16 text-center">Rank</TableHead>
            <TableHead className="text-gray-400 font-semibold">Team</TableHead>
            <TableHead className="text-gray-400 font-semibold">Owner</TableHead>
            <TableHead className="text-gray-400 font-semibold text-right">Total Points</TableHead>
            <TableHead className="text-gray-400 font-semibold text-right">Avg/Week</TableHead>
            <TableHead className="text-gray-400 font-semibold text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeTeams.map((team) => {
            const isUserTeam = team.owner_id === user?.id;
            const avgPoints = (team.points / currentWeek).toFixed(1);
            const isInDanger = lastPlaceTeam && team.id === lastPlaceTeam.id;

            return (
              <TableRow
                key={team.id}
                className={cn(
                  "border-nfl-light-gray/20 transition-colors",
                  isUserTeam && "bg-nfl-blue/10 hover:bg-nfl-blue/15",
                  isInDanger && "bg-orange-500/10 hover:bg-orange-500/15",
                  !isUserTeam && !isInDanger && "hover:bg-nfl-light-gray/10"
                )}
              >
                {/* Rank */}
                <TableCell className="text-center font-bold">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center mx-auto font-bold text-sm",
                    team.rank === 1 && "bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900",
                    team.rank === 2 && "bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900",
                    team.rank === 3 && "bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100",
                    team.rank > 3 && "bg-nfl-light-gray/30 text-white"
                  )}>
                    {team.rank}
                  </div>
                </TableCell>

                {/* Team Name */}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">{team.name}</span>
                    {isUserTeam && (
                      <Badge variant="outline" className="text-xs border-nfl-blue text-nfl-blue w-fit mt-1">
                        YOUR TEAM
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Owner */}
                <TableCell className="text-gray-300">
                  {team.owner}
                </TableCell>

                {/* Total Points */}
                <TableCell className="text-right font-bold text-white">
                  {team.points.toFixed(1)}
                </TableCell>

                {/* Average Points */}
                <TableCell className="text-right font-semibold text-gray-300">
                  {avgPoints}
                </TableCell>

                {/* Status */}
                <TableCell className="text-center">
                  <Badge
                    variant={isInDanger ? "warning" : "default"}
                    className={cn(
                      isInDanger && "bg-orange-500/20 text-orange-500 border-orange-500/30",
                      !isInDanger && "bg-nfl-green/20 text-nfl-green border-nfl-green/30"
                    )}
                  >
                    {isInDanger ? 'In Danger' : 'Safe'}
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