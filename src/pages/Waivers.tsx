import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useLocation } from "react-router-dom";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Trophy, Timer, UserPlus, Shield, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DraftPlayerList } from "@/components/DraftPlayerList";
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
import { useWaiverPlayers } from "@/hooks/useWaiverPlayers";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { useWaiverHistory } from "@/hooks/useWaiverHistory";
import { WaiverPlayerCard } from "@/components/WaiverPlayerCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WaiverStatusBadge, WaiverPriorityList } from "@/components/WaiverStatusBadge";
import { useWaiverStatus } from "@/hooks/useWaiverStatus";
import { useWeeklyPoints } from "@/hooks/useWeeklyPoints";

interface IWaiverPriority {
  priority: number;
  team_id: string;
  team_name: string;
  owner_name: string;
  weekly_points: number;
  projected_points: number;
  isInDanger?: boolean;
}

export default function Waivers() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "";
  const { user } = useAuth();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>("");
  const [selectedDropPlayer, setSelectedDropPlayer] = useState<string>("");
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

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

  // Get waiver status (period and requests)
  const { data: waiverStatus } = useWaiverStatus(leagueId);
  const isWaiverPeriod = waiverStatus?.is_waiver_period || false;
  const isFreeAgency = waiverStatus?.is_free_agency || false;

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

  // Get team weekly points for waiver priority
  const { weeklyStandings } = useWeeklyPoints(leagueId);

  // Get available players on waivers
  const { data: waiverPlayers = [] } = useWaiverPlayers(leagueId, weekNumber);

  // Define the slot order for consistent display
  const slotOrder = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'DP'];

  // Get user's current roster with slot information
  const { data: userRosterData = [] } = useRosterWithPlayerDetails(userTeam?.id || "", weekNumber);

  // Sort roster by slot order
  const userRoster = [...userRosterData].sort((a, b) => {
    const aSlot = a.slot || a.position;
    const bSlot = b.slot || b.position;
    const aIndex = slotOrder.indexOf(aSlot);
    const bIndex = slotOrder.indexOf(bSlot);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return aSlot.localeCompare(bSlot);
  });

  // Get waiver history
  const { data: waiverHistory = [] } = useWaiverHistory(leagueId);

  // Filter only alive teams (not eliminated)
  const aliveTeams = teams.filter(team => !team.eliminated);

  // Combine all data to create waiver priority display
  const waiverPriorities: IWaiverPriority[] = waiverPriorityData
    .map(wp => {
      const team = aliveTeams.find(t => t.id === wp.fantasy_team_id);
      const weeklyData = weeklyStandings?.find(ws => ws.id === wp.fantasy_team_id);

      if (!team) return null;

      return {
        priority: wp.priority,
        team_id: wp.fantasy_team_id,
        team_name: team.name,
        owner_name: team.owner,
        weekly_points: parseFloat(weeklyData?.weekly_points || '0'),
        projected_points: 0
      };
    })
    .filter(Boolean) as IWaiverPriority[];

  // If no waiver priority data exists, fall back to sorting by weekly points
  const basePriorities = waiverPriorities.length > 0
    ? waiverPriorities
    : aliveTeams
        .map(team => {
          const weeklyData = weeklyStandings?.find(ws => ws.id === team.id);
          return {
            team,
            weeklyPoints: parseFloat(weeklyData?.weekly_points || '0')
          };
        })
        .sort((a, b) => a.weeklyPoints - b.weeklyPoints)
        .map((item, index) => {
          return {
            priority: index + 1,
            team_id: item.team.id,
            team_name: item.team.name,
            owner_name: item.team.owner,
            weekly_points: item.weeklyPoints,
            projected_points: 0,
            available_player: undefined
          };
        });

  // Sort by priority and adjust: first team (lowest points) is #1 in danger, rest get -1 priority
  const sortedByPriority = [...basePriorities].sort((a, b) => a.priority - b.priority);
  const displayPriorities = sortedByPriority.map((item, index) => ({
    ...item,
    priority: index === 0 ? 1 : item.priority - 1, // First stays as #1, rest subtract 1
    isInDanger: index === 0 // Mark first team as in danger
  }));

  const handlePlayerClick = (playerId: number | string, playerName?: string) => {
    setSelectedPlayer(String(playerId));
    setSelectedPlayerName(playerName || "");
    setShowClaimDialog(true);
  };

  const handleClaim = async () => {
    if (!selectedPlayer || !userTeam) {
      toast({
        title: "Error",
        description: "Por favor selecciona un jugador",
        variant: "destructive",
      });
      return;
    }

    // Validate roster size
    const currentRosterSize = userRoster.length;
    const finalSize = currentRosterSize - (selectedDropPlayer ? 1 : 0) + 1;
    
    if (currentRosterSize >= 10 && !selectedDropPlayer) {
      toast({
        title: "Error",
        description: "Tu roster está lleno. Debes soltar un jugador primero.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if we're in free agency period
      if (isFreeAgency && !isWaiverPeriod) {
        // FREE AGENCY: Process immediately using claim_free_agent
        const { data, error } = await supabase.rpc('claim_free_agent', {
          p_league_id: leagueId,
          p_fantasy_team_id: userTeam.id,
          p_player_id: parseInt(selectedPlayer),
          p_drop_player_id: selectedDropPlayer ? parseInt(selectedDropPlayer) : null,
          p_week: weekNumber
        });

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error || "Failed to claim free agent");
        }

        toast({
          title: "✅ Agente Libre Reclamado",
          description: "El jugador ha sido añadido a tu roster inmediatamente.",
        });

        // Refresh roster data
        await queryClient.invalidateQueries({
          queryKey: ["rosterWithDetails", userTeam.id, weekNumber]
        });
      } else {
        // WAIVER PERIOD: Use waiver request system
        const { data, error } = await supabase.rpc('create_waiver_request_multi', {
          p_league_id: leagueId,
          p_fantasy_team_id: userTeam.id,
          p_week: weekNumber,
          p_add_players: [parseInt(selectedPlayer)],
          p_drop_players: selectedDropPlayer ? [parseInt(selectedDropPlayer)] : []
        });

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error || "Failed to create waiver request");
        }

        toast({
          title: "Solicitud de Waiver Enviada",
          description: "Tu solicitud será procesada en el deadline.",
        });
      }

      setShowClaimDialog(false);
      setSelectedPlayer(null);
      setSelectedDropPlayer("");

      // Invalidate queries to refresh the waiver requests
      await queryClient.invalidateQueries({ 
        queryKey: ["myWaiverRequests", leagueId, weekNumber, userTeam.id] 
      });
      
      // Also invalidate waiver history
      await queryClient.invalidateQueries({ 
        queryKey: ["waiverHistory", leagueId] 
      });
      
      // Invalidate waiver status to refresh UI
      await queryClient.invalidateQueries({ 
        queryKey: ["waiverStatus", leagueId] 
      });
    } catch (error) {
      console.error("Error processing player claim:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process player claim. Please try again.",
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
          {/* Waiver Status Badge */}
          <div className="mb-6">
            <WaiverStatusBadge leagueId={leagueId} showDetails={true} />
          </div>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Trophy}
              iconColor="text-yellow-400"
              label="Your Priority"
              value={`#${displayPriorities.find(p => p.team_id === userTeam?.id)?.priority || '-'}`}
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

          {/* Available Players Section */}
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">
                {isFreeAgency ? 'Agentes Libres Disponibles' : 'Jugadores en Waivers'}
              </h2>
              <p className="text-sm text-gray-400">
                {isFreeAgency
                  ? 'Haz clic en un jugador para agregarlo inmediatamente a tu roster'
                  : 'Haz clic en un jugador para enviar una solicitud de waiver'}
              </p>
            </div>

            <DraftPlayerList
              leagueId={leagueId}
              week={weekNumber}
              onSelectPlayer={handlePlayerClick}
              config={{
                showADP: false,
                showSeasonPoints: false,
                showWeekPoints: true,
                buttonText: isFreeAgency ? 'Agregar' : 'Reclamar',
                buttonIcon: <UserPlus className="h-4 w-4" />,
                validateTurn: false,
                validateSlots: false,
                useExternalData: true,
                externalPlayers: waiverPlayers,
                externalTotalCount: waiverPlayers.length,
                externalTotalPages: Math.ceil(waiverPlayers.length / 25),
                externalIsLoading: false,
              }}
            />
          </div>

          {/* Drop Player Dialog */}
          <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
            <DialogContent className="bg-nfl-gray border-nfl-light-gray/20 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {isFreeAgency ? 'Agregar Agente Libre' : 'Reclamar Jugador'}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  {(() => {
                    const player = waiverPlayers.find(p => p.id === selectedPlayer);
                    if (!player) return null;

                    return (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-white font-medium text-lg">{player.name}</span>
                          <Badge variant="outline">{player.position}</Badge>
                        </div>
                        {userRoster.length < 10 ? (
                          <>
                            El jugador se agregará a tu banca (BENCH). Roster actual: {userRoster.length}/10 jugadores
                            <br />
                            <span className="text-nfl-accent">✓ Tienes {10 - userRoster.length} espacio{10 - userRoster.length !== 1 ? 's' : ''} disponible{10 - userRoster.length !== 1 ? 's' : ''}</span>
                          </>
                        ) : (
                          <>
                            Tu roster está lleno ({userRoster.length}/10). Debes liberar un jugador primero.
                            <br />
                            <span className="text-red-400">⚠️ Roster completo - selecciona un jugador para soltar</span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </DialogDescription>
              </DialogHeader>

              {userRoster.length >= 10 && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Soltar Jugador (Requerido)
                  </label>
                  <Select value={selectedDropPlayer} onValueChange={setSelectedDropPlayer}>
                    <SelectTrigger className="bg-nfl-dark-gray border-nfl-light-gray/20 text-white">
                      <SelectValue placeholder="Selecciona un jugador para soltar" />
                    </SelectTrigger>
                    <SelectContent className="bg-nfl-gray border-nfl-light-gray/20">
                      {userRoster.map((player) => (
                        <SelectItem
                          key={player.id}
                          value={player.id}
                          className="text-white hover:bg-nfl-light-gray/10"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{player.name}</span>
                            <div className="flex items-center gap-2 ml-4">
                              <Badge variant="outline" className="text-xs">
                                {player.slot || player.position}
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
                  onClick={() => {
                    setShowClaimDialog(false);
                    setSelectedPlayer(null);
                    setSelectedDropPlayer("");
                  }}
                  className="border-nfl-light-gray/20 text-gray-300 hover:bg-nfl-light-gray/10"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleClaim}
                  disabled={userRoster.length >= 10 && !selectedDropPlayer}
                  className="bg-nfl-accent hover:bg-nfl-accent/90 text-black"
                >
                  {isFreeAgency ? 'Agregar Jugador' : 'Enviar Solicitud'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <SectionHeader
            title="Waiver Wire Priority"
            subtitle="Waiver priority is based on last week's performance. Only active teams are shown. Teams with fewer points from the previous week have higher priority."
            action={
              <Button
                variant="outline"
                className="border-nfl-blue text-nfl-blue hover:bg-nfl-blue/10"
                onClick={() => setIsHistoryModalOpen(true)}
              >
                <Clock className="w-4 h-4 mr-2" />
                Ver Historial de Waivers
              </Button>
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
                  <TableHead className="text-gray-400 font-medium text-center">Weekly Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayPriorities.map((priority, index) => {
                  const isUserTeam = priority.team_id === userTeam?.id;
                  const isInDanger = priority.isInDanger;
                  const isTopThree = index > 0 && index < 3; // Skip first (in danger) for green highlighting

                  return (
                    <TableRow
                      key={priority.team_id}
                      className={`border-nfl-light-gray/20 hover:bg-nfl-light-gray/10 transition-colors ${
                        isUserTeam ? 'bg-nfl-blue/5' : ''
                      }`}
                    >
                      <TableCell className="text-center">
                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                          isInDanger
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : isTopThree
                              ? 'bg-nfl-green/20 text-nfl-green border border-nfl-green/30'
                              : 'bg-gray-800 text-gray-400'
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
                        <span className="text-white font-medium text-lg">{priority.weekly_points.toFixed(1)}</span>
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
                      const claimPlayer = request.player_id ? waiverPlayers.find(p => p.id === request.player_id.toString()) : null;
                      const dropPlayer = request.drop_player_id ? userRoster.find(r => parseInt(r.id) === request.drop_player_id) : null;
                      
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