import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useLocation } from "react-router-dom";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Trophy, Timer, UserPlus, Shield, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { useWaiverPriority } from "@/hooks/useWaiverPriority";
import { useMyWaiverRequests } from "@/hooks/useMyWaiverRequests";
import { useWaiverDeadline } from "@/hooks/useWaiverDeadline";
import { useTeamWeeklyPoints } from "@/hooks/useTeamWeeklyPoints";
import { useWaiverPlayers } from "@/hooks/useWaiverPlayers";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { useWaiverHistory } from "@/hooks/useWaiverHistory";
import { WaiverPlayerCard } from "@/components/WaiverPlayerCard";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WaiverPriority {
  priority: number;
  team_id: string;
  team_name: string;
  owner_name: string;
  weekly_points: number;
  projected_points: number;
  available_player?: {
    name: string;
    position: string;
    team: string;
    status?: string;
  };
}

export default function Waivers() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "";
  const { user } = useAuth();
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [selectedDropPlayer, setSelectedDropPlayer] = useState<string>("");
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("ALL");

  const { data: teams = [] } = useFantasyTeams(leagueId);
  const { data: userTeam } = useUserFantasyTeam(leagueId);
  const queryClient = useQueryClient();

  // Get current week
  const { data: currentWeek } = useQuery({
    queryKey: ["currentWeek", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weeks")
        .select("number")
        .eq("league_id", leagueId)
        .eq("status", "active")
        .single();
      
      if (error) return { number: 1 };
      return data;
    },
    enabled: !!leagueId,
  });

  const weekNumber = currentWeek?.number || 1;

  // Get waiver priority data
  const { data: waiverPriorityData = [] } = useWaiverPriority(leagueId, weekNumber);

  // Get user's waiver requests
  const { data: myWaiverRequests = [] } = useMyWaiverRequests(
    leagueId,
    weekNumber,
    userTeam?.id || ""
  );

  // Get waiver deadline info
  const { data: waiverDeadline } = useWaiverDeadline(leagueId);

  // Get team weekly points
  const { data: teamWeeklyPoints = [] } = useTeamWeeklyPoints(leagueId, weekNumber);

  // Get available players on waivers
  const { data: waiverPlayers = [] } = useWaiverPlayers(leagueId, weekNumber);

  // Get user's current roster
  const { data: userRoster = [] } = useRosterWithPlayerDetails(userTeam?.id || "", weekNumber);

  // Get waiver history
  const { data: waiverHistory = [] } = useWaiverHistory(leagueId);

  // Filter and sort waiver players
  const filteredWaiverPlayers = waiverPlayers.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
                         player.team.toLowerCase().includes(playerSearch.toLowerCase());
    const matchesPosition = positionFilter === "ALL" || player.position === positionFilter;
    return matchesSearch && matchesPosition;
  }).sort((a, b) => (b.points || 0) - (a.points || 0));

  // Get top available players sorted by points
  const topAvailablePlayers = [...waiverPlayers]
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 5);

  // Combine all data to create waiver priority display
  const waiverPriorities: WaiverPriority[] = waiverPriorityData
    .map(wp => {
      const team = teams.find(t => t.id === wp.fantasy_team_id);
      const weeklyPoints = teamWeeklyPoints.find(twp => twp.fantasy_team_id === wp.fantasy_team_id);
      
      if (!team) return null;

      return {
        priority: wp.priority,
        team_id: wp.fantasy_team_id,
        team_name: team.name,
        owner_name: team.owner,
        weekly_points: weeklyPoints?.total_points || 0,
        projected_points: weeklyPoints?.projected_points || 0,
        available_player: undefined // Will be populated when we integrate waiver players
      };
    })
    .filter(Boolean) as WaiverPriority[];

  // If no waiver priority data exists, fall back to sorting by points
  const displayPriorities = waiverPriorities.length > 0 
    ? waiverPriorities 
    : teams
        .sort((a, b) => a.points - b.points) // Lower points = higher priority
        .map((team, index) => {
          const weeklyPoints = teamWeeklyPoints.find(twp => twp.fantasy_team_id === team.id);
          
          return {
            priority: index + 1,
            team_id: team.id,
            team_name: team.name,
            owner_name: team.owner,
            weekly_points: weeklyPoints?.total_points || 0,
            projected_points: weeklyPoints?.projected_points || 0,
            available_player: undefined
          };
        });

  const handleClaim = async () => {
    if (!selectedPlayer || !userTeam) {
      toast({
        title: "Error",
        description: "Please select a player to claim",
        variant: "destructive",
      });
      return;
    }

    try {
      // Submit waiver request
      const { error } = await supabase
        .from("waiver_requests")
        .insert({
          league_id: leagueId,
          fantasy_team_id: userTeam.id,
          player_id: selectedPlayer,
          drop_player_id: selectedDropPlayer || null,
          week: weekNumber,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Waiver Claim Submitted",
        description: "Your waiver claim has been submitted and will be processed at the deadline.",
      });

      setIsClaimModalOpen(false);
      setSelectedPlayer("");
      setSelectedDropPlayer("");

      // Invalidate queries to refresh the waiver requests
      await queryClient.invalidateQueries({ 
        queryKey: ["myWaiverRequests", leagueId, weekNumber, userTeam.id] 
      });
      
      // Also invalidate waiver history
      await queryClient.invalidateQueries({ 
        queryKey: ["waiverHistory", leagueId] 
      });
    } catch (error) {
      console.error("Error submitting waiver claim:", error);
      toast({
        title: "Error",
        description: "Failed to submit waiver claim. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-nfl-dark-gray">
        {/* League Header */}
        <LeagueHeader leagueId={leagueId} />

        {/* League Navigation Tabs */}
        <LeagueTabs leagueId={leagueId} activeTab="waivers" />

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Trophy}
              iconColor="text-yellow-400"
              label="Your Priority"
              value={`#${displayPriorities.findIndex(p => p.team_id === userTeam?.id) + 1 || '-'}`}
              subValue={userTeam ? "Based on weekly points" : "Join league"}
            />
            <StatCard
              icon={UserPlus}
              iconColor="text-nfl-green"
              label="Active Claims"
              value={myWaiverRequests.length.toString()}
              subValue="Pending waivers"
            />
            <StatCard
              icon={Timer}
              iconColor="text-nfl-blue"
              label="Process Time"
              value={waiverDeadline ? new Date(waiverDeadline.deadline).toLocaleDateString('en-US', { weekday: 'long' }) : "Tuesday"}
              subValue={waiverDeadline ? new Date(waiverDeadline.deadline).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', timeZoneName: 'short' }) : "9:00 AM ET"}
            />
            <StatCard
              icon={Shield}
              iconColor="text-purple-400"
              label="Time Remaining"
              value={waiverDeadline && !waiverDeadline.deadline_passed ? 
                `${Math.floor(waiverDeadline.time_remaining / 3600)}h ${Math.floor((waiverDeadline.time_remaining % 3600) / 60)}m` 
                : "Expired"}
              subValue={waiverDeadline?.deadline_passed ? "Processing soon" : "Until deadline"}
            />
          </div>

          <SectionHeader
            title="Waiver Wire Priority"
            subtitle="Waiver priority is based on inverse order of weekly standings. Teams with lower points have higher priority."
            action={
              <div className="flex gap-2">
                <Dialog open={isClaimModalOpen} onOpenChange={(open) => {
                  setIsClaimModalOpen(open);
                  if (!open) {
                    setPlayerSearch("");
                    setPositionFilter("ALL");
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-nfl-accent hover:bg-nfl-accent/90 text-black">
                      <Plus className="w-4 h-4 mr-2" />
                      Claim Player
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-nfl-gray border-nfl-light-gray/20 max-w-3xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle className="text-white">Submit Waiver Claim</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Select a player to claim from waivers. You may need to drop a player if your roster is full.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                          Player to Claim
                        </label>
                        
                        {/* Search and Filters */}
                        <div className="space-y-3 mb-4">
                          <Input
                            placeholder="Search players..."
                            value={playerSearch}
                            onChange={(e) => setPlayerSearch(e.target.value)}
                            className="bg-nfl-dark-gray border-nfl-light-gray/20 text-white"
                          />
                          <div className="flex gap-2 flex-wrap">
                            {["ALL", "QB", "RB", "WR", "TE", "K", "DEF"].map((pos) => (
                              <Button
                                key={pos}
                                size="sm"
                                variant={positionFilter === pos ? "default" : "outline"}
                                onClick={() => setPositionFilter(pos)}
                                className={positionFilter === pos 
                                  ? "bg-nfl-blue hover:bg-nfl-blue/90" 
                                  : "border-nfl-light-gray/20 text-gray-300 hover:bg-nfl-light-gray/10"
                                }
                              >
                                {pos}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Player List */}
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-2">
                            {filteredWaiverPlayers.length === 0 ? (
                              <div className="text-center py-8 text-gray-400">
                                No players found matching your criteria
                              </div>
                            ) : (
                              filteredWaiverPlayers.map((player) => (
                                <WaiverPlayerCard
                                  key={player.id}
                                  player={player}
                                  isSelected={selectedPlayer === player.id}
                                  onSelect={setSelectedPlayer}
                                  matchup={`vs ${["KC", "BUF", "SF", "DAL", "GB"][Math.floor(Math.random() * 5)]}`}
                                  status={
                                    Math.random() > 0.8 ? "questionable" :
                                    Math.random() > 0.95 ? "out" :
                                    "healthy"
                                  }
                                />
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>

                      {userRoster.length >= 15 && (
                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-2 block">
                            Player to Drop (Optional)
                          </label>
                          <Select value={selectedDropPlayer} onValueChange={setSelectedDropPlayer}>
                            <SelectTrigger className="bg-nfl-dark-gray border-nfl-light-gray/20 text-white">
                              <SelectValue placeholder="Select a player to drop" />
                            </SelectTrigger>
                            <SelectContent className="bg-nfl-dark-gray border-nfl-light-gray/20">
                              {userRoster.map((player) => (
                                <SelectItem key={player.id} value={player.id} className="text-white hover:bg-nfl-light-gray/20">
                                  <div className="flex items-center justify-between w-full">
                                    <span>{player.name}</span>
                                    <div className="flex items-center gap-2 ml-4">
                                      <Badge variant="outline" className="text-xs">
                                        {player.position}
                                      </Badge>
                                      <span className="text-gray-400 text-sm">{player.team}</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 mt-6">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsClaimModalOpen(false)}
                          className="border-nfl-light-gray/20 text-gray-300 hover:bg-nfl-light-gray/10"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleClaim}
                          className="bg-nfl-accent hover:bg-nfl-accent/90 text-black"
                          disabled={!selectedPlayer}
                        >
                          Submit Claim
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="outline" 
                  className="border-nfl-blue text-nfl-blue hover:bg-nfl-blue/10"
                  onClick={() => setIsHistoryModalOpen(true)}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  View Waiver History
                </Button>
              </div>
            }
          />
          
          {/* Waiver Priority Table */}
          <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-nfl-light-gray/20 hover:bg-transparent">
                  <TableHead className="text-gray-400 font-medium w-20">Priority</TableHead>
                  <TableHead className="text-gray-400 font-medium">Team</TableHead>
                  <TableHead className="text-gray-400 font-medium">Owner</TableHead>
                  <TableHead className="text-gray-400 font-medium text-center">Weekly PTS | Projected</TableHead>
                  <TableHead className="text-gray-400 font-medium">Top Available Player</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayPriorities.map((priority, index) => {
                  const isUserTeam = priority.team_id === userTeam?.id;
                  const isTopThree = index < 3;
                  
                  return (
                    <TableRow 
                      key={priority.team_id} 
                      className={`border-nfl-light-gray/20 hover:bg-nfl-light-gray/10 transition-colors ${
                        isUserTeam ? 'bg-nfl-blue/5' : ''
                      }`}
                    >
                      <TableCell className="text-center">
                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                          isTopThree ? 'bg-nfl-green/20 text-nfl-green border border-nfl-green/30' : 'bg-gray-800 text-gray-400'
                        } font-bold`}>
                          {priority.priority}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-white">{priority.team_name}</span>
                          {isUserTeam && (
                            <Badge 
                              variant="outline" 
                              className="text-xs border-nfl-blue text-nfl-blue bg-nfl-blue/10"
                            >
                              YOU
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {priority.owner_name}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-white font-medium">{priority.weekly_points.toFixed(1)}</span>
                        <span className="text-gray-400"> | {priority.projected_points.toFixed(1)}</span>
                      </TableCell>
                      <TableCell>
                        {topAvailablePlayers[index] ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">
                              {topAvailablePlayers[index].name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {topAvailablePlayers[index].position}
                            </Badge>
                            <span className="text-gray-400 text-sm">
                              | {topAvailablePlayers[index].team}
                            </span>
                            <span className="text-gray-400 text-sm">
                              ({topAvailablePlayers[index].points?.toFixed(1) || '0.0'} pts)
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* My Active Waiver Claims */}
          {myWaiverRequests.length > 0 && userTeam && (
            <div className="mt-8">
              <SectionHeader
                title="My Active Waiver Claims"
                subtitle="These claims will be processed in priority order at the deadline"
              />
              <Card className="bg-nfl-gray border-nfl-light-gray/20">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {myWaiverRequests.map((request, index) => {
                      const claimPlayer = waiverPlayers.find(p => p.id === request.player_id.toString());
                      const dropPlayer = userRoster.find(r => parseInt(r.id) === request.drop_player_id);
                      
                      return (
                        <div key={request.id} className="flex items-center justify-between p-3 bg-nfl-dark-gray/50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white">
                                  Claim: {claimPlayer?.name || 'Unknown Player'}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {claimPlayer?.position}
                                </Badge>
                              </div>
                              {request.drop_player_id && (
                                <div className="text-sm text-gray-400 mt-1">
                                  Drop: {dropPlayer?.name || 'Unknown Player'}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge className={`${
                            request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                            request.status === 'approved' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                            'bg-red-500/20 text-red-300 border-red-500/30'
                          }`}>
                            {request.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Waiver Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Waiver Strategy Tips
                </h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-nfl-green mt-0.5">•</span>
                    <span>Higher priority teams should target impact players</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-nfl-green mt-0.5">•</span>
                    <span>Consider saving priority for emergencies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-nfl-green mt-0.5">•</span>
                    <span>Check injury reports before claiming</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Timer className="w-5 h-5 text-nfl-blue" />
                  Processing Schedule
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Claim Period Ends</span>
                    <span className="text-white font-medium">
                      {waiverDeadline ? 
                        new Date(waiverDeadline.deadline).toLocaleString('en-US', { 
                          weekday: 'long', 
                          hour: 'numeric', 
                          minute: 'numeric',
                          timeZoneName: 'short'
                        }) 
                        : "Tuesday 3:00 AM ET"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Processing Day</span>
                    <span className="text-white font-medium">
                      {waiverDeadline ? 
                        ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][waiverDeadline.deadline_day]
                        : "Tuesday"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Status</span>
                    <span className={`font-medium ${waiverDeadline?.deadline_passed ? 'text-yellow-400' : 'text-nfl-green'}`}>
                      {waiverDeadline?.deadline_passed ? 'Processing Soon' : 'Accepting Claims'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Waiver History Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="bg-nfl-gray border-nfl-light-gray/20 max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-white">Waiver History</DialogTitle>
            <DialogDescription className="text-gray-400">
              Recent waiver transactions in your league
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] mt-4">
            <Table>
              <TableHeader>
                <TableRow className="border-nfl-light-gray/20">
                  <TableHead className="text-gray-400">Date</TableHead>
                  <TableHead className="text-gray-400">Week</TableHead>
                  <TableHead className="text-gray-400">Team</TableHead>
                  <TableHead className="text-gray-400">Transaction</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waiverHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                      No waiver history found
                    </TableCell>
                  </TableRow>
                ) : (
                  waiverHistory.map((item) => (
                    <TableRow key={item.id} className="border-nfl-light-gray/20">
                      <TableCell className="text-gray-300">
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        Week {item.week}
                      </TableCell>
                      <TableCell className="text-white">
                        {item.fantasy_team?.name}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-green-400">+</span>
                            <span className="text-white">{item.player?.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.player?.position}
                            </Badge>
                          </div>
                          {item.drop_player && (
                            <div className="flex items-center gap-2">
                              <span className="text-red-400">-</span>
                              <span className="text-gray-400">{item.drop_player.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {item.drop_player.position}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${
                          item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                          item.status === 'approved' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                          'bg-red-500/20 text-red-300 border-red-500/30'
                        }`}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}