import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { LeagueNav } from "@/components/LeagueNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWaiverPlayers } from "@/hooks/useWaiverPlayers";
import { useWaiverPriority } from "@/hooks/useWaiverPriority";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useMyWaiverRequests } from "@/hooks/useMyWaiverRequests";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { useRosterLimits } from "@/hooks/useRosterLimits";
import { requestWaiver } from "@/lib/draft";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Clock, AlertTriangle, CheckCircle, Users, Search, Plus } from "lucide-react";
import { useLocation } from "react-router-dom";
import type { Player } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useIsLeagueOwner } from "@/hooks/useIsLeagueOwner";

const Waivers = () => {
  // Obtener el leagueId desde la URL
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "default";
  const currentWeek = 1; // Reemplaza por tu lógica real

  // Data hooks
  const { data: userTeam } = useUserFantasyTeam(leagueId);
  const { data: waiverPlayers = [], isLoading: loadingPlayers } = useWaiverPlayers(leagueId, currentWeek);
  const { data: waiverPriority = [], isLoading: loadingPriority } = useWaiverPriority(leagueId, currentWeek);
  const { data: myWaiverRequests = [], isLoading: loadingRequests, refetch } = useMyWaiverRequests(leagueId, currentWeek, userTeam?.id || "");
  const { data: currentRoster = [], isLoading: loadingRoster } = useRosterWithPlayerDetails(userTeam?.id || "", currentWeek);

  // Form state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [selectedDropPlayerId, setSelectedDropPlayerId] = useState<string>("");
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");

  // Get player position for roster limits
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

  const handleRequest = async () => {
    if (!selectedPlayerId || !userTeam) return;

    // Validation
    if (rosterLimits?.needs_drop && !selectedDropPlayerId) {
      toast({
        title: "Jugador requerido para soltar",
        description: "Tu roster está lleno. Debes seleccionar un jugador para soltar.",
        variant: "destructive",
      });
      return;
    }

    setLoadingRequest(true);
    try {
      await requestWaiver({
        leagueId,
        week: currentWeek,
        fantasyTeamId: userTeam.id,
        playerId: Number(selectedPlayerId),
        dropPlayerId: selectedDropPlayerId ? Number(selectedDropPlayerId) : undefined,
      });
      
      toast({ 
        title: "Solicitud enviada", 
        description: selectedDropPlayerId 
          ? "Tu waiver con drop fue registrada." 
          : "Tu waiver fue registrada." 
      });
      
      setSelectedPlayerId("");
      setSelectedDropPlayerId("");
      refetch();
    } catch (e: unknown) {
      let message = "Unknown error";
      if (e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string") {
        message = (e as { message: string }).message;
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoadingRequest(false);
    }
  };

  const alreadyRequested = myWaiverRequests.some(req => req.player_id?.toString() === selectedPlayerId);

  // Filter active roster players for drop selection
  const activeRosterPlayers = currentRoster.filter(player => player.available !== undefined);

  const getPositionBadgeColor = (position: string) => {
    const colors = {
      QB: "bg-blue-100 text-blue-800 border-blue-300",
      RB: "bg-green-100 text-green-800 border-green-300",
      WR: "bg-purple-100 text-purple-800 border-purple-300",
      TE: "bg-orange-100 text-orange-800 border-orange-300",
      K: "bg-yellow-100 text-yellow-800 border-yellow-300",
      DEF: "bg-red-100 text-red-800 border-red-300",
    };
    return colors[position as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  // Estado para trade
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeTargetTeamId, setTradeTargetTeamId] = useState<string>("");
  const [tradeMyPlayerIds, setTradeMyPlayerIds] = useState<string[]>([]);
  const [tradeTargetPlayerIds, setTradeTargetPlayerIds] = useState<string[]>([]);
  const [tradeStep, setTradeStep] = useState<"select" | "confirm">("select");
  const [tradeLoading, setTradeLoading] = useState(false);

  // Obtener equipos activos (excepto el propio y eliminados)
  const { data: fantasyTeams = [] } = useFantasyTeams(leagueId);
  const activeTeams = fantasyTeams.filter(
    (team) => !team.eliminated && team.id !== userTeam?.id
  );

  // Obtener roster propio y del equipo destino
  const { data: myRoster = [] } = useRosterWithPlayerDetails(userTeam?.id || "", currentWeek);
  const { data: targetRoster = [] } = useRosterWithPlayerDetails(tradeTargetTeamId, currentWeek);

  // Filtrar jugadores propios activos
  const myActivePlayers = myRoster.filter((p) => p.available === false);
  // Filtrar jugadores del otro equipo activos
  const targetActivePlayers = targetRoster.filter((p) => p.available === false);

  // Obtener posición seleccionada (solo una posición permitida)
  const mySelectedPlayers = myActivePlayers.filter((p) => tradeMyPlayerIds.includes(p.id));
  const selectedPosition = mySelectedPlayers.length > 0 ? mySelectedPlayers[0].position : null;
  // Solo permitir selección de jugadores propios de la misma posición
  const mySelectablePlayers = selectedPosition
    ? myActivePlayers.filter((p) => p.position === selectedPosition || tradeMyPlayerIds.includes(p.id))
    : myActivePlayers;
  // Solo mostrar jugadores del otro equipo de la misma posición
  const targetPlayersSamePosition = selectedPosition
    ? targetActivePlayers.filter((p) => p.position === selectedPosition)
    : [];

  // Validación: misma cantidad de jugadores seleccionados en ambos lados, al menos uno
  const canGoToConfirm =
    !!tradeTargetTeamId &&
    tradeMyPlayerIds.length > 0 &&
    tradeTargetPlayerIds.length === tradeMyPlayerIds.length &&
    selectedPosition !== null;

  // Reset selección de jugadores destino si cambia la cantidad de propios
  useEffect(() => {
    if (tradeTargetPlayerIds.length > tradeMyPlayerIds.length) {
      setTradeTargetPlayerIds(tradeTargetPlayerIds.slice(0, tradeMyPlayerIds.length));
    }
  }, [tradeMyPlayerIds, tradeTargetPlayerIds.length]);

  // Estado para modal de waiver
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);
  const [waiverPlayer, setWaiverPlayer] = useState<Player | null>(null);
  const [waiverDropPlayerId, setWaiverDropPlayerId] = useState<string>("");
  const [waiverLoading, setWaiverLoading] = useState(false);

  // Handler para abrir el modal de waiver
  const handleOpenWaiverModal = (player: Player) => {
    setWaiverPlayer(player);
    setWaiverDropPlayerId("");
    setWaiverModalOpen(true);
  };

  // Handler para enviar la solicitud de waiver
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

  // Handler para enviar el trade
  const queryClient = useQueryClient();
  const handleSendTrade = async () => {
    if (!userTeam || !tradeTargetTeamId || tradeMyPlayerIds.length === 0 || tradeTargetPlayerIds.length !== tradeMyPlayerIds.length) return;
    setTradeLoading(true);
    try {
      // 1. Crear el trade
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
      // 2. Crear los trade_items
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
      // Refrescar la lista de trades en la UI
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

  // Botón para que el owner procese waivers manualmente
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

  // Botón para crear/resetear prioridades de waivers
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
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-nfl-blue" />
            <h1 className="text-3xl font-bold text-white">Waivers - Week {currentWeek}</h1>
          </div>
          <Badge variant="outline" className="bg-nfl-blue/20 text-nfl-blue border-nfl-blue/30">
            <Clock className="w-4 h-4 mr-2" />
            Tuesday 11:00 PM Deadline
          </Badge>
        </div>

        {/* Botón para abrir modal de trade */}
        <div className="mb-6 flex justify-end">
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
              <Button className="bg-nfl-blue hover:bg-nfl-lightblue" onClick={() => setTradeModalOpen(true)}>
                Propose Trade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Propose Trade</DialogTitle>
              </DialogHeader>
              {tradeStep === "select" ? (
                <div className="py-2 space-y-4">
                  {/* Selección de equipo destino */}
                  <div>
                    <label className="block text-gray-300 mb-1">Select team to trade with:</label>
                    <select
                      className="w-full p-2 rounded bg-nfl-dark-gray text-white border border-nfl-light-gray/30"
                      value={tradeTargetTeamId}
                      onChange={e => {
                        setTradeTargetTeamId(e.target.value);
                        setTradeMyPlayerIds([]);
                        setTradeTargetPlayerIds([]);
                      }}
                    >
                      <option value="">Select team</option>
                      {activeTeams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Selección de jugadores propios */}
                  <div>
                    <label className="block text-gray-300 mb-1">Select your players to offer (same position):</label>
                    <div className="flex flex-wrap gap-2">
                      {mySelectablePlayers.map(player => (
                        <label key={player.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer border ${tradeMyPlayerIds.includes(player.id) ? "bg-nfl-blue/30 border-nfl-blue" : "bg-nfl-dark-gray border-nfl-light-gray/20"}`}>
                          <input
                            type="checkbox"
                            checked={tradeMyPlayerIds.includes(player.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                // Solo permitir misma posición
                                if (selectedPosition && player.position !== selectedPosition) return;
                                setTradeMyPlayerIds([...tradeMyPlayerIds, player.id]);
                              } else {
                                setTradeMyPlayerIds(tradeMyPlayerIds.filter(id => id !== player.id));
                                setTradeTargetPlayerIds([]); // Reset selección destino
                              }
                            }}
                            disabled={!!selectedPosition && player.position !== selectedPosition}
                          />
                          <span>{player.name} ({player.position} - {player.team})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Selección de jugadores del otro equipo */}
                  <div>
                    <label className="block text-gray-300 mb-1">Select players to receive ({tradeMyPlayerIds.length}):</label>
                    <div className="flex flex-wrap gap-2">
                      {targetPlayersSamePosition.map(player => (
                        <label key={player.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer border ${tradeTargetPlayerIds.includes(player.id) ? "bg-nfl-blue/30 border-nfl-blue" : "bg-nfl-dark-gray border-nfl-light-gray/20"}`}>
                          <input
                            type="checkbox"
                            checked={tradeTargetPlayerIds.includes(player.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                if (tradeTargetPlayerIds.length < tradeMyPlayerIds.length) {
                                  setTradeTargetPlayerIds([...tradeTargetPlayerIds, player.id]);
                                }
                              } else {
                                setTradeTargetPlayerIds(tradeTargetPlayerIds.filter(id => id !== player.id));
                              }
                            }}
                            disabled={
                              !tradeMyPlayerIds.length ||
                              (tradeTargetPlayerIds.length >= tradeMyPlayerIds.length && !tradeTargetPlayerIds.includes(player.id))
                            }
                          />
                          <span>{player.name} ({player.position} - {player.team})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      disabled={!canGoToConfirm}
                      className="bg-nfl-blue hover:bg-nfl-lightblue"
                      onClick={() => setTradeStep("confirm")}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-2 space-y-4">
                  <h3 className="text-lg font-bold text-white mb-2">Confirm Trade Proposal</h3>
                  <div className="mb-2">
                    <div className="text-gray-300 mb-1">You will offer:</div>
                    <ul className="list-disc ml-6 text-white">
                      {mySelectedPlayers.map(player => (
                        <li key={player.id}>{player.name} ({player.position} - {player.team})</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mb-2">
                    <div className="text-gray-300 mb-1">You will receive:</div>
                    <ul className="list-disc ml-6 text-white">
                      {targetPlayersSamePosition.filter(p => tradeTargetPlayerIds.includes(p.id)).map(player => (
                        <li key={player.id}>{player.name} ({player.position} - {player.team})</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setTradeStep("select")}>Back</Button>
                    <Button className="bg-nfl-blue hover:bg-nfl-lightblue" onClick={handleSendTrade} disabled={tradeLoading}>
                      {tradeLoading ? "Enviando..." : "Confirm and Send"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Botón solo para el owner */}
        {isOwner && (
          <div className="mb-6 flex justify-end gap-2">
            <Button
              className="bg-nfl-blue hover:bg-nfl-lightblue"
              onClick={handleProcessWaivers}
              disabled={processingWaivers}
            >
              {processingWaivers ? (
                <><Loader2 className="animate-spin w-4 h-4 mr-2" />Procesando waivers...</>
              ) : (
                <>Procesar Waivers</>
              )}
            </Button>
            <Button
              className="bg-nfl-green hover:bg-green-600"
              onClick={handleCreateWaiverPriorities}
              disabled={processingWaivers}
            >
              {processingWaivers ? (
                <><Loader2 className="animate-spin w-4 h-4 mr-2" />Creando prioridades...</>
              ) : (
                <>Crear Priorities</>
              )}
            </Button>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main content - Available Players */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search and Filters */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white">Available Players</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by name or team..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-nfl-dark-gray border-nfl-light-gray/30 text-white"
                    />
                  </div>
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-32 bg-nfl-dark-gray border-nfl-light-gray/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-nfl-dark-gray border-nfl-light-gray/30">
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="QB">QB</SelectItem>
                      <SelectItem value="RB">RB</SelectItem>
                      <SelectItem value="WR">WR</SelectItem>
                      <SelectItem value="TE">TE</SelectItem>
                      <SelectItem value="K">K</SelectItem>
                      <SelectItem value="DEF">DEF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Players Table */}
                {loadingPlayers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
                    <span className="ml-2 text-gray-400">Loading players...</span>
                  </div>
                ) : (
                  <div className="bg-nfl-dark-gray rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-nfl-light-gray/20 hover:bg-transparent">
                          <TableHead className="text-nfl-blue font-bold w-12"></TableHead>
                          <TableHead className="text-nfl-blue font-bold">Player</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center">Position</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center">Team</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center">Points</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlayers.map((player) => (
                          <TableRow key={player.id} className="border-b border-nfl-light-gray/10 hover:bg-nfl-gray/30">
                            <TableCell></TableCell>
                            <TableCell className="font-semibold text-white">{player.name}</TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2 py-1 rounded text-xs border ${getPositionBadgeColor(player.position)}`}>{player.position}</span>
                            </TableCell>
                            <TableCell className="text-center">{player.team}</TableCell>
                            <TableCell className="text-center">{player.points}</TableCell>
                            <TableCell className="text-center">
                              <Button size="sm" className="bg-nfl-blue hover:bg-nfl-lightblue" onClick={() => handleOpenWaiverModal(player)}>
                                Request
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Waiver Request Form */}
            {selectedPlayerId && (
              <Card className="bg-nfl-gray border-nfl-light-gray/20">
                <CardHeader>
                  <CardTitle className="text-white">Request Waiver</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Selected Player Info */}
                  <div className="bg-nfl-dark-gray p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">Selected Player:</h4>
                    <div className="flex items-center gap-3">
                      {selectedPlayer?.photo && (
                        <img 
                          src={selectedPlayer.photo} 
                          alt={selectedPlayer.name} 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <p className="font-bold text-white">{selectedPlayer?.name}</p>
                        <p className="text-sm text-gray-400">
                          {selectedPlayer?.position} - {selectedPlayer?.team} | {selectedPlayer?.points} pts
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Roster Status Alert */}
                  {rosterLimits && (
                    <Alert className={rosterLimits.needs_drop ? "border-orange-500 bg-orange-50" : "border-green-500 bg-green-50"}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="text-sm">
                          <strong>Roster Status:</strong> {rosterLimits.current_roster_count}/{rosterLimits.max_roster_size} players
                          {rosterLimits.needs_drop && (
                            <span className="text-orange-700 block mt-1">
                              ⚠️ Roster full - You must select a player to drop
                            </span>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Drop Player Selection */}
                  {rosterLimits?.needs_drop && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-orange-700">
                        Player to drop (required):
                      </label>
                      <Select value={selectedDropPlayerId} onValueChange={setSelectedDropPlayerId}>
                        <SelectTrigger className="bg-nfl-dark-gray border-orange-300 text-white">
                          <SelectValue placeholder="Select player to drop" />
                        </SelectTrigger>
                        <SelectContent className="bg-nfl-dark-gray border-nfl-light-gray/30">
                          {activeRosterPlayers.map(player => (
                            <SelectItem key={player.id} value={player.id}>
                              {player.name} ({player.position} - {player.team}) | {player.points} pts
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRequest}
                      disabled={
                        !selectedPlayerId || 
                        alreadyRequested || 
                        loadingRequest ||
                        (rosterLimits?.needs_drop && !selectedDropPlayerId)
                      }
                      className="bg-nfl-blue hover:bg-nfl-lightblue"
                    >
                      {loadingRequest ? (
                        <>
                          <Loader2 className="animate-spin w-4 h-4 mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Submit Waiver
                          {selectedDropPlayerId && " (with Drop)"}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedPlayerId("");
                        setSelectedDropPlayerId("");
                      }}
                      className="border-nfl-light-gray/30 text-gray-300 hover:bg-nfl-light-gray/10"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Waiver Priority */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white">Waiver Priority</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPriority ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="animate-spin w-4 h-4" /> Loading...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {waiverPriority.map((wp, idx) => (
                      <div key={wp.fantasy_team_id} className="flex items-center gap-3 p-2 rounded">
                        <Badge 
                          variant={userTeam?.id === wp.fantasy_team_id ? "default" : "outline"}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            userTeam?.id === wp.fantasy_team_id ? "bg-nfl-blue text-white" : "bg-gray-100"
                          }`}
                        >
                          {idx + 1}
                        </Badge>
                        <span className={`text-sm ${
                          userTeam?.id === wp.fantasy_team_id ? "font-bold text-nfl-blue" : "text-gray-300"
                        }`}>
                          Team {wp.fantasy_team_id?.slice(0, 8)}
                          {userTeam?.id === wp.fantasy_team_id && " (You)"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Requests */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white">My Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRequests ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="animate-spin w-4 h-4" /> Loading...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myWaiverRequests.length === 0 && (
                      <div className="text-gray-400 text-center py-4 text-sm">
                        No requests this week.
                      </div>
                    )}
                    {myWaiverRequests.map(req => (
                      <div key={req.id} className="bg-nfl-dark-gray p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-white text-sm">
                            {waiverPlayers.find(p => p.id === req.player_id?.toString())?.name || `Player ${req.player_id}`}
                          </span>
                          <Badge className={
                            req.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                            req.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                            'bg-red-100 text-red-800 border-red-300'
                          }>
                            {req.status === 'pending' ? 'Pending' :
                             req.status === 'approved' ? 'Approved' : 'Rejected'}
                          </Badge>
                        </div>
                        {req.drop_player_id && (
                          <span className="text-xs text-gray-400">
                            Drop: {activeRosterPlayers.find(p => p.id === req.drop_player_id?.toString())?.name || `Player ${req.drop_player_id}`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sección: Mis solicitudes de waivers */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-white mb-4">Mis solicitudes de waivers</h2>
          {loadingRequests ? (
            <div className="flex items-center gap-2 text-gray-400"><Loader2 className="animate-spin w-4 h-4" />Cargando solicitudes...</div>
          ) : myWaiverRequests.length === 0 ? (
            <div className="text-gray-400">No has hecho solicitudes de waivers esta semana.</div>
          ) : (
            <ul className="space-y-4">
              {myWaiverRequests.map((req) => {
                const requestedPlayer = waiverPlayers.find(p => p.id === req.player_id?.toString());
                const droppedPlayer = currentRoster.find(p => p.id === req.drop_player_id?.toString());
                let statusColor = "bg-gray-500";
                if (req.status === "approved") statusColor = "bg-green-600";
                else if (req.status === "rejected") statusColor = "bg-red-600";
                else if (req.status === "pending") statusColor = "bg-yellow-500";
                return (
                  <li key={req.id} className="bg-nfl-dark-gray rounded-lg p-4 flex items-center gap-4 shadow border border-nfl-light-gray/10">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${statusColor}`}></span>
                        <span className="font-semibold text-white">{requestedPlayer ? requestedPlayer.name : `Jugador #${req.player_id}`}</span>
                        <span className="text-xs text-gray-400 ml-2">{requestedPlayer ? requestedPlayer.position : ""}</span>
                        <span className="text-xs text-gray-400 ml-2">{requestedPlayer ? requestedPlayer.team : ""}</span>
                      </div>
                      {droppedPlayer && (
                        <div className="text-xs text-gray-400 mb-1">Soltaste: <span className="font-semibold text-white">{droppedPlayer.name}</span></div>
                      )}
                      <div className="text-xs text-gray-400">Estado: <span className="font-bold capitalize text-white">{req.status}</span></div>
                      <div className="text-xs text-gray-500 mt-1">Solicitado: {req.created_at ? new Date(req.created_at).toLocaleString() : "-"}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Modal de solicitud de waiver */}
        <Dialog open={waiverModalOpen} onOpenChange={setWaiverModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Waiver</DialogTitle>
            </DialogHeader>
            {waiverPlayer && (
              <div className="py-2">
                <div className="mb-2 text-gray-300">
                  <span className="font-bold">{waiverPlayer.name}</span> ({waiverPlayer.position} - {waiverPlayer.team})
                </div>
                {rosterLimits?.needs_drop ? (
                  <div className="mb-4">
                    <p className="text-gray-400 mb-2">Your roster is full. Select a player to drop:</p>
                    <select
                      className="w-full p-2 rounded bg-nfl-dark-gray text-white border border-nfl-light-gray/30"
                      value={waiverDropPlayerId}
                      onChange={e => setWaiverDropPlayerId(e.target.value)}
                    >
                      <option value="">Select player to drop</option>
                      {currentRoster
                        .filter(p => p.position === waiverPlayer.position && p.available)
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                        ))}
                    </select>
                  </div>
                ) : null}
                <div className="flex justify-end gap-2 mt-4">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={handleConfirmWaiver}
                    disabled={waiverLoading || (rosterLimits?.needs_drop && !waiverDropPlayerId)}
                    className="bg-nfl-blue hover:bg-nfl-lightblue"
                  >
                    {waiverLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                    Confirm Request
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Waivers;
