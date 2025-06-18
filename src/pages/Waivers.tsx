
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { LeagueNav } from "@/components/LeagueNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useWaiverPlayers } from "@/hooks/useWaiverPlayers";
import { useWaiverPriority } from "@/hooks/useWaiverPriority";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useMyWaiverRequests } from "@/hooks/useMyWaiverRequests";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { useRosterLimits } from "@/hooks/useRosterLimits";
import { requestWaiver } from "@/lib/draft";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Star, Trophy, UserPlus, Zap } from "lucide-react";
import { useLocation } from "react-router-dom";
import type { Player } from "@/types";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useIsLeagueOwner } from "@/hooks/useIsLeagueOwner";

// Import our new components
import { WaiverHeader } from "@/components/waivers/WaiverHeader";
import { WaiverFilters } from "@/components/waivers/WaiverFilters";
import { WaiverPlayersTable } from "@/components/waivers/WaiverPlayersTable";
import { WaiverSidebar } from "@/components/waivers/WaiverSidebar";
import { WaiverModals } from "@/components/waivers/WaiverModals";

const Waivers = () => {
  // Get leagueId from URL
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "default";
  const currentWeek = 1;

  // Data hooks
  const { data: userTeam } = useUserFantasyTeam(leagueId);
  const { data: waiverPlayers = [], isLoading: loadingPlayers } = useWaiverPlayers(leagueId, currentWeek);
  const { data: waiverPriority = [], isLoading: loadingPriority } = useWaiverPriority(leagueId, currentWeek);
  const { data: myWaiverRequests = [], isLoading: loadingRequests, refetch } = useMyWaiverRequests(leagueId, currentWeek, userTeam?.id || "");
  const { data: currentRoster = [], isLoading: loadingRoster } = useRosterWithPlayerDetails(userTeam?.id || "", currentWeek);

  // Form state
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");

  // Get player position for roster limits
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const selectedPlayer = waiverPlayers.find(p => p.id === selectedPlayerId);
  const { data: rosterLimits } = useRosterLimits(
    userTeam?.id || "",
    currentWeek,
    selectedPlayer?.position || ""
  );

  // Filter players based on search and position
  const filteredPlayers = waiverPlayers.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.team.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = positionFilter === "ALL" || player.position === positionFilter;
    return matchesSearch && matchesPosition;
  });

  // Filter active roster players for drop selection
  const activeRosterPlayers = currentRoster.filter(player => player.available !== undefined);

  // Trade state
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeTargetTeamId, setTradeTargetTeamId] = useState<string>("");
  const [tradeMyPlayerIds, setTradeMyPlayerIds] = useState<string[]>([]);
  const [tradeTargetPlayerIds, setTradeTargetPlayerIds] = useState<string[]>([]);
  const [tradeStep, setTradeStep] = useState<"select" | "confirm">("select");
  const [tradeLoading, setTradeLoading] = useState(false);

  // Get active teams (except own and eliminated)
  const { data: fantasyTeams = [] } = useFantasyTeams(leagueId);
  const activeTeams = fantasyTeams.filter(
    (team) => !team.eliminated && team.id !== userTeam?.id
  );

  // Get own roster and target team roster
  const { data: myRoster = [] } = useRosterWithPlayerDetails(userTeam?.id || "", currentWeek);
  const { data: targetRoster = [] } = useRosterWithPlayerDetails(tradeTargetTeamId, currentWeek);

  // Filter active players for trading
  const myActivePlayers = myRoster.filter((p) => p.available === false);
  const targetActivePlayers = targetRoster.filter((p) => p.available === false);

  // Reset target player selection if my player count changes
  useEffect(() => {
    if (tradeTargetPlayerIds.length > tradeMyPlayerIds.length) {
      setTradeTargetPlayerIds(tradeTargetPlayerIds.slice(0, tradeMyPlayerIds.length));
    }
  }, [tradeMyPlayerIds, tradeTargetPlayerIds.length]);

  // Waiver modal state
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);
  const [waiverPlayer, setWaiverPlayer] = useState<Player | null>(null);
  const [waiverDropPlayerId, setWaiverDropPlayerId] = useState<string>("");
  const [waiverLoading, setWaiverLoading] = useState(false);

  // Handler to open waiver modal
  const handleOpenWaiverModal = (player: Player) => {
    setWaiverPlayer(player);
    setWaiverDropPlayerId("");
    setWaiverModalOpen(true);
  };

  // Handler to confirm waiver request
  const handleConfirmWaiver = async () => {
    if (!waiverPlayer || !userTeam) return;
    if (rosterLimits?.needs_drop && !waiverDropPlayerId) return;
    setWaiverLoading(true);
    try {
      await requestWaiver({
        leagueId,
        week: currentWeek,
        fantasyTeamId: userTeam.id,
        playerId: Number(waiverPlayer.id),
        dropPlayerId: waiverDropPlayerId ? Number(waiverDropPlayerId) : undefined,
      });
      toast({ title: "Solicitud enviada", description: "Tu waiver fue registrada." });
      setWaiverModalOpen(false);
      setWaiverPlayer(null);
      setWaiverDropPlayerId("");
      refetch();
    } catch (e: unknown) {
      let message = "Unknown error";
      if (e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string") {
        message = (e as { message: string }).message;
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setWaiverLoading(false);
    }
  };

  // Handler to send trade
  const queryClient = useQueryClient();
  const handleSendTrade = async () => {
    if (!userTeam || !tradeTargetTeamId || tradeMyPlayerIds.length === 0 || tradeTargetPlayerIds.length !== tradeMyPlayerIds.length) return;
    setTradeLoading(true);
    try {
      // Create trade
      const { data: trade, error: tradeError } = await supabase
        .from("trades")
        .insert([
          {
            league_id: leagueId,
            proposer_team_id: userTeam.id,
            target_team_id: tradeTargetTeamId,
            status: "pending",
            week: currentWeek,
            season: 2024,
            notes: null,
          },
        ])
        .select()
        .single();
      if (tradeError || !trade) throw tradeError || new Error("No se pudo crear el trade");
      
      // Create trade items
      const items = [
        ...tradeMyPlayerIds.map(pid => ({ trade_id: trade.id, team_id: userTeam.id, player_id: Number(pid) })),
        ...tradeTargetPlayerIds.map(pid => ({ trade_id: trade.id, team_id: tradeTargetTeamId, player_id: Number(pid) })),
      ];
      const { error: itemsError } = await supabase.from("trade_items").insert(items);
      if (itemsError) throw itemsError;
      
      toast({ title: "Trade enviado", description: "Tu propuesta de trade fue enviada correctamente." });
      setTradeModalOpen(false);
      setTradeStep("select");
      setTradeTargetTeamId("");
      setTradeMyPlayerIds([]);
      setTradeTargetPlayerIds([]);
      
      // Refresh trades
      queryClient.invalidateQueries({ queryKey: ["tradesSent", userTeam.id, leagueId] });
      queryClient.invalidateQueries({ queryKey: ["tradesReceived", userTeam.id, leagueId] });
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo enviar el trade";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setTradeLoading(false);
    }
  };

  const { data: isOwner } = useIsLeagueOwner(leagueId);
  const [processingWaivers, setProcessingWaivers] = useState(false);

  // Process waivers manually (owner only)
  const handleProcessWaivers = async () => {
    setProcessingWaivers(true);
    try {
      const { data, error } = await supabase.rpc("process_league_waivers", {
        league_id: leagueId,
        week_num: currentWeek,
        season_year: 2024,
      });
      if (error) throw error;
      const result = data as Record<string, unknown>;
      toast({
        title: "Waivers procesadas",
        description: `${Number(result.successful_claims) || 0} aprobadas, ${Number(result.failed_claims) || 0} rechazadas`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error procesando waivers";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProcessingWaivers(false);
    }
  };

  // Create/reset waiver priorities
  const handleCreateWaiverPriorities = async () => {
    setProcessingWaivers(true);
    try {
      const { data, error } = await supabase.rpc("reset_all_waiver_priorities", {
        new_week: currentWeek,
      });
      if (error) throw error;
      toast({
        title: "Prioridades de waivers creadas",
        description: `Prioridades generadas para la semana ${currentWeek}`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error creando prioridades";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProcessingWaivers(false);
    }
  };

  return (
    <Layout>
      <LeagueNav leagueId={leagueId} />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <WaiverHeader currentWeek={currentWeek} />

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex gap-3">
            {isOwner && (
              <>
                <Button
                  className="bg-gradient-to-r from-nfl-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={handleProcessWaivers}
                  disabled={processingWaivers}
                >
                  {processingWaivers ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Process Waivers
                    </>
                  )}
                </Button>
                <Button
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={handleCreateWaiverPriorities}
                  disabled={processingWaivers}
                >
                  {processingWaivers ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 mr-2" />
                      Create Priorities
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
          
          <Dialog open={tradeModalOpen} onOpenChange={(open) => {
            setTradeModalOpen(open);
            if (!open) {
              setTradeStep("select");
              setTradeTargetTeamId("");
              setTradeMyPlayerIds([]);
              setTradeTargetPlayerIds([]);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg transition-all duration-200 hover:scale-105">
                <Trophy className="w-4 h-4 mr-2" />
                Propose Trade
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content - Available Players */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search and Filters */}
            <Card className="bg-gradient-to-br from-nfl-gray to-nfl-dark-gray border-nfl-light-gray/20 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-nfl-blue" />
                  Available Players
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <WaiverFilters
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  positionFilter={positionFilter}
                  setPositionFilter={setPositionFilter}
                />

                {/* Players Table */}
                <WaiverPlayersTable
                  filteredPlayers={filteredPlayers}
                  loadingPlayers={loadingPlayers}
                  myWaiverRequests={myWaiverRequests}
                  onOpenWaiverModal={handleOpenWaiverModal}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <WaiverSidebar
            waiverPriority={waiverPriority}
            loadingPriority={loadingPriority}
            myWaiverRequests={myWaiverRequests}
            loadingRequests={loadingRequests}
            waiverPlayers={waiverPlayers}
            activeRosterPlayers={activeRosterPlayers}
            userTeam={userTeam}
          />
        </div>

        {/* Modals */}
        <WaiverModals
          waiverModalOpen={waiverModalOpen}
          setWaiverModalOpen={setWaiverModalOpen}
          waiverPlayer={waiverPlayer}
          waiverDropPlayerId={waiverDropPlayerId}
          setWaiverDropPlayerId={setWaiverDropPlayerId}
          waiverLoading={waiverLoading}
          rosterLimits={rosterLimits}
          currentRoster={currentRoster}
          onConfirmWaiver={handleConfirmWaiver}
          tradeModalOpen={tradeModalOpen}
          setTradeModalOpen={setTradeModalOpen}
          tradeStep={tradeStep}
          setTradeStep={setTradeStep}
          tradeTargetTeamId={tradeTargetTeamId}
          setTradeTargetTeamId={setTradeTargetTeamId}
          tradeMyPlayerIds={tradeMyPlayerIds}
          setTradeMyPlayerIds={setTradeMyPlayerIds}
          tradeTargetPlayerIds={tradeTargetPlayerIds}
          setTradeTargetPlayerIds={setTradeTargetPlayerIds}
          tradeLoading={tradeLoading}
          activeTeams={activeTeams}
          myActivePlayers={myActivePlayers}
          targetActivePlayers={targetActivePlayers}
          onSendTrade={handleSendTrade}
        />
      </div>
    </Layout>
  );
};

export default Waivers;
