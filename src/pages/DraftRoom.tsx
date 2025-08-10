import { Layout } from "@/components/Layout";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { DraftOrderCarousel } from "@/components/DraftOrderCarousel";
import { DraftBoard } from "@/components/DraftBoard";
import { TeamRosterSidebar } from "@/components/TeamRosterSidebar";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAvailablePlayers } from "@/hooks/useAvailablePlayers";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useDraftState } from "@/hooks/useDraftState";
import { useIsMyDraftTurn } from "@/hooks/useIsMyDraftTurn";
import { useIsLeagueOwner } from "@/hooks/useIsLeagueOwner";
import { draftPlayer } from "@/lib/draft";
import { pauseDraft, resumeDraft, completeDraft } from "@/lib/draftControl";
import { executeAutoDraft } from "@/lib/autoDraft";
import { toast } from 'sonner';
import { useQueryClient, useQuery } from "@tanstack/react-query";
import type { Player } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DraftRoom() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!leagueId) {
    navigate('/hub');
    return null;
  }

  // Hooks de datos reales
  const { data: userTeam, isLoading: loadingUserTeam } = useUserFantasyTeam(leagueId);
  const { data: draftState, isLoading: loadingDraftState } = useDraftState(leagueId);
  const { data: isOwner = false } = useIsLeagueOwner(leagueId);
  const currentWeek = 1;
  const { data: availablePlayers = [], isLoading: loadingPlayers, refetch: refetchPlayers } = useAvailablePlayers(leagueId, currentWeek);
  
  const myTeamId = userTeam?.id || "";
  const isMyTurn = useIsMyDraftTurn(leagueId, myTeamId);
  
  // Get roster with player details
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
  });
  
  const myRoster = rosterData;
  const { data: teams = [], isLoading: loadingTeams } = useFantasyTeams(leagueId);
  const { user } = useAuth();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('points');
  const [loadingPick, setLoadingPick] = useState(false);
  const [loadingControl, setLoadingControl] = useState(false);
  const [autoTimerEnabled, setAutoTimerEnabled] = useState(true);
  const [showAdminControls, setShowAdminControls] = useState(false);

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
    if (player.position === "DP" && canDraftInSlot("DP")) return "DP";
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
    if (player.position === "DP" && !canDraftInSlot("DP")) return "You already have the maximum of Defensive Players.";
    return "Your roster is full (9 players max).";
  };

  // Filtrar y ordenar jugadores
  const typedAvailablePlayers: Player[] = availablePlayers.map(player => ({
    ...player,
    position: player.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "DP"
  }));

  const filteredPlayers = typedAvailablePlayers.filter(player => {
    if (!player.available) return false;
    if (positionFilter !== 'all' && player.position !== positionFilter) return false;
    if (searchTerm && !player.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !player.team.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });
  
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (sortBy === 'points') return b.points - a.points;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'position') return a.position.localeCompare(b.position);
    return 0;
  });

  // Función para refrescar todos los datos relacionados con el draft
  const refreshDraftData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["availablePlayers", leagueId, currentWeek] }),
      queryClient.invalidateQueries({ queryKey: ["draftState", leagueId] }),
      queryClient.invalidateQueries({ queryKey: ["userFantasyTeam", leagueId] }),
      queryClient.invalidateQueries({ queryKey: ["draftRoster", userTeam?.id, currentWeek] }),
      queryClient.invalidateQueries({ queryKey: ["isLeagueOwner", leagueId] }),
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
    if (!userTeam || !isMyTurn || loadingPick) return;

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
      } else {
        toast.error(`Error en auto-draft: ${result.error}`);
      }
    } catch (error) {
      toast.error('Error ejecutando auto-draft');
      console.error('Error en auto-draft:', error);
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

  // Calculate current round and pick
  const currentPick = draftState?.current_pick || 0;
  const totalTeams = draftState?.draft_order?.length || 0;
  const currentRound = totalTeams > 0 ? Math.floor(currentPick / totalTeams) + 1 : 1;
  const pickInRound = totalTeams > 0 ? (currentPick % totalTeams) + 1 : 1;

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
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Admin
                  </Button>
                  {showAdminControls && (
                    <div className="flex gap-2">
                      {draftState?.draft_status === 'pending' && (
                        <Button
                          onClick={handleStartDraftNow}
                          disabled={loadingControl}
                          size="sm"
                          variant="default"
                        >
                          Start Draft
                        </Button>
                      )}
                      {draftState?.draft_status === 'in_progress' && (
                        <Button
                          onClick={handlePauseDraft}
                          disabled={loadingControl}
                          size="sm"
                          variant="outline"
                        >
                          Pause
                        </Button>
                      )}
                      {draftState?.draft_status === 'pending' && draftState?.draft_order && (
                        <Button
                          onClick={handleResumeDraft}
                          disabled={loadingControl}
                          size="sm"
                          variant="outline"
                        >
                          Resume
                        </Button>
                      )}
                      <Button
                        onClick={handleCompleteDraft}
                        disabled={loadingControl}
                        size="sm"
                        variant="destructive"
                      >
                        End Draft
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Draft Order Carousel */}
        <DraftOrderCarousel
          teams={teams}
          draftOrder={draftState?.draft_order || []}
          currentPick={draftState?.current_pick || 0}
          userTeamId={userTeam?.id}
          currentRound={currentRound}
        />

        {/* Main Draft Area */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Draft Board - Center */}
            <div className="flex-1">
              <DraftBoard
                players={sortedPlayers}
                onDraft={handleDraft}
                isMyTurn={isMyTurn}
                loadingPick={loadingPick}
                draftState={draftState}
                getAvailableSlot={getAvailableSlot}
                getSlotFeedback={getSlotFeedback}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                positionFilter={positionFilter}
                setPositionFilter={setPositionFilter}
                sortBy={sortBy}
                setSortBy={setSortBy}
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
                timerDuration={60}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}