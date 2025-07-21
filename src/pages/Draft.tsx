import { Layout } from "@/components/Layout";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { DraftTimer } from "@/components/DraftTimer";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DraftPlayerCard } from "@/components/DraftPlayerCard";
import { Search, Award, Settings, Play, Pause, RotateCcw, CheckCircle, Clock, Trophy, Users } from "lucide-react";
import { useLocation } from "react-router-dom";
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
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "default";
  const queryClient = useQueryClient();

  // Hooks de datos reales
  const { data: userTeam, isLoading: loadingUserTeam } = useUserFantasyTeam(leagueId);
  const { data: draftState, isLoading: loadingDraftState } = useDraftState(leagueId);
  const { data: isOwner = false } = useIsLeagueOwner(leagueId);
  const currentWeek = 1; // Puedes obtener la semana real con useCurrentWeek si lo necesitas
  const { data: availablePlayers = [], isLoading: loadingPlayers, refetch: refetchPlayers } = useAvailablePlayers(leagueId, currentWeek);
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

  // Límites de slots
  const SLOT_LIMITS = {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,    // RB/WR only
    K: 1,
    DEF: 1,
    DP: 1,      // Defensive Player
    BENCH: 4,   // Reduced to 4
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
    if (player.position === "DP" && canDraftInSlot("DP")) return "DP";
    if (canDraftInSlot("BENCH")) return "BENCH";
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
    if (!canDraftInSlot("BENCH")) return "Your bench is full.";
    return null;
  };

  // Filtrar y ordenar jugadores - properly type the available players
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
  
  // Ensure positions are properly typed when sorting
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
      queryClient.invalidateQueries({ queryKey: ["myRoster", userTeam?.id, currentWeek] }),
      queryClient.invalidateQueries({ queryKey: ["isLeagueOwner", leagueId] }),
    ]);
  };

  // Manejar el pick de un jugador
  const handleDraft = async (playerId: number, slot: string) => {
    
    if (!userTeam) {
      console.error('❌ No userTeam');
      toast.error('Error: No se encontró tu equipo');
      return;
    }

    if (!isMyTurn) {
      console.error('❌ No es mi turno');
      toast.error('No es tu turno para draftear');
      return;
    }

    if (draftState?.draft_status !== 'in_progress') {
      console.error('❌ Draft no está activo');
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
      console.error('💥 Error en handleDraft:', error);
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

  // Manejar toggle del auto-timer
  const handleToggleAutoTimed = (enabled: boolean) => {
    setAutoTimerEnabled(enabled);
    toast.info(enabled ? 'Auto-draft habilitado' : 'Auto-draft deshabilitado');
  };

  // Mostrar el orden de picks y el turno actual en una tabla
  const renderDraftOrderTable = () => {
    if (!draftState?.draft_order || teams.length === 0) return null;
    return (
      <Card className="mb-4 bg-nfl-gray border-nfl-light-gray/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-nfl-blue">Draft Order</CardTitle>
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
                const isCurrent = idx === draftState.current_pick;
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

      // 2. Mezclar aleatoriamente los IDs de los equipos
      const shuffled = (fantasyTeams as { id: string }[])
        .map((t) => t.id)
        .sort(() => Math.random() - 0.5);

      // 3. Guardar el draft_order y poner el draft en progreso
      const { error } = await supabase
        .from("leagues")
        .update({ draft_status: "in_progress", start_date: new Date().toISOString(), draft_order: shuffled, current_pick: 0 })
        .eq("id", leagueId);
      if (error) throw error;
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
                  <div className="flex gap-2 flex-wrap mb-4">
                    {/* Nuevo: Empezar Draft Ahora */}
                    {draftState?.draft_status === 'pending' && (
                      <Button
                        onClick={handleStartDraftNow}
                        disabled={loadingControl}
                        variant="default"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Empezar Draft Ahora
                      </Button>
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
                          disabled={scheduling || !scheduledDate}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          Programar Draft
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
            {/* Filtros */}
            <Card className="mb-6 bg-nfl-gray border-nfl-light-gray/20">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="search" className="text-sm text-gray-400 mb-1 block">Search Players</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="search"
                        placeholder="Search by name or team..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="position" className="text-sm text-gray-400 mb-1 block">Position</label>
                    <Select value={positionFilter} onValueChange={setPositionFilter}>
                      <SelectTrigger id="position">
                        <SelectValue placeholder="All Positions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="QB">Quarterback (QB)</SelectItem>
                        <SelectItem value="RB">Running Back (RB)</SelectItem>
                        <SelectItem value="WR">Wide Receiver (WR)</SelectItem>
                        <SelectItem value="TE">Tight End (TE)</SelectItem>
                        <SelectItem value="K">Kicker (K)</SelectItem>
                        <SelectItem value="DEF">Defense (DEF)</SelectItem>
                        <SelectItem value="DP">Defensive Player (DP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="sort" className="text-sm text-gray-400 mb-1 block">Sort By</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sort">
                        <SelectValue placeholder="Points (Highest to Lowest)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="points">Points (Highest to Lowest)</SelectItem>
                        <SelectItem value="name">Name (A-Z)</SelectItem>
                        <SelectItem value="position">Position</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Jugadores disponibles */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Available Players</h2>
                <Badge variant="outline" className="bg-transparent">
                  {filteredPlayers.length} Players
                </Badge>
              </div>
              {loadingPlayers ? (
                <p className="text-gray-400">Loading players...</p>
              ) : filteredPlayers.length > 0 ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {sortedPlayers.map(player => {
                    const slot = getAvailableSlot(player);
                    const canDraft = isMyTurn && 
                                    !loadingPick && 
                                    !loadingControl &&
                                    !!slot && 
                                    draftState?.draft_status === 'in_progress';
                    const feedback = !canDraft ? getSlotFeedback(player) : null;
                    
                    // Mensaje específico si el draft está pausado
                    let disabledReason = feedback;
                    if (draftState?.draft_status === 'pending') {
                      disabledReason = "Draft pausado por el administrador";
                    } else if (draftState?.draft_status === 'completed') {
                      disabledReason = "Draft finalizado";
                    } else if (!isMyTurn) {
                      disabledReason = "No es tu turno";
                    }
                    
                    // Add mock status and matchup for now
                    const enhancedPlayer = {
                      ...player,
                      status: "healthy" as const,
                      matchup: `vs ${["KC", "BUF", "SF", "DAL", "GB"][Math.floor(Math.random() * 5)]}`
                    };
                    
                    return (
                      <DraftPlayerCard
                        key={player.id}
                        player={enhancedPlayer}
                        onDraft={canDraft ? (playerId) => handleDraft(Number(playerId), slot!) : undefined}
                        canDraft={canDraft}
                        slot={slot}
                        disabled={!canDraft}
                        disabledReason={disabledReason}
                      />
                    );
                  })}
                </div>
              ) : (
                <Card className="bg-nfl-gray border-nfl-light-gray/20 p-8 text-center">
                  <div className="text-gray-400 mb-2">No players match your search</div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setPositionFilter('all');
                    }}
                  >
                    Reset Filters
                  </Button>
                </Card>
              )}
            </div>
          </div>
          {/* Sidebar */}
          <div className="lg:w-80 space-y-6">
            {/* Draft Timer */}
            <DraftTimer
              isMyTurn={isMyTurn}
              isActive={draftState?.draft_status === 'in_progress'}
              onTimeExpired={handleTimeExpired}
              onToggleAutoTimed={handleToggleAutoTimed}
              timerDuration={60}
            />
            
            {/* Draft Order */}
            {draftState?.draft_order && teams.length > 0 && (
              <Card className="bg-nfl-gray border-nfl-light-gray/20">
                <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20 pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-nfl-blue" />
                    <span>Draft Order</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-60 overflow-y-auto">
                    {draftState.draft_order.map((teamId: string, idx: number) => {
                      const team = teams.find((t) => t.id === teamId);
                      const isCurrent = idx === (draftState.current_pick || 0);
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
            )}

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
                      {myRoster.length}/13
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
      </div>
      </div>
    </Layout>
  );
}
