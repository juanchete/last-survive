
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
import { Loader2, Clock, AlertTriangle, CheckCircle, Users, Search, Plus, Star, Trophy, UserPlus, Zap } from "lucide-react";
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
      QB: "bg-blue-500/20 text-blue-300 border-blue-400/50",
      RB: "bg-green-500/20 text-green-300 border-green-400/50",
      WR: "bg-purple-500/20 text-purple-300 border-purple-400/50",
      TE: "bg-orange-500/20 text-orange-300 border-orange-400/50",
      K: "bg-yellow-500/20 text-yellow-300 border-yellow-400/50",
      DEF: "bg-red-500/20 text-red-300 border-red-400/50",
    };
    return colors[position as keyof typeof colors] || "bg-gray-500/20 text-gray-300 border-gray-400/50";
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
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-nfl-blue via-nfl-blue/90 to-blue-700 border border-nfl-blue/20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"2\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
          <div className="relative p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">Waivers</h1>
                  <p className="text-blue-100 text-lg">Week {currentWeek} • Add players to strengthen your roster</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="bg-white/10 text-white border-white/30 backdrop-blur-sm px-4 py-2 text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  Tuesday 11:00 PM Deadline
                </Badge>
              </div>
            </div>
          </div>
        </div>

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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Propose Trade</DialogTitle>
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

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content - Available Players */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search and Filters */}
            <Card className="bg-gradient-to-br from-nfl-gray to-nfl-dark-gray border-nfl-light-gray/20 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-nfl-blue" />
                  Available Players
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-nfl-blue transition-colors" />
                    <Input
                      placeholder="Search by name or team..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-nfl-dark-gray/50 border-nfl-light-gray/30 text-white placeholder-gray-400 focus:border-nfl-blue focus:ring-2 focus:ring-nfl-blue/20 transition-all duration-200"
                    />
                  </div>
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-40 bg-nfl-dark-gray/50 border-nfl-light-gray/30 text-white focus:border-nfl-blue focus:ring-2 focus:ring-nfl-blue/20 transition-all duration-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-nfl-dark-gray border-nfl-light-gray/30">
                      <SelectItem value="ALL">All Positions</SelectItem>
                      <SelectItem value="QB">Quarterback</SelectItem>
                      <SelectItem value="RB">Running Back</SelectItem>
                      <SelectItem value="WR">Wide Receiver</SelectItem>
                      <SelectItem value="TE">Tight End</SelectItem>
                      <SelectItem value="K">Kicker</SelectItem>
                      <SelectItem value="DEF">Defense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Players Table */}
                {loadingPlayers ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center space-y-4">
                      <Loader2 className="animate-spin w-8 h-8 text-nfl-blue mx-auto" />
                      <p className="text-gray-400 text-lg">Loading available players...</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-nfl-dark-gray/50 rounded-xl overflow-hidden border border-nfl-light-gray/10 shadow-inner">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-nfl-light-gray/20 hover:bg-transparent">
                          <TableHead className="text-nfl-blue font-bold text-sm uppercase tracking-wide">Player</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center text-sm uppercase tracking-wide">Position</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center text-sm uppercase tracking-wide">Team</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center text-sm uppercase tracking-wide">Points</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center text-sm uppercase tracking-wide">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlayers.map((player) => (
                          <TableRow key={player.id} className="border-b border-nfl-light-gray/5 hover:bg-nfl-blue/5 transition-colors duration-200 group">
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                {player.photo && (
                                  <img 
                                    src={player.photo} 
                                    alt={player.name} 
                                    className="w-10 h-10 rounded-full object-cover border-2 border-nfl-light-gray/20 group-hover:border-nfl-blue/30 transition-colors"
                                  />
                                )}
                                <div>
                                  <p className="font-semibold text-white group-hover:text-nfl-blue transition-colors">{player.name}</p>
                                  <p className="text-sm text-gray-400">{player.team}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={`px-3 py-1 rounded-full text-xs font-medium border ${getPositionBadgeColor(player.position)}`}>
                                {player.position}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-white font-medium">{player.team}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-white font-bold">{player.points}</span>
                                <span className="text-gray-400 text-sm">pts</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button 
                                size="sm" 
                                className="bg-gradient-to-r from-nfl-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md transition-all duration-200 hover:scale-105" 
                                onClick={() => handleOpenWaiverModal(player)}
                                disabled={myWaiverRequests.some(req => req.player_id?.toString() === player.id)}
                              >
                                {myWaiverRequests.some(req => req.player_id?.toString() === player.id) ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Requested
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3 mr-1" />
                                    Request
                                  </>
                                )}
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Waiver Priority */}
            <Card className="bg-gradient-to-br from-nfl-gray to-nfl-dark-gray border-nfl-light-gray/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Waiver Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPriority ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="animate-spin w-4 h-4" /> Loading...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {waiverPriority.map((wp, idx) => (
                      <div key={wp.fantasy_team_id} className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                        userTeam?.id === wp.fantasy_team_id 
                          ? "bg-nfl-blue/20 border border-nfl-blue/40 shadow-md" 
                          : "bg-nfl-dark-gray/30 hover:bg-nfl-dark-gray/50"
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          userTeam?.id === wp.fantasy_team_id ? "bg-nfl-blue text-white" : "bg-gray-600 text-gray-300"
                        }`}>
                          {idx + 1}
                        </div>
                        <span className={`text-sm font-medium ${
                          userTeam?.id === wp.fantasy_team_id ? "text-nfl-blue" : "text-gray-300"
                        }`}>
                          Team {wp.fantasy_team_id?.slice(0, 8)}
                          {userTeam?.id === wp.fantasy_team_id && (
                            <span className="ml-2 text-xs bg-nfl-blue/20 text-nfl-blue px-2 py-1 rounded-full">You</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Requests */}
            <Card className="bg-gradient-to-br from-nfl-gray to-nfl-dark-gray border-nfl-light-gray/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  My Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRequests ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="animate-spin w-4 h-4" /> Loading...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myWaiverRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Clock className="w-8 h-8 text-gray-500" />
                        </div>
                        <p className="text-gray-400 text-sm">No requests this week</p>
                        <p className="text-gray-500 text-xs mt-1">Request players above to see them here</p>
                      </div>
                    ) : (
                      myWaiverRequests.map(req => {
                        const requestedPlayer = waiverPlayers.find(p => p.id === req.player_id?.toString());
                        return (
                          <div key={req.id} className="bg-nfl-dark-gray/50 p-4 rounded-lg border border-nfl-light-gray/10 hover:border-nfl-light-gray/20 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {requestedPlayer?.photo && (
                                  <img 
                                    src={requestedPlayer.photo} 
                                    alt={requestedPlayer.name} 
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                )}
                                <span className="font-medium text-white text-sm">
                                  {requestedPlayer?.name || `Player ${req.player_id}`}
                                </span>
                              </div>
                              <Badge className={
                                req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50' :
                                req.status === 'approved' ? 'bg-green-500/20 text-green-300 border-green-400/50' :
                                'bg-red-500/20 text-red-300 border-red-400/50'
                              }>
                                {req.status === 'pending' ? 'Pending' :
                                 req.status === 'approved' ? 'Approved' : 'Rejected'}
                              </Badge>
                            </div>
                            {req.drop_player_id && (
                              <p className="text-xs text-gray-400">
                                Drop: {activeRosterPlayers.find(p => p.id === req.drop_player_id?.toString())?.name || `Player ${req.drop_player_id}`}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal de solicitud de waiver */}
        <Dialog open={waiverModalOpen} onOpenChange={setWaiverModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-nfl-blue" />
                Request Waiver
              </DialogTitle>
            </DialogHeader>
            {waiverPlayer && (
              <div className="py-4 space-y-6">
                {/* Player Info Card */}
                <div className="bg-gradient-to-r from-nfl-blue/10 to-blue-600/10 p-4 rounded-xl border border-nfl-blue/20">
                  <div className="flex items-center gap-4">
                    {waiverPlayer.photo && (
                      <img 
                        src={waiverPlayer.photo} 
                        alt={waiverPlayer.name} 
                        className="w-16 h-16 rounded-full object-cover border-2 border-nfl-blue/30"
                      />
                    )}
                    <div>
                      <h3 className="font-bold text-white text-lg">{waiverPlayer.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${getPositionBadgeColor(waiverPlayer.position)} text-xs`}>
                          {waiverPlayer.position}
                        </Badge>
                        <span className="text-gray-400 text-sm">{waiverPlayer.team}</span>
                        <span className="text-nfl-blue font-medium text-sm">{waiverPlayer.points} pts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Roster Status */}
                {rosterLimits?.needs_drop && (
                  <Alert className="border-orange-400/50 bg-orange-500/10">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    <AlertDescription className="text-orange-200">
                      <strong>Roster Full:</strong> You must select a player to drop to make room.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Drop Player Selection */}
                {rosterLimits?.needs_drop && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white">
                      Select player to drop:
                    </label>
                    <Select value={waiverDropPlayerId} onValueChange={setWaiverDropPlayerId}>
                      <SelectTrigger className="bg-nfl-dark-gray border-nfl-light-gray/30 text-white">
                        <SelectValue placeholder="Choose a player to drop" />
                      </SelectTrigger>
                      <SelectContent className="bg-nfl-dark-gray border-nfl-light-gray/30">
                        {currentRoster
                          .filter(p => p.position === waiverPlayer.position && p.available)
                          .map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <span>{p.name}</span>
                                <Badge className={`${getPositionBadgeColor(p.position)} text-xs`}>
                                  {p.position}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <DialogClose asChild>
                    <Button variant="outline" className="border-nfl-light-gray/30 text-gray-300 hover:bg-nfl-light-gray/10">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    onClick={handleConfirmWaiver}
                    disabled={waiverLoading || (rosterLimits?.needs_drop && !waiverDropPlayerId)}
                    className="bg-gradient-to-r from-nfl-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
                  >
                    {waiverLoading ? (
                      <>
                        <Loader2 className="animate-spin w-4 h-4 mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Request
                      </>
                    )}
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
