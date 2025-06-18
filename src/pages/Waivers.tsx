
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
import { Loader2, Clock, AlertTriangle, CheckCircle, Users, Search, Plus, UserPlus, Trophy, Star, TrendingUp } from "lucide-react";
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
      QB: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      RB: "bg-green-500/20 text-green-300 border-green-500/30",
      WR: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      TE: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      K: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      DEF: "bg-red-500/20 text-red-300 border-red-500/30",
    };
    return colors[position as keyof typeof colors] || "bg-gray-500/20 text-gray-300 border-gray-500/30";
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'approved': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'approved': return <CheckCircle className="w-3 h-3" />;
      case 'rejected': return <AlertTriangle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <Layout>
      <LeagueNav leagueId={leagueId} />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-nfl-blue via-nfl-blue/90 to-blue-700 border border-nfl-blue/20 mb-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23ffffff&quot; fill-opacity=&quot;0.05&quot;%3E%3Ccircle cx=&quot;30&quot; cy=&quot;30&quot; r=&quot;2&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
          <div className="relative p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">Waiver Wire</h1>
                  <p className="text-blue-100 text-lg">Week {currentWeek} • Add players to strengthen your roster</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20">
                  <div className="text-white text-sm mb-1">Active Requests</div>
                  <div className="text-2xl font-bold text-white">
                    {myWaiverRequests.filter(req => req.status === 'pending').length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
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
              <Button className="bg-gradient-to-r from-nfl-blue to-nfl-lightblue hover:from-nfl-lightblue hover:to-nfl-blue text-white border-0 shadow-lg">
                <Trophy className="w-4 h-4 mr-2" />
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

          {/* Owner Controls */}
          {isOwner && (
            <div className="flex gap-2">
              <Button
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0"
                onClick={handleProcessWaivers}
                disabled={processingWaivers}
              >
                {processingWaivers ? (
                  <><Loader2 className="animate-spin w-4 h-4 mr-2" />Processing...</>
                ) : (
                  <>Process Waivers</>
                )}
              </Button>
              <Button
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0"
                onClick={handleCreateWaiverPriorities}
                disabled={processingWaivers}
              >
                {processingWaivers ? (
                  <><Loader2 className="animate-spin w-4 h-4 mr-2" />Creating...</>
                ) : (
                  <>Create Priorities</>
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content - Available Players */}
          <div className="lg:col-span-3 space-y-8">
            {/* Enhanced Filters Card */}
            <Card className="bg-gradient-to-br from-nfl-dark-gray to-nfl-gray border-nfl-light-gray/20 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-nfl-blue" />
                  Available Players
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by name or team..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-nfl-darker border-nfl-light-gray/30 text-white placeholder-gray-400 focus:border-nfl-blue focus:ring-nfl-blue"
                    />
                  </div>
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-32 bg-nfl-darker border-nfl-light-gray/30 text-white focus:border-nfl-blue focus:ring-nfl-blue">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-nfl-darker border-nfl-light-gray/30">
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

                {/* Enhanced Players Table */}
                {loadingPlayers ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3 text-gray-400">
                      <Loader2 className="animate-spin w-6 h-6" />
                      <span className="text-lg">Loading players...</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-nfl-darker/50 rounded-xl overflow-hidden border border-nfl-light-gray/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-nfl-light-gray/20 hover:bg-transparent">
                          <TableHead className="text-nfl-blue font-bold text-sm">Player</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center text-sm">Position</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center text-sm">Team</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center text-sm">Points</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center text-sm">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlayers.map((player) => (
                          <TableRow key={player.id} className="border-b border-nfl-light-gray/10 hover:bg-nfl-light-gray/5 transition-colors">
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                {player.photo && (
                                  <img 
                                    src={player.photo} 
                                    alt={player.name} 
                                    className="w-10 h-10 rounded-full object-cover border-2 border-nfl-light-gray/20"
                                  />
                                )}
                                <div>
                                  <div className="font-semibold text-white text-sm">{player.name}</div>
                                  <div className="text-xs text-gray-400">{player.team}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={`${getPositionBadgeColor(player.position)} border text-xs font-medium px-2 py-1`}>
                                {player.position}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-white text-sm font-medium">{player.team}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <TrendingUp className="w-3 h-3 text-nfl-blue" />
                                <span className="text-white font-bold text-sm">{player.points}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button 
                                size="sm" 
                                className="bg-gradient-to-r from-nfl-blue to-nfl-lightblue hover:from-nfl-lightblue hover:to-nfl-blue text-white border-0 shadow-md transition-all duration-200 hover:shadow-lg" 
                                onClick={() => handleOpenWaiverModal(player)}
                                disabled={myWaiverRequests.some(req => req.player_id?.toString() === player.id)}
                              >
                                {myWaiverRequests.some(req => req.player_id?.toString() === player.id) ? (
                                  <>Requested</>
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

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Waiver Priority Card */}
            <Card className="bg-gradient-to-br from-nfl-dark-gray to-nfl-gray border-nfl-light-gray/20 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-nfl-blue" />
                  Waiver Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPriority ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="animate-spin w-4 h-4" /> 
                    <span>Loading...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {waiverPriority.map((wp, idx) => (
                      <div key={wp.fantasy_team_id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        userTeam?.id === wp.fantasy_team_id 
                          ? "bg-nfl-blue/20 border-nfl-blue/30 shadow-md" 
                          : "bg-nfl-darker/30 border-nfl-light-gray/10"
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                          userTeam?.id === wp.fantasy_team_id 
                            ? "bg-nfl-blue text-white border-nfl-blue" 
                            : "bg-nfl-light-gray text-gray-300 border-nfl-light-gray/30"
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${
                            userTeam?.id === wp.fantasy_team_id ? "text-nfl-blue" : "text-gray-300"
                          }`}>
                            Team {wp.fantasy_team_id?.slice(0, 8)}
                            {userTeam?.id === wp.fantasy_team_id && (
                              <Badge className="ml-2 bg-nfl-blue/20 text-nfl-blue border-nfl-blue/30 text-xs">
                                You
                              </Badge>
                            )}
                          </span>
                        </div>
                        {idx === 0 && (
                          <Star className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Requests Card */}
            <Card className="bg-gradient-to-br from-nfl-dark-gray to-nfl-gray border-nfl-light-gray/20 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-nfl-blue" />
                  My Requests
                  {myWaiverRequests.filter(req => req.status === 'pending').length > 0 && (
                    <Badge className="bg-nfl-blue text-white ml-2">
                      {myWaiverRequests.filter(req => req.status === 'pending').length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRequests ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="animate-spin w-4 h-4" /> 
                    <span>Loading...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myWaiverRequests.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-nfl-light-gray/20 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Clock className="w-6 h-6 text-gray-500" />
                        </div>
                        <p className="text-gray-400 text-sm">No requests this week</p>
                      </div>
                    )}
                    {myWaiverRequests.map(req => {
                      const requestedPlayer = waiverPlayers.find(p => p.id === req.player_id?.toString());
                      return (
                        <div key={req.id} className="bg-nfl-darker/50 rounded-lg p-4 border border-nfl-light-gray/10 hover:border-nfl-light-gray/20 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {requestedPlayer?.photo && (
                                <img 
                                  src={requestedPlayer.photo} 
                                  alt={requestedPlayer.name} 
                                  className="w-8 h-8 rounded-full object-cover border border-nfl-light-gray/20"
                                />
                              )}
                              <div>
                                <div className="font-medium text-white text-sm">
                                  {requestedPlayer?.name || `Player ${req.player_id}`}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {requestedPlayer?.position} - {requestedPlayer?.team}
                                </div>
                              </div>
                            </div>
                            <Badge className={`${getStatusColor(req.status)} border text-xs`}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(req.status)}
                                <span className="capitalize">{req.status}</span>
                              </div>
                            </Badge>
                          </div>
                          {req.drop_player_id && (
                            <div className="text-xs text-gray-400 mt-2 pl-10">
                              Drop: {activeRosterPlayers.find(p => p.id === req.drop_player_id?.toString())?.name || `Player ${req.drop_player_id}`}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-2 pl-10">
                            {req.created_at ? new Date(req.created_at).toLocaleDateString() : "-"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Waiver Request Modal */}
        <Dialog open={waiverModalOpen} onOpenChange={setWaiverModalOpen}>
          <DialogContent className="bg-nfl-dark-gray border-nfl-light-gray/20 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-nfl-blue" />
                Request Waiver
              </DialogTitle>
            </DialogHeader>
            {waiverPlayer && (
              <div className="py-4 space-y-4">
                {/* Player Info */}
                <div className="bg-nfl-darker/50 rounded-lg p-4 border border-nfl-light-gray/10">
                  <div className="flex items-center gap-3">
                    {waiverPlayer.photo && (
                      <img 
                        src={waiverPlayer.photo} 
                        alt={waiverPlayer.name} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-nfl-light-gray/20"
                      />
                    )}
                    <div>
                      <div className="font-bold text-white">{waiverPlayer.name}</div>
                      <div className="text-sm text-gray-400">
                        <Badge className={`${getPositionBadgeColor(waiverPlayer.position)} border text-xs mr-2`}>
                          {waiverPlayer.position}
                        </Badge>
                        {waiverPlayer.team} • {waiverPlayer.points} pts
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drop Selection */}
                {rosterLimits?.needs_drop && (
                  <div className="space-y-2">
                    <Alert className="border-orange-500/30 bg-orange-500/10">
                      <AlertTriangle className="h-4 w-4 text-orange-400" />
                      <AlertDescription className="text-orange-300">
                        Your roster is full. Select a player to drop:
                      </AlertDescription>
                    </Alert>
                    <Select value={waiverDropPlayerId} onValueChange={setWaiverDropPlayerId}>
                      <SelectTrigger className="bg-nfl-darker border-nfl-light-gray/30 text-white">
                        <SelectValue placeholder="Select player to drop" />
                      </SelectTrigger>
                      <SelectContent className="bg-nfl-darker border-nfl-light-gray/30">
                        {currentRoster
                          .filter(p => p.position === waiverPlayer.position && p.available)
                          .map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.position} - {p.team})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="gap-3">
              <DialogClose asChild>
                <Button variant="outline" className="border-nfl-light-gray/30 text-gray-300 hover:bg-nfl-light-gray/10">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={handleConfirmWaiver}
                disabled={waiverLoading || (rosterLimits?.needs_drop && !waiverDropPlayerId)}
                className="bg-gradient-to-r from-nfl-blue to-nfl-lightblue hover:from-nfl-lightblue hover:to-nfl-blue text-white border-0"
              >
                {waiverLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Confirm Request
                  </div>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Waivers;
