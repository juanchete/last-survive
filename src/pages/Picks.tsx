
import { LeagueNav } from "@/components/LeagueNav";
import { Layout } from "@/components/Layout";
import { useLocation } from "react-router-dom";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Picks() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const leagueId = queryParams.get("league") as string;
  
  const { data: currentWeek } = useCurrentWeek(leagueId);
  const { data: userTeam, isLoading: teamLoading } = useUserFantasyTeam(leagueId);
  const { data: roster = [], isLoading: rosterLoading } = useRosterWithPlayerDetails(
    userTeam?.id || "", 
    currentWeek || 1
  );

  const isLoading = teamLoading || rosterLoading;

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-amber-600";
    return "text-white";
  };

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      QB: "bg-nfl-blue",
      RB: "bg-nfl-green", 
      WR: "bg-nfl-yellow",
      TE: "bg-nfl-accent",
      K: "bg-nfl-lightblue",
      DEF: "bg-nfl-red"
    };
    return colors[position] || "bg-gray-500";
  };

  return (
    <Layout>
      <LeagueNav leagueId={leagueId} />
      
      <div className="container mx-auto py-10">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-nfl-blue to-nfl-lightblue rounded-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Team</h1>
          <p className="text-white/80">View your current roster and player performance</p>
        </div>

        {isLoading ? (
          <p className="text-gray-400">Loading your team...</p>
        ) : userTeam ? (
          <div className="space-y-6">
            {/* Team Summary Card */}
            <Card className="overflow-hidden bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader className="bg-nfl-dark-gray pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRankColor(userTeam.rank)} bg-nfl-darker`}>
                      {userTeam.rank <= 3 ? <Trophy className="w-5 h-5" /> : userTeam.rank}
                    </div>
                    <div>
                      <h2 className="text-xl">{userTeam.name}</h2>
                      <p className="text-sm text-gray-400">Week {currentWeek || 1}</p>
                    </div>
                  </CardTitle>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-transparent flex items-center gap-1 mb-2">
                      <User className="w-3 h-3" />
                      <span>{userTeam.owner}</span>
                    </Badge>
                    <div className="text-2xl font-bold text-nfl-blue">{userTeam.points} PTS</div>
                    <div className="text-sm text-gray-400">Rank #{userTeam.rank}</div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Roster Table */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white">
                  Current Roster ({roster.length} players)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {roster.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-nfl-light-gray/20 hover:bg-nfl-dark-gray/50">
                        <TableHead className="text-gray-300">Player</TableHead>
                        <TableHead className="text-gray-300">Position</TableHead>
                        <TableHead className="text-gray-300">Team</TableHead>
                        <TableHead className="text-gray-300">Points</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roster.map((player) => (
                        <TableRow 
                          key={player.player_id} 
                          className="border-nfl-light-gray/20 hover:bg-nfl-dark-gray/30"
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              {player.photo && (
                                <img 
                                  src={player.photo} 
                                  alt={player.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              )}
                              <div>
                                <div className="font-medium text-white">{player.name || 'Unknown Player'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getPositionColor(player.position || 'N/A')} text-white`}>
                              {player.position || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {player.team || 'N/A'}
                          </TableCell>
                          <TableCell className="text-nfl-blue font-bold">
                            {player.points || 0} PTS
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={player.is_active ? "default" : "secondary"}
                              className={player.is_active ? "bg-green-600" : "bg-gray-600"}
                            >
                              {player.is_active ? "Starting" : "Bench"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <h3 className="text-lg font-medium">No Players Yet</h3>
                      <p>You haven't drafted any players for this week.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {userTeam.eliminated && (
              <Card className="bg-red-900/20 border-red-500/30">
                <CardContent className="p-6 text-center">
                  <Badge variant="destructive" className="text-lg px-4 py-2">
                    Team Eliminated
                  </Badge>
                  <p className="text-gray-400 mt-2">
                    Your team has been eliminated from the league.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="bg-nfl-gray border-nfl-light-gray/20">
            <CardContent className="p-8 text-center">
              <div className="text-gray-400">
                <h3 className="text-lg font-medium mb-2">No Team Found</h3>
                <p>You are not part of any team in this league.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
