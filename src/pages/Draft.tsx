import { Layout } from "@/components/Layout";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { DraftTimer } from "@/components/DraftTimer";
import { DraftErrorBoundary } from "@/components/DraftErrorBoundary";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DraftPlayerCard } from "@/components/DraftPlayerCard";
import { DraftRecommendations } from "@/components/DraftRecommendations";
import { DraftPlayerList } from "@/components/DraftPlayerList";
import { Search, Award, Settings, Play, Pause, RotateCcw, CheckCircle, Clock, Trophy, Users, Wifi, WifiOff, AlertCircle, Check, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAvailablePlayers } from "@/hooks/useAvailablePlayers";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useDraftState } from "@/hooks/useDraftState";
import { useIsMyDraftTurn } from "@/hooks/useIsMyDraftTurn";
import { useIsLeagueOwner } from "@/hooks/useIsLeagueOwner";
import { draftPlayer } from "@/lib/draft";
import { pauseDraft, resumeDraft, resetDraft, completeDraft } from "@/lib/draftControl";
import { executeAutoDraft } from "@/lib/autoDraft";
import { toast } from 'sonner';
import { useQueryClient, useQuery } from "@tanstack/react-query";
import type { Player } from "@/types";
import { DateTime } from "luxon";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function Draft() {
  // Obtener leagueId desde la URL
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "default";
  const queryClient = useQueryClient();
  
  // Use refs to maintain stable references
  const queryClientRef = useRef(queryClient);
  const navigateRef = useRef(navigate);
  
  useEffect(() => {
    queryClientRef.current = queryClient;
    navigateRef.current = navigate;
  }, [queryClient, navigate]);

  // Realtime connection state - must be declared before using in hooks
  const [isConnected, setIsConnected] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Hooks de datos reales - enable fallback polling when disconnected
  const { data: userTeam, isLoading: loadingUserTeam } = useUserFantasyTeam(leagueId);
  const { data: draftState, isLoading: loadingDraftState } = useDraftState(leagueId, !isConnected);
  const { data: isOwner = false } = useIsLeagueOwner(leagueId);
  const currentWeek = 1; // Puedes obtener la semana real con useCurrentWeek si lo necesitas
  const { data: availablePlayers = [], isLoading: loadingPlayers, refetch: refetchPlayers } = useAvailablePlayers(leagueId, currentWeek, !isConnected);
  // Llamar siempre el hook, aunque userTeam no esté listo
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
  
  // Debug log to check teams count
  useEffect(() => {
    if (!loadingTeams) {
      console.log('Teams loaded:', teams.length, 'teams', teams);
    }
  }, [teams, loadingTeams]);

  // State para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('points');
  const [loadingPick, setLoadingPick] = useState(false);
  const [loadingControl, setLoadingControl] = useState(false);
  const [autoTimerEnabled, setAutoTimerEnabled] = useState(true);
  const [showControls, setShowControls] = useState(false);

  // Nuevo estado para fecha programada
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduling, setScheduling] = useState(false);
  

  // Límites de slots - 10 jugadores totales sin banca
  const SLOT_LIMITS = {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,    // RB/WR only
    K: 1,
    DEF: 1,
    DP: 1,      // Defensive Player
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
    if (["RB", "WR"].includes(player.position) && canDraftInSlot("FLEX")) return "FLEX"; // Only RB/WR for FLEX
    if (player.position === "K" && canDraftInSlot("K")) return "K";
    if (player.position === "DEF" && canDraftInSlot("DEF")) return "DEF";
    // DP slot can be filled by DP, LB, DB, or DL positions
    if (["DP", "LB", "DB", "DL"].includes(player.position) && canDraftInSlot("DP")) return "DP";
    return null; // No hay banca, si no hay slot disponible, no se puede draftear
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
    // Roster is full (10 players max)
    if (myRoster.length >= 10) return "Your roster is full (10 players max).";
    return null;
  };

  // Filtrar y ordenar jugadores - properly type the available players
  const typedAvailablePlayers: Player[] = availablePlayers.map(player => ({
    ...player,
    position: player.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "DP" | "LB" | "DB" | "DL"
  }));

  // These are now handled by the DraftPlayerList component
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
      queryClient.invalidateQueries({ queryKey: ["availablePlayers", leagueId, currentWeek] }),
      queryClient.invalidateQueries({ queryKey: ["draftState", leagueId] }),
      queryClient.invalidateQueries({ queryKey: ["userFantasyTeam", leagueId] }),
      queryClient.invalidateQueries({ queryKey: ["myRoster", userTeam?.id, currentWeek] }),
      queryClient.invalidateQueries({ queryKey: ["isLeagueOwner", leagueId] }),
    ]);
  };

  // Manejar el pick de un jugador
  const handleDraft = async (playerId: number, slot: string) => {
    
    if (!userTeam) {
      // No userTeam found
      toast.error('Error: No se encontró tu equipo');
      return;
    }

    if (!isMyTurn) {
      // Not my turn
      toast.error('No es tu turno para draftear');
      return;
    }

    if (draftState?.draft_status !== 'in_progress') {
      // Draft is not active
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
      
      // Refrescar datos después del draft
      await refreshDraftData();
      
    } catch (error: unknown) {
      // Error in handleDraft
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
      // Error in auto-draft
    } finally {
      setLoadingPick(false);
    }
  };

  // Manejar toggle del auto-timer
  const handleToggleAutoTimed = (enabled: boolean) => {
    setAutoTimerEnabled(enabled);
    toast.info(enabled ? 'Auto-draft habilitado' : 'Auto-draft deshabilitado');
  };

  // Setup Supabase Realtime subscriptions
  useEffect(() => {
    if (!leagueId) return;

    console.log('[Realtime] Setting up draft subscriptions for league:', leagueId);

    // Create a channel for this draft with all necessary subscriptions
    const channel = supabase
      .channel(`draft-${leagueId}`) // Use consistent channel name
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leagues',
          filter: `id=eq.${leagueId}`
        },
        async (payload) => {
          console.log('[Realtime] League update received:', payload);
          setLastUpdateTime(new Date());
          
          // Immediately invalidate draft state to update turn info
          await queryClientRef.current.invalidateQueries({ queryKey: ["draftState", leagueId] });
          
          // Check for current_pick changes (turn changes)
          if (payload.new && payload.old && payload.new.current_pick !== payload.old.current_pick) {
            console.log('[Realtime] Turn changed from', payload.old.current_pick, 'to', payload.new.current_pick);
            toast.info('Turn updated!');
            
            // Force refresh all draft-related data
            await Promise.all([
              queryClientRef.current.invalidateQueries({ queryKey: ["availablePlayers", leagueId, 1] }), // Use hardcoded week 1
              queryClientRef.current.invalidateQueries({ queryKey: ["draftRoster"] }), // Invalidate all roster queries
              queryClientRef.current.invalidateQueries({ queryKey: ["fantasyTeams", leagueId] })
            ]);
          }
          
          // Check if draft just completed
          if (payload.new && payload.new.draft_status === 'completed' && payload.old?.draft_status !== 'completed') {
            setShowCompletionModal(true);
            toast.success('🎉 Draft completed!');
            setTimeout(() => {
              navigateRef.current(`/team?league=${leagueId}`);
            }, 5000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_rosters'
        },
        async (payload) => {
          console.log('[Realtime] New roster entry:', payload);
          setLastUpdateTime(new Date());
          
          // Refresh all relevant data immediately
          await Promise.all([
            queryClientRef.current.invalidateQueries({ queryKey: ["availablePlayers", leagueId, 1] }), // Use hardcoded week 1
            queryClientRef.current.invalidateQueries({ queryKey: ["draftRoster"] }), // Invalidate all roster queries
            queryClientRef.current.invalidateQueries({ queryKey: ["draftState", leagueId] })
          ]);
          
          // Notify about new pick
          toast.info('A new player was drafted!');
        }
      )
      .subscribe(async (status) => {
        console.log('[Realtime] Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully connected to draft updates');
          setConnectionAttempts(0);
          setLastUpdateTime(new Date());
          toast.success('Connected to live draft updates', { duration: 2000 });
          
          // Force refresh all data on reconnection
          await refreshDraftData();
        } else if (status === 'CLOSED') {
          console.log('[Realtime] Disconnected from draft updates');
          setConnectionAttempts(prev => prev + 1);
          toast.error('Disconnected from live updates - attempting reconnection', { duration: 3000 });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error - attempting to reconnect');
          setConnectionAttempts(prev => prev + 1);
          // Attempt to reconnect after error
          if (connectionAttempts < 3) {
            setTimeout(() => {
              console.log('[Realtime] Attempting reconnection...');
              window.location.reload();
            }, 3000);
          }
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('[Realtime] Cleaning up draft subscriptions');
      supabase.removeChannel(channel);
    };
  }, [leagueId]); // Only depend on leagueId to prevent reconnections

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

  // Mostrar el orden de picks y el turno actual en una tabla
  const renderDraftOrderTable = () => {
    if (!draftState?.draft_order || teams.length === 0) return null;
    
    // Calculate current round and position in snake draft
    const totalTeams = draftState.draft_order.length;
    const currentPickNumber = (draftState.current_pick || 0) + 1; // Convert to 1-based
    const currentRound = Math.ceil(currentPickNumber / totalTeams);
    const positionInRound = ((currentPickNumber - 1) % totalTeams);
    
    // In snake draft, odd rounds go forward, even rounds go backward
    const isReverseRound = currentRound % 2 === 0;
    const currentTeamIndex = isReverseRound 
      ? totalTeams - 1 - positionInRound 
      : positionInRound;
    
    return (
      <Card className="mb-4 bg-nfl-gray border-nfl-light-gray/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-nfl-blue">
            Draft Order - Round {currentRound} {isReverseRound && "(Reversed)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {draftState.draft_order.map((teamId: string, idx: number) => {
                const team = teams.find((t) => t.id === teamId);
                const isCurrent = idx === currentTeamIndex && draftState.draft_status === 'in_progress';
                return (
                  <TableRow key={teamId} className={isCurrent ? "bg-nfl-blue/20" : ""}>
                    <TableCell className="font-bold">{idx + 1}</TableCell>
                    <TableCell className="font-semibold text-white">{team?.name || teamId.slice(0, 8)}</TableCell>
                    <TableCell className="text-gray-300">{team?.owner || "-"}</TableCell>
                    <TableCell>{isCurrent ? <span className="text-nfl-blue font-bold">Turno</span> : ""}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  // Funciones de control del draft (solo para owners)
  const { user } = useAuth();
  const handlePauseDraft = async () => {
    if (!user?.id || !leagueId) return;
    setLoadingControl(true);
    try {
      const result = await pauseDraft(user.id, leagueId);
      if (result.success) {
        toast.success(result.message);
        await refreshDraftData();
      } else {
        toast.error(result.message || "Error desconocido al pausar draft");
      }
    } catch (error) {
      toast.error('Error pausando draft: ' + (error instanceof Error ? error.message : JSON.stringify(error)));
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
        toast.error(result.message || "Error desconocido al reanudar draft");
      }
    } catch (error) {
      toast.error('Error reanudando draft: ' + (error instanceof Error ? error.message : JSON.stringify(error)));
    } finally {
      setLoadingControl(false);
    }
  };

  const handleCompleteDraft = async () => {
    if (!user?.id || !leagueId) return;
    if (!confirm('¿Estás seguro de que quieres finalizar el draft? Esta acción no se puede deshacer.')) {
      return;
    }
    setLoadingControl(true);
    try {
      const result = await completeDraft(user.id, leagueId);
      if (result.success) {
        toast.success(result.message);
        await refreshDraftData();
      } else {
        toast.error(result.message || "Error desconocido al finalizar draft");
      }
    } catch (error) {
      toast.error('Error finalizando draft: ' + (error instanceof Error ? error.message : JSON.stringify(error)));
    } finally {
      setLoadingControl(false);
    }
  };

  // Función para empezar el draft inmediatamente
  const handleStartDraftNow = async () => {
    if (!userTeam?.id || !leagueId) return;
    setLoadingControl(true);
    try {
      // 1. Obtener todos los equipos de la liga
      const { data: fantasyTeams, error: teamsError } = await supabase
        .from("fantasy_teams")
        .select("id")
        .eq("league_id", leagueId);
      if (teamsError) throw teamsError;
      if (!fantasyTeams || fantasyTeams.length === 0) throw new Error("No hay equipos en la liga");
      
      // Validate minimum and maximum teams
      if (fantasyTeams.length < 4) {
        toast.error("Minimum 4 teams required to start the draft");
        setLoadingControl(false);
        return;
      }
      if (fantasyTeams.length > 12) {
        toast.error("Maximum 12 teams allowed in a draft");
        setLoadingControl(false);
        return;
      }
      
      // Confirm with the owner
      if (!confirm(`Start draft with ${fantasyTeams.length} teams? Once started, no more teams can join.`)) {
        setLoadingControl(false);
        return;
      }

      // 2. Mezclar aleatoriamente los IDs de los equipos
      const shuffled = (fantasyTeams as { id: string }[])
        .map((t) => t.id)
        .sort(() => Math.random() - 0.5);

      // 3. Guardar el draft_order y poner el draft en progreso
      const { error } = await supabase
        .from("leagues")
        .update({ 
          draft_status: "in_progress", 
          start_date: new Date().toISOString(), 
          draft_order: shuffled, 
          current_pick: 0,
          auto_draft_enabled: true,
          timer_duration: 60
        })
        .eq("id", leagueId);
      if (error) throw error;
      
      // 4. Start the timer for the first pick
      const { error: timerError } = await supabase
        .rpc('start_draft_turn', { p_league_id: leagueId });
      if (timerError) {
        console.error('Error starting draft timer:', timerError);
      }
      
      toast.success("Draft iniciado, inscripciones cerradas y orden generado");
      await refreshDraftData();
    } catch (error) {
      toast.error("Error al iniciar el draft: " + (error instanceof Error ? error.message : ""));
    } finally {
      setLoadingControl(false);
    }
  };

  // Función para programar el draft
  const handleScheduleDraft = async () => {
    if (!userTeam?.id || !leagueId || !scheduledDate) return;
    
    // Validate team count before scheduling
    if (teams.length < 4) {
      toast.error("Minimum 4 teams required to schedule the draft");
      return;
    }
    if (teams.length > 12) {
      toast.error("Maximum 12 teams allowed in a draft");
      return;
    }
    
    setScheduling(true);
    try {
      // Guardar fecha programada y cerrar inscripciones
      const { error } = await supabase
        .from("leagues")
        .update({ draft_status: "pending", start_date: DateTime.fromISO(scheduledDate).toUTC().toISO() })
        .eq("id", leagueId);
      if (error) throw error;
      toast.success("Draft programado y inscripciones cerradas");
      await refreshDraftData();
    } catch (error) {
      toast.error("Error al programar el draft");
    } finally {
      setScheduling(false);
    }
  };

  // Position colors for badges
  const positionColors = {
    QB: "bg-nfl-blue",
    RB: "bg-nfl-green",
    WR: "bg-nfl-yellow",
    TE: "bg-nfl-accent",
    K: "bg-nfl-lightblue",
    DEF: "bg-nfl-red",
    DP: "bg-purple-600"
  };

  return (
    <DraftErrorBoundary>
      <Layout>
        <div className="min-h-screen bg-nfl-dark-gray">
          <LeagueHeader leagueId={leagueId} />
          <LeagueTabs leagueId={leagueId} activeTab="draft" />
        
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">Player Draft</h1>
                {/* Enhanced Connection Status Indicator */}
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-1 text-green-500">
                        <Wifi className="w-4 h-4 animate-pulse" />
                        <span className="text-xs font-medium">Live</span>
                      </div>
                      {lastUpdateTime && (
                        <span className="text-xs text-gray-400">
                          Last update: {new Date().getTime() - lastUpdateTime.getTime() < 60000 
                            ? 'just now' 
                            : `${Math.floor((new Date().getTime() - lastUpdateTime.getTime()) / 60000)}m ago`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-1 text-yellow-500">
                        <WifiOff className="w-4 h-4" />
                        <span className="text-xs">Reconnecting...</span>
                      </div>
                      {connectionAttempts > 0 && (
                        <span className="text-xs text-gray-400">
                          (Attempt {connectionAttempts})
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* Controles de Owner */}
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowControls(!showControls)}
                      className="text-xs"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Admin
                    </Button>
                  </div>
                )}
              </div>
              <Badge className="bg-nfl-blue">
                {userTeam?.players?.length || 0} Players on Roster
              </Badge>
            </div>

            {/* Controles de Admin (solo visible cuando se expanden) */}
            {isOwner && showControls && (
              <Card className="mb-6 border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Draft Management (Owner Only)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Draft Readiness Checklist */}
                  {draftState?.draft_status === 'pending' && (
                    <div className="mb-4 p-3 bg-white/50 rounded-lg border border-blue-100">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        Draft Readiness Checklist
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          {loadingTeams ? (
                            <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" />
                          ) : teams.length >= 4 ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <X className="w-3 h-3 text-red-600" />
                          )}
                          <span className={loadingTeams ? "text-gray-600" : teams.length >= 4 ? "text-green-700" : "text-red-700"}>
                            {loadingTeams ? "Loading teams..." : `Minimum 4 teams (${teams.length}/4)`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {teams.length <= 12 ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <X className="w-3 h-3 text-red-600" />
                          )}
                          <span className={teams.length <= 12 ? "text-green-700" : "text-red-700"}>
                            Maximum 12 teams ({teams.length}/12)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isConnected ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <X className="w-3 h-3 text-red-600" />
                          )}
                          <span className={isConnected ? "text-green-700" : "text-red-700"}>
                            Real-time connection {isConnected ? "active" : "inactive"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-green-600" />
                          <span className="text-green-700">
                            10 rounds configured (snake format)
                          </span>
                        </div>
                      </div>
                      {teams.length >= 4 && teams.length <= 12 && (
                        <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-700 font-medium">
                          ✓ Ready to start the draft!
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap mb-4">
                    {/* Nuevo: Empezar Draft Ahora */}
                    {draftState?.draft_status === 'pending' && (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleStartDraftNow}
                          disabled={loadingControl || loadingTeams || teams.length < 4 || teams.length > 12}
                          variant="default"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Start Draft Now
                        </Button>
                        {loadingTeams ? (
                          <p className="text-xs text-gray-600">Loading teams...</p>
                        ) : (
                          <>
                            {teams.length < 4 && (
                              <p className="text-xs text-yellow-600">
                                Need at least {4 - teams.length} more team{4 - teams.length !== 1 ? 's' : ''} to start (current: {teams.length})
                              </p>
                            )}
                            {teams.length >= 4 && teams.length <= 12 && (
                              <p className="text-xs text-green-600">
                                Ready to start with {teams.length} teams
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {/* Nuevo: Programar Draft */}
                    {draftState?.draft_status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={scheduledDate}
                          onChange={e => setScheduledDate(e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <Button
                          onClick={handleScheduleDraft}
                          disabled={scheduling || !scheduledDate || loadingTeams || teams.length < 4 || teams.length > 12}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          Schedule Draft
                        </Button>
                      </div>
                    )}
                    {/* Controles existentes */}
                    {draftState?.draft_status === 'in_progress' && (
                      <Button
                        onClick={handlePauseDraft}
                        disabled={loadingControl}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Pause className="w-3 h-3" />
                        Pausar
                      </Button>
                    )}
                    {draftState?.draft_status === 'pending' && (
                      <Button
                        onClick={handleResumeDraft}
                        disabled={loadingControl}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Reanudar
                      </Button>
                    )}
                    {draftState?.draft_status !== 'completed' && (
                      <Button
                        onClick={handleCompleteDraft}
                        disabled={loadingControl}
                        variant="default"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Finalizar
                      </Button>
                    )}
                    {loadingControl && (
                      <div className="text-xs text-blue-600 flex items-center">
                        ⏳ Procesando...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Draft state */}
            {loadingDraftState ? (
              <p className="text-gray-400 mb-2">Loading draft state...</p>
            ) : draftState ? (
              <div className="mb-4">
                <div className="mb-2">
                  Status: <span className="font-bold text-nfl-blue">{draftState.draft_status}</span>
                </div>
                {renderDraftOrderTable()}
                {isMyTurn && <div className="text-nfl-green font-bold">It's your turn to pick!</div>}
                {!isMyTurn && <div className="text-gray-400">Waiting for your turn...</div>}
              </div>
            ) : null}
            
            {/* Draft Recommendations - Show only when it's user's turn */}
            {isMyTurn && draftState?.draft_status === 'in_progress' && (
              <DraftRecommendations
                availablePlayers={typedAvailablePlayers}
                currentRoster={myRoster}
                roundNumber={Math.ceil((draftState?.current_pick || 1) / (fantasyTeams?.length || 8))}
                onDraftPlayer={async (player, slot) => {
                  await handleDraft(Number(player.id), slot);
                }}
                isMyTurn={isMyTurn}
                loadingPick={loadingPick}
                draftStatus={draftState?.draft_status || 'pending'}
              />
            )}
            
            {/* Lista de jugadores disponibles con paginación */}
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
            />
          </div>
          {/* Sidebar */}
          <div className="lg:w-80 space-y-6">
            {/* Draft Timer */}
            <DraftTimer
              isMyTurn={isMyTurn}
              isActive={draftState?.draft_status === 'in_progress'}
              onTimeExpired={handleTimeExpired}
              onToggleAutoTimed={handleToggleAutoTimed}
              timerDuration={draftState?.timer_duration || 60}
              turnDeadline={draftState?.turn_deadline}
              turnStartedAt={draftState?.turn_started_at}
            />
            
            {/* Draft Order */}
            {draftState?.draft_order && teams.length > 0 && (() => {
              // Calculate current round and position in snake draft
              const totalTeams = draftState.draft_order.length;
              const currentPickNumber = draftState.current_pick; // Now this is the overall pick number (0-based)
              const currentRound = Math.floor(currentPickNumber / totalTeams) + 1; // Display round (1-based)
              const positionInRound = currentPickNumber % totalTeams;
              
              // In snake draft: rounds 1, 3, 5 go forward; rounds 2, 4, 6 go backward
              const isReverseRound = (currentRound - 1) % 2 === 1;
              const currentTeamIndex = isReverseRound 
                ? totalTeams - 1 - positionInRound 
                : positionInRound;
                
              return (
                <Card className="bg-nfl-gray border-nfl-light-gray/20">
                  <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20 pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-nfl-blue" />
                      <span>Draft Order - Round {currentRound}</span>
                      {isReverseRound && <span className="text-xs text-gray-400">(Reversed)</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-60 overflow-y-auto">
                      {draftState.draft_order.map((teamId: string, idx: number) => {
                        const team = teams.find((t) => t.id === teamId);
                        const isCurrent = idx === currentTeamIndex && draftState.draft_status === 'in_progress';
                        const isMyTeam = team?.id === userTeam?.id;
                      
                        return (
                          <div
                            key={teamId}
                            className={cn(
                              "px-4 py-2 border-b border-nfl-light-gray/10 last:border-0 flex items-center justify-between",
                              isCurrent && "bg-nfl-blue/20",
                              isMyTeam && "bg-nfl-green/10"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                                isCurrent ? "bg-nfl-blue text-white" : "bg-nfl-dark-gray text-gray-400"
                              )}>
                                {idx + 1}
                              </div>
                              <div>
                                <div className={cn(
                                  "font-medium",
                                  isMyTeam ? "text-nfl-green" : "text-white"
                                )}>
                                  {team?.name || "Unknown"}
                                </div>
                                <div className="text-xs text-gray-400">{team?.owner || "-"}</div>
                              </div>
                            </div>
                            {isCurrent && (
                              <Badge className="bg-nfl-blue text-white">Now</Badge>
                            )}
                          </div>
                        );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

            {/* My Team Roster */}
            {userTeam && (
              <Card className="bg-nfl-gray border-nfl-light-gray/20">
                <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20 pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-nfl-green" />
                      <span>My Team</span>
                    </div>
                    <Badge variant="secondary">
                      {myRoster.length}/10
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-80 overflow-y-auto">
                    {myRoster.length === 0 ? (
                      <div className="p-4 text-center text-gray-400">
                        No players drafted yet
                      </div>
                    ) : (
                      <div className="divide-y divide-nfl-light-gray/10">
                        {/* Group by position */}
                        {Object.entries(SLOT_LIMITS).map(([position, limit]) => {
                          const playersInPosition = myRoster.filter(p => p.slot === position);
                          if (playersInPosition.length === 0 && position !== "BENCH") return null;
                          
                          return (
                            <div key={position} className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-400 uppercase">
                                  {position === "FLEX" ? "RB/WR" : position}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {playersInPosition.length}/{limit}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {playersInPosition.map((player) => (
                                  <div key={player.id} className="flex items-center gap-2 text-sm">
                                    <Badge className={cn(
                                      "text-xs",
                                      positionColors[player.position] || "bg-gray-600",
                                      "text-white"
                                    )}>
                                      {player.position}
                                    </Badge>
                                    <span className="text-white truncate">{player.name}</span>
                                  </div>
                                ))}
                                {/* Show empty slots */}
                                {Array.from({ length: limit - playersInPosition.length }).map((_, idx) => (
                                  <div key={`empty-${position}-${idx}`} className="flex items-center gap-2 text-sm">
                                    <div className="w-8 h-5 rounded bg-nfl-dark-gray/50"></div>
                                    <span className="text-gray-500 italic">Empty</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Draft rules */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-nfl-blue" />
                  <span>Draft Rules</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4 text-sm text-gray-300">
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> You can only select when it's your turn.
                  </p>
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> The draft is in snake format, the order reverses each round.
                  </p>
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> You must complete your lineup respecting the limits of each position.
                  </p>
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> If you don't pick in time, the system may skip your turn.
                  </p>
                </div>
              </CardContent>
            </Card>
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
    </div>
    </Layout>
    </DraftErrorBoundary>
  );
}
