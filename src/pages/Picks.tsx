
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { LeagueNav } from "@/components/LeagueNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clipboard, Users } from "lucide-react";

export default function Picks() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "";
  
  // Get user's fantasy team
  const { data: userTeam, isLoading: loadingTeam } = useUserFantasyTeam(leagueId);
  
  // Get current week
  const { data: weekData } = useCurrentWeek(leagueId);
  const currentWeek = weekData?.number || 1;
  
  // State for selected week
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);
  
  // Get roster with player details for selected week
  const { data: rosterWithDetails = [], isLoading: loadingRoster } = useRosterWithPlayerDetails(userTeam?.id || "", selectedWeek);

  // Map of position codes to readable names
  const positionNames: Record<string, string> = {
    QB: "Quarterback",
    RB: "Running Back",
    WR: "Wide Receiver",
    TE: "Tight End",
    K: "Kicker",
    DEF: "Defense",
    FLEX: "Flex",
    BENCH: "Bench"
  };
  
  // Group players by position/slot
  const playersBySlot = rosterWithDetails.reduce((acc: Record<string, any[]>, rosterItem) => {
    if (!acc[rosterItem.slot]) {
      acc[rosterItem.slot] = [];
    }
    acc[rosterItem.slot].push(rosterItem);
    return acc;
  }, {});

  // Generate array of weeks to select from
  const weeks = Array.from({ length: currentWeek }, (_, i) => i + 1);
  
  // Helper function to get position badge color
  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      QB: "bg-nfl-blue",
      RB: "bg-nfl-green",
      WR: "bg-nfl-yellow text-black",
      TE: "bg-nfl-accent",
      K: "bg-nfl-lightblue",
      DEF: "bg-nfl-red",
      FLEX: "bg-purple-500",
      BENCH: "bg-transparent border-nfl-light-gray"
    };
    
    return colors[position] || "bg-gray-500";
  };

  return (
    <Layout>
      {leagueId && <LeagueNav leagueId={leagueId} />}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clipboard className="w-6 h-6 text-nfl-blue" />
              My Picks
            </h1>
            
            {userTeam && (
              <Badge variant="outline" className="text-sm">
                Team: {userTeam.name}
              </Badge>
            )}
          </div>

          {/* Week selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Select Week:</span>
            <Select 
              value={selectedWeek.toString()} 
              onValueChange={(value) => setSelectedWeek(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Week" />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((week) => (
                  <SelectItem key={week} value={week.toString()}>
                    Week {week} {week === currentWeek && "(Current)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs for different views */}
          <Tabs defaultValue="roster">
            <TabsList className="bg-nfl-gray border border-nfl-light-gray/20 mb-4">
              <TabsTrigger value="roster" className="data-[state=active]:bg-nfl-blue data-[state=active]:text-white">
                Roster
              </TabsTrigger>
              <TabsTrigger value="stats" className="data-[state=active]:bg-nfl-blue data-[state=active]:text-white">
                Player Stats
              </TabsTrigger>
            </TabsList>
            
            {/* Roster View */}
            <TabsContent value="roster">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Starters */}
                <Card className="bg-nfl-gray border-nfl-light-gray/20">
                  <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-nfl-blue" />
                      <span>Starting Lineup</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {loadingRoster || loadingTeam ? (
                      <div className="text-center py-4 text-gray-400">Loading roster...</div>
                    ) : rosterWithDetails.filter(item => item.slot !== "BENCH").length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-nfl-light-gray/20">
                            <TableHead className="text-gray-400">Position</TableHead>
                            <TableHead className="text-gray-400">Player</TableHead>
                            <TableHead className="text-gray-400">Team</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(playersBySlot)
                            .filter(([slot]) => slot !== "BENCH")
                            .map(([slot, players]) => (
                              players.map((rosterItem, index) => (
                                <TableRow key={`${slot}-${index}`} className="border-nfl-light-gray/20">
                                  <TableCell>
                                    <Badge className={getPositionColor(slot)}>
                                      {slot}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {rosterItem.player?.name || `Player #${rosterItem.player_id}`}
                                  </TableCell>
                                  <TableCell>
                                    {rosterItem.player?.nfl_team?.abbreviation || "N/A"}
                                  </TableCell>
                                </TableRow>
                              ))
                            ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-4 text-gray-400">
                        No players in your starting lineup for Week {selectedWeek}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Bench */}
                <Card className="bg-nfl-gray border-nfl-light-gray/20">
                  <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
                    <CardTitle className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center text-nfl-blue">B</span>
                      <span>Bench</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {loadingRoster || loadingTeam ? (
                      <div className="text-center py-4 text-gray-400">Loading bench...</div>
                    ) : playersBySlot["BENCH"] && playersBySlot["BENCH"].length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-nfl-light-gray/20">
                            <TableHead className="text-gray-400">Position</TableHead>
                            <TableHead className="text-gray-400">Player</TableHead>
                            <TableHead className="text-gray-400">Team</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {playersBySlot["BENCH"]?.map((rosterItem, index) => (
                            <TableRow key={`bench-${index}`} className="border-nfl-light-gray/20">
                              <TableCell>
                                <Badge variant="outline" className="bg-transparent border-nfl-light-gray">
                                  BENCH
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {rosterItem.player?.name || `Player #${rosterItem.player_id}`}
                              </TableCell>
                              <TableCell>
                                {rosterItem.player?.nfl_team?.abbreviation || "N/A"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-4 text-gray-400">
                        No players on your bench for Week {selectedWeek}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Stats View */}
            <TabsContent value="stats">
              <Card className="bg-nfl-gray border-nfl-light-gray/20">
                <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
                  <CardTitle>Player Statistics - Week {selectedWeek}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {loadingRoster || loadingTeam ? (
                    <div className="text-center py-4 text-gray-400">Loading statistics...</div>
                  ) : rosterWithDetails.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-nfl-light-gray/20">
                          <TableHead className="text-gray-400">Player</TableHead>
                          <TableHead className="text-gray-400">Position</TableHead>
                          <TableHead className="text-gray-400">Points</TableHead>
                          <TableHead className="text-gray-400">Stats</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rosterWithDetails.map((rosterItem, index) => (
                          <TableRow key={index} className="border-nfl-light-gray/20">
                            <TableCell className="font-medium">
                              {rosterItem.player?.name || `Player #${rosterItem.player_id}`}
                              <div className="text-xs text-gray-400">
                                {rosterItem.player?.nfl_team?.abbreviation || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getPositionColor(rosterItem.slot)}>
                                {rosterItem.slot}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold">
                              {rosterItem.stats?.fantasy_points || "--"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {rosterItem.stats ? (
                                <div className="space-y-1">
                                  {rosterItem.stats.passing_yards ? (
                                    <div>Pass: {rosterItem.stats.passing_yards} yds, {rosterItem.stats.passing_td || 0} TD</div>
                                  ) : null}
                                  {rosterItem.stats.rushing_yards ? (
                                    <div>Rush: {rosterItem.stats.rushing_yards} yds, {rosterItem.stats.rushing_td || 0} TD</div>
                                  ) : null}
                                  {rosterItem.stats.receiving_yards ? (
                                    <div>Rec: {rosterItem.stats.receiving_yards} yds, {rosterItem.stats.receiving_td || 0} TD</div>
                                  ) : null}
                                  {rosterItem.stats.field_goals ? (
                                    <div>FG: {rosterItem.stats.field_goals}</div>
                                  ) : null}
                                  {rosterItem.stats.tackles ? (
                                    <div>Def: {rosterItem.stats.tackles} tackles, {rosterItem.stats.sacks || 0} sacks, {rosterItem.stats.interceptions || 0} INT</div>
                                  ) : null}
                                </div>
                              ) : (
                                "No stats available"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      No player statistics available for Week {selectedWeek}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
