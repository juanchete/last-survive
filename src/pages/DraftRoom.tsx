import { Layout } from "@/components/Layout";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { DraftOrderCarousel } from "@/components/DraftOrderCarousel";
import { DraftBoard } from "@/components/DraftBoard";
import { TeamRosterSidebar } from "@/components/TeamRosterSidebar";
import { DraftPicksHistory } from "@/components/DraftPicksHistory";
import { DraftPlayerList } from "@/components/DraftPlayerList";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAvailablePlayers } from "@/hooks/useAvailablePlayers";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useDraftState } from "@/hooks/useDraftState";
import { useIsMyDraftTurn } from "@/hooks/useIsMyDraftTurn";
import { useIsLeagueOwner } from "@/hooks/useIsLeagueOwner";
import { draftPlayer } from "@/lib/draft";
import { pauseDraft, resumeDraft, completeDraft, resetDraft } from "@/lib/draftControl";
import { executeAutoDraft } from "@/lib/autoDraft";
import { toast } from 'sonner';
import { useQueryClient, useQuery } from "@tanstack/react-query";
import type { Player } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Settings, Wifi, WifiOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useDraftRealtimeSimple } from "@/hooks/useDraftRealtimeSimple";

export default function DraftRoom() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Use refs to maintain stable references
  const queryClientRef = useRef(queryClient);
  const navigateRef = useRef(navigate);
  
  useEffect(() => {
    queryClientRef.current = queryClient;
    navigateRef.current = navigate;
  }, [queryClient, navigate]);

  if (!leagueId) {
    navigate('/hub');
    return null;
  }

  // Local state
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Hooks de datos reales - Enable polling as backup
  const { data: userTeam, isLoading: loadingUserTeam, error: userTeamError } = useUserFantasyTeam(leagueId);
  
  // Use the simplified draft realtime hook with team ID (after userTeam is defined)
  const {
    isConnected: realtimeConnected,
    status: connectionStatus,
    messages,
    connectedTeams,
    broadcastPick,
    broadcastDraftStatus
  } = useDraftRealtimeSimple(leagueId, userTeam?.id);
  const { data: draftState, isLoading: loadingDraftState, error: draftStateError } = useDraftState(leagueId, true); // Poll every 3 seconds as backup
  const { data: isOwner = false, error: ownerError } = useIsLeagueOwner(leagueId);
  const currentWeek = 1;
  const { data: availablePlayers = [], isLoading: loadingPlayers, refetch: refetchPlayers } = useAvailablePlayers(leagueId, currentWeek, true); // Poll every 3 seconds as backup
  
  const myTeamId = userTeam?.id || "";
  const isMyTurn = useIsMyDraftTurn(leagueId, myTeamId);
  
  // Get roster with player details - with polling
  const { data: rosterData = [] } = useQuery({
    queryKey: ["draftRoster", userTeam?.id, currentWeek],
    queryFn: async () => {
      if (!userTeam?.id) return [];
      const { data, error } = await supabase
        .from("team_rosters")
        .select(`
          id,
          player_id,
          slot,
          players!inner(
            id,
            name,
            position,
            nfl_teams(abbreviation)
          )
        `)
        .eq("fantasy_team_id", userTeam.id)
        .eq("week", currentWeek);
      
      if (error) throw error;
      
      return data?.map(item => ({
        id: item.id,
        player_id: item.player_id,
        slot: item.slot,
        name: item.players.name,
        position: item.players.position,
        team: item.players.nfl_teams?.abbreviation || "FA"
      })) || [];
    },
    enabled: !!userTeam?.id && !!currentWeek,
    refetchInterval: 3000, // Poll every 3 seconds during draft
    refetchOnWindowFocus: true,
  });
  
  const myRoster = rosterData;
  const { data: teams = [], isLoading: loadingTeams } = useFantasyTeams(leagueId);
  const { user } = useAuth();

  // State
  // Search and filter state now handled by DraftPlayerList component
  // const [searchTerm, setSearchTerm] = useState('');
  // const [positionFilter, setPositionFilter] = useState('all');
  // const [sortBy, setSortBy] = useState('points');
  const [loadingPick, setLoadingPick] = useState(false);
  const [loadingControl, setLoadingControl] = useState(false);
  const [autoTimerEnabled, setAutoTimerEnabled] = useState(true);
  const [showAdminControls, setShowAdminControls] = useState(true); // Start with controls visible for easier access

  // Límites de slots (sin banca - 9 jugadores totales)
  const SLOT_LIMITS = {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,
    K: 1,
    DEF: 1,
    DP: 1,
  };

  // Cuenta los slots ocupados
  const slotCounts = myRoster.reduce((acc, item) => {
    acc[item.slot] = (acc[item.slot] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Función para saber si se puede draftear en ese slot
  function canDraftInSlot(slot: string) {
    return (slotCounts[slot] || 0) < SLOT_LIMITS[slot];
  }

  // Determina el slot disponible para un jugador
  const getAvailableSlot = (player: Player) => {
    if (player.position === "QB" && canDraftInSlot("QB")) return "QB";
    if (player.position === "RB" && canDraftInSlot("RB")) return "RB";
    if (player.position === "WR" && canDraftInSlot("WR")) return "WR";
    if (player.position === "TE" && canDraftInSlot("TE")) return "TE";
    if (["RB", "WR"].includes(player.position) && canDraftInSlot("FLEX")) return "FLEX";
    if (player.position === "K" && canDraftInSlot("K")) return "K";
    if (player.position === "DEF" && canDraftInSlot("DEF")) return "DEF";
    // DP slot can be filled by DP, LB, DB, or DL positions
    if (["DP", "LB", "DB", "DL"].includes(player.position) && canDraftInSlot("DP")) return "DP";
    return null;
  };

  // Mensaje de feedback para slots llenos
  const getSlotFeedback = (player: Player) => {
    if (player.position === "QB" && !canDraftInSlot("QB")) return "You already have the maximum of starting QBs.";
    if (player.position === "RB" && !canDraftInSlot("RB") && !canDraftInSlot("FLEX")) return "You already have the maximum of starting RBs and FLEX.";
    if (player.position === "WR" && !canDraftInSlot("WR") && !canDraftInSlot("FLEX")) return "You already have the maximum of starting WRs and FLEX.";
    if (player.position === "TE" && !canDraftInSlot("TE")) return "You already have the maximum of starting TEs.";
    if (player.position === "K" && !canDraftInSlot("K")) return "You already have the maximum of Kickers.";
    if (player.position === "DEF" && !canDraftInSlot("DEF")) return "You already have the maximum of Defenses.";
    // Check for all defensive player positions
    if (["DP", "LB", "DB", "DL"].includes(player.position) && !canDraftInSlot("DP")) return "You already have the maximum of Defensive Players.";
    return "Your roster is full (10 players max).";
  };

  // Filtrar y ordenar jugadores
  const typedAvailablePlayers: Player[] = availablePlayers.map(player => ({
    ...player,
    position: player.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "DP"
  }));

  // Filtering and sorting now handled by DraftPlayerList component
  // const filteredPlayers = typedAvailablePlayers.filter(player => {
  //   if (!player.available) return false;
  //   if (positionFilter !== 'all' && player.position !== positionFilter) return false;
  //   if (searchTerm && !player.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
  //       !player.team.toLowerCase().includes(searchTerm.toLowerCase())) {
  //     return false;
  //   }
  //   return true;
  // });
  
  // const sortedPlayers = [...filteredPlayers].sort((a, b) => {
  //   if (sortBy === 'points') return b.points - a.points;
  //   if (sortBy === 'name') return a.name.localeCompare(b.name);
  //   if (sortBy === 'position') return a.position.localeCompare(b.position);
  //   return 0;
  // });

  // Función para refrescar todos los datos relacionados con el draft
  const refreshDraftData = async () => {
    await Promise.all([
      queryClientRef.current.invalidateQueries({ queryKey: ["availablePlayers", leagueId, currentWeek] }),
      queryClientRef.current.invalidateQueries({ queryKey: ["draftState", leagueId] }),
      queryClientRef.current.invalidateQueries({ queryKey: ["userFantasyTeam", leagueId] }),
      queryClientRef.current.invalidateQueries({ queryKey: ["draftRoster", userTeam?.id, currentWeek] }),
      queryClientRef.current.invalidateQueries({ queryKey: ["isLeagueOwner", leagueId] }),
    ]);
  };

  // Manejar el pick de un jugador
  const handleDraft = async (playerId: number, slot: string) => {
    if (!userTeam) {
      toast.error('Error: No se encontró tu equipo');
      return;
    }

    if (!isMyTurn) {
      toast.error('No es tu turno para draftear');
      return;
    }

    if (draftState?.draft_status !== 'in_progress') {
      toast.error('El draft no está activo actualmente');
      return;
    }

    setLoadingPick(true);
    try {
      const result = await draftPlayer({
        leagueId,
        fantasyTeamId: userTeam.id,
        playerId,
        week: currentWeek,
        slot,
      });

      toast.success('¡Jugador drafteado exitosamente!');
      
      // Broadcast the pick to other users
      const player = typedAvailablePlayers.find(p => p.id === playerId);
      if (player) {
        await broadcastPick(String(playerId), player.name);
      }
      
      await refreshDraftData();
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al draftear: ${errorMessage}`);
    } finally {
      setLoadingPick(false);
    }
  };

  // Manejar cuando expira el tiempo del timer
  const handleTimeExpired = async () => {
    if (!userTeam || !isMyTurn || loadingPick) {
      console.log('[DraftRoom] Skipping auto-draft:', { userTeam: !!userTeam, isMyTurn, loadingPick });
      return;
    }

    console.log('[DraftRoom] Executing auto-draft for team:', userTeam.id);
    setLoadingPick(true);
    
    try {
      const result = await executeAutoDraft({
        leagueId,
        fantasyTeamId: userTeam.id,
        availablePlayers: typedAvailablePlayers,
        currentRoster: myRoster,
        currentWeek,
      });

      if (result.success && result.player) {
        toast.success(`Auto-draft: ${result.player.name} (${result.player.position}) seleccionado automáticamente`);
        
        // Broadcast the auto-draft pick
        await broadcastPick(String(result.player.id), result.player.name);
        
        // Refresh all draft data
        await refreshDraftData();
      } else {
        toast.error(`Error en auto-draft: ${result.error}`);
        console.error('[DraftRoom] Auto-draft failed:', result.error);
      }
    } catch (error) {
      toast.error('Error ejecutando auto-draft');
      console.error('[DraftRoom] Error en auto-draft:', error);
    } finally {
      setLoadingPick(false);
    }
  };

  // Admin functions
  const handleStartDraftNow = async () => {
    if (!userTeam?.id || !leagueId) return;
    setLoadingControl(true);
    try {
      const { data: fantasyTeams, error: teamsError } = await supabase
        .from("fantasy_teams")
        .select("id")
        .eq("league_id", leagueId);
      if (teamsError) throw teamsError;
      if (!fantasyTeams || fantasyTeams.length === 0) throw new Error("No hay equipos en la liga");

      const shuffled = (fantasyTeams as { id: string }[])
        .map((t) => t.id)
        .sort(() => Math.random() - 0.5);

      const { error } = await supabase
        .from("leagues")
        .update({ 
          draft_status: "in_progress", 
          start_date: new Date().toISOString(), 
          draft_order: shuffled, 
          current_pick: 0
        })
        .eq("id", leagueId);
      if (error) throw error;
      
      toast.success("Draft iniciado");
      
      // Broadcast draft started event
      await broadcastDraftStatus('draft_started');
      
      await refreshDraftData();
    } catch (error) {
      toast.error("Error al iniciar el draft: " + (error instanceof Error ? error.message : ""));
    } finally {
      setLoadingControl(false);
    }
  };

  const handlePauseDraft = async () => {
    if (!user?.id || !leagueId) return;
    setLoadingControl(true);
    try {
      const result = await pauseDraft(user.id, leagueId);
      if (result.success) {
        toast.success(result.message);
        await broadcastDraftStatus('draft_paused');
        await refreshDraftData();
      } else {
        toast.error(result.message || "Error al pausar draft");
      }
    } catch (error) {
      toast.error('Error pausando draft');
    } finally {
      setLoadingControl(false);
    }
  };

  const handleResumeDraft = async () => {
    if (!user?.id || !leagueId) return;
    setLoadingControl(true);
    try {
      const result = await resumeDraft(user.id, leagueId);
      if (result.success) {
        toast.success(result.message);
        await refreshDraftData();
      } else {
        toast.error(result.message || "Error al reanudar draft");
      }
    } catch (error) {
      toast.error('Error reanudando draft');
    } finally {
      setLoadingControl(false);
    }
  };

  // No longer need the old realtime subscription code since we're using the new hook

  // Watch for draft completion
  useEffect(() => {
    if (draftState?.draft_status === 'completed' && !showCompletionModal) {
      setShowCompletionModal(true);
      toast.success('🎉 Draft has been completed!');
      // Auto-redirect after 5 seconds
      setTimeout(() => {
        navigate(`/team?league=${leagueId}`);
      }, 5000);
    }
  }, [draftState?.draft_status, leagueId]);

  const handleCompleteDraft = async () => {
    if (!user?.id || !leagueId) return;
    if (!confirm('¿Estás seguro de que quieres finalizar el draft?')) {
      return;
    }
    setLoadingControl(true);
    try {
      const result = await completeDraft(user.id, leagueId);
      if (result.success) {
        toast.success(result.message);
        await refreshDraftData();
      } else {
        toast.error(result.message || "Error al finalizar draft");
      }
    } catch (error) {
      toast.error('Error finalizando draft');
    } finally {
      setLoadingControl(false);
    }
  };

  const handleResetDraft = async () => {
    if (!user?.id || !leagueId) return;
    if (!confirm('¿Estás seguro de que quieres reiniciar el draft? Esto eliminará todos los picks actuales.')) {
      return;
    }
    setLoadingControl(true);
    try {
      const result = await resetDraft(user.id, leagueId);
      if (result.success) {
        toast.success(result.message);
        await refreshDraftData();
      } else {
        toast.error(result.message || "Error al resetear draft");
      }
    } catch (error) {
      toast.error('Error reseteando draft');
    } finally {
      setLoadingControl(false);
    }
  };

  // Calculate current round and pick
  const currentPick = draftState?.current_pick || 0;
  const totalTeams = draftState?.draft_order?.length || 0;
  const currentRound = totalTeams > 0 ? Math.floor(currentPick / totalTeams) + 1 : 1;
  const pickInRound = totalTeams > 0 ? (currentPick % totalTeams) + 1 : 1;

  // Debug log to see draft state
  useEffect(() => {
    console.log('Draft State Debug:', {
      isOwner,
      draftStatus: draftState?.draft_status,
      draftOrder: draftState?.draft_order,
      draftOrderLength: draftState?.draft_order?.length,
      currentPick: draftState?.current_pick,
      showAdminControls,
      shouldShowStartButton: draftState?.draft_status === 'pending' && (!draftState?.draft_order || draftState.draft_order.length === 0),
      shouldShowResumeButton: draftState?.draft_status === 'pending' && draftState?.draft_order && draftState.draft_order.length > 0,
      loadingDraftState,
      draftStateError,
      draftState,
      leagueId
    });
    if (draftStateError) {
      console.error('Error loading draft state:', draftStateError);
    }
  }, [isOwner, draftState, showAdminControls, loadingDraftState, draftStateError, leagueId]);

  return (
    <Layout>
      <div className="min-h-screen bg-nfl-dark-gray">
        <LeagueHeader leagueId={leagueId} />
        <LeagueTabs leagueId={leagueId} activeTab="draft" />
        
        {/* Draft Status Bar */}
        <div className="bg-nfl-gray border-b border-nfl-light-gray/20">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge className="bg-nfl-blue text-white">
                  {draftState?.draft_status === 'in_progress' ? 'LIVE DRAFT' : 'MOCK DRAFT'}
                </Badge>
                
                {/* Connection Status */}
                <div className="flex items-center gap-2">
                  {realtimeConnected ? (
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-1 text-green-500">
                        <Wifi className="w-4 h-4 animate-pulse" />
                        <span className="text-xs font-medium">Connected</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-1 text-yellow-500">
                        <WifiOff className="w-4 h-4" />
                        <span className="text-xs">
                          {connectionStatus || 'Connecting...'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Message count for debugging */}
                  <div className="flex items-center gap-1 text-gray-400">
                    <span className="text-xs">Messages: {messages?.length || 0}</span>
                  </div>
                </div>
                {isMyTurn && draftState?.draft_status === 'in_progress' && (
                  <div className="text-nfl-blue font-bold text-lg animate-pulse">
                    YOU ARE ON THE CLOCK!
                  </div>
                )}
                <span className="text-gray-400">
                  Round {currentRound} • Pick {pickInRound}
                </span>
              </div>
              
              {/* Admin Controls */}
              {isOwner && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdminControls(!showAdminControls)}
                    className="bg-nfl-gray hover:bg-nfl-light-gray/20"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Admin Controls
                  </Button>
                  {showAdminControls && (
                    <div className="flex gap-2 bg-nfl-dark-gray/90 p-2 rounded-lg">
                      {/* Start Draft - visible when pending and no draft order or empty draft order */}
                      {draftState?.draft_status === 'pending' && (!draftState?.draft_order || draftState.draft_order.length === 0) && (
                        <Button
                          onClick={handleStartDraftNow}
                          disabled={loadingControl}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Start Draft
                        </Button>
                      )}
                      
                      {/* Resume Draft - visible when pending but has draft order (was paused) */}
                      {draftState?.draft_status === 'pending' && draftState?.draft_order && draftState.draft_order.length > 0 && (
                        <Button
                          onClick={handleResumeDraft}
                          disabled={loadingControl}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Resume Draft
                        </Button>
                      )}
                      
                      {/* Pause Draft - visible when in progress */}
                      {draftState?.draft_status === 'in_progress' && (
                        <Button
                          onClick={handlePauseDraft}
                          disabled={loadingControl}
                          size="sm"
                          variant="outline"
                          className="border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white"
                        >
                          Pause Draft
                        </Button>
                      )}
                      
                      {/* Complete Draft - visible when in progress or paused */}
                      {(draftState?.draft_status === 'in_progress' || 
                        (draftState?.draft_status === 'pending' && draftState?.draft_order && draftState.draft_order.length > 0)) && (
                        <Button
                          onClick={handleCompleteDraft}
                          disabled={loadingControl}
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          End Draft
                        </Button>
                      )}
                      
                      {/* Reset Draft - always visible */}
                      <Button
                        onClick={handleResetDraft}
                        disabled={loadingControl}
                        size="sm"
                        variant="destructive"
                      >
                        Reset Draft
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Draft Order Carousel with Online Status */}
        <DraftOrderCarousel
          teams={teams}
          draftOrder={draftState?.draft_order || []}
          currentPick={draftState?.current_pick || 0}
          userTeamId={userTeam?.id}
          currentRound={currentRound}
          connectedTeams={connectedTeams}
        />

        {/* Main Draft Area */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Draft Picks History - Left Sidebar */}
            <div className="w-80">
              <DraftPicksHistory
                leagueId={leagueId}
                currentPick={draftState?.current_pick || 0}
                teams={teams}
                messages={messages}
              />
            </div>

            {/* Draft Player List - Center */}
            <div className="flex-1">
              <DraftPlayerList
                leagueId={leagueId}
                week={currentWeek}
                onSelectPlayer={async (playerId) => {
                  // Get the player to determine the slot
                  const player = availablePlayers.find(p => String(p.id) === String(playerId));
                  if (player) {
                    const slot = getAvailableSlot(player);
                    if (slot) {
                      await handleDraft(playerId, slot);
                    }
                  }
                }}
                isMyTurn={isMyTurn}
                myRoster={myRoster}
                slotCounts={slotCounts}
                slotLimits={SLOT_LIMITS}
              />
            </div>

            {/* Team Roster Sidebar - Right */}
            <div className="w-80">
              <TeamRosterSidebar
                roster={myRoster}
                slotLimits={SLOT_LIMITS}
                slotCounts={slotCounts}
                userTeam={userTeam}
                isMyTurn={isMyTurn}
                isActive={draftState?.draft_status === 'in_progress'}
                onTimeExpired={handleTimeExpired}
                onToggleAutoTimed={setAutoTimerEnabled}
                timerDuration={draftState?.timer_duration || 60}
                turnDeadline={draftState?.turn_deadline}
                turnStartedAt={draftState?.turn_started_at}
              />
            </div>
          </div>
        </div>
        
        {/* Draft Completion Modal */}
        <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
          <DialogContent className="bg-nfl-gray border-nfl-light-gray/30">
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">
                🎉 Draft Complete! 🎉
              </DialogTitle>
              <DialogDescription className="text-center text-lg mt-4">
                All teams have completed their rosters.
                The draft is now finished!
              </DialogDescription>
            </DialogHeader>
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-4">
                You will be automatically redirected to your team page in 5 seconds...
              </p>
              <Button 
                onClick={() => navigate(`/team?league=${leagueId}`)}
                className="bg-nfl-blue hover:bg-nfl-blue/80"
              >
                Go to My Team Now
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}