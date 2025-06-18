
import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRightLeft, Clock, CheckCircle, XCircle, User, Calendar, Trophy } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeagueNav } from "@/components/LeagueNav";

// Definir tipos explícitos para los datos de trade y player
interface TradeItem {
  id: string;
  player_id: number;
  team_id: string;
}
interface Trade {
  id: string;
  proposer_team_id: string;
  target_team_id: string;
  status: string;
  created_at: string;
  trade_items: TradeItem[];
  target_team?: { name: string };
  proposer_team?: { name: string };
}
interface Player {
  id: number;
  name: string;
  position: string;
  nfl_team?: { abbreviation: string };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'accepted': return 'bg-green-500/20 text-green-300 border-green-500/30';
    case 'rejected': return 'bg-red-500/20 text-red-300 border-red-500/30';
    default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Clock className="w-3 h-3" />;
    case 'accepted': return <CheckCircle className="w-3 h-3" />;
    case 'rejected': return <XCircle className="w-3 h-3" />;
    default: return <Clock className="w-3 h-3" />;
  }
};

export default function Trades() {
  const [tab, setTab] = useState("received");
  // Obtener el equipo del usuario (asume que leagueId está en la URL o contexto)
  const leagueId = new URLSearchParams(window.location.search).get("league") || "default";
  const { data: userTeam } = useUserFantasyTeam(leagueId);
  const queryClient = useQueryClient();
  const [confirmTradeId, setConfirmTradeId] = useState<string | null>(null);
  const [executingTrade, setExecutingTrade] = useState(false);

  // Consultar trades enviados y recibidos
  const { data: tradesSent = [], isLoading: loadingSent } = useQuery({
    queryKey: ["tradesSent", userTeam?.id, leagueId],
    queryFn: async () => {
      if (!userTeam?.id) return [];
      const { data, error } = await supabase
        .from("trades")
        .select("*, trade_items(*), target_team:fantasy_teams!trades_target_team_id_fkey(name), proposer_team:fantasy_teams!trades_proposer_team_id_fkey(name)")
        .eq("proposer_team_id", userTeam.id)
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Trade[];
    },
    enabled: !!userTeam?.id,
  });

  const { data: tradesReceived = [], isLoading: loadingReceived } = useQuery({
    queryKey: ["tradesReceived", userTeam?.id, leagueId],
    queryFn: async () => {
      if (!userTeam?.id) return [];
      const { data, error } = await supabase
        .from("trades")
        .select("*, trade_items(*), proposer_team:fantasy_teams!trades_proposer_team_id_fkey(name), target_team:fantasy_teams!trades_target_team_id_fkey(name)")
        .eq("target_team_id", userTeam.id)
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Trade[];
    },
    enabled: !!userTeam?.id,
  });

  // Obtener todos los IDs de jugadores involucrados en los trades
  const allPlayerIds = useMemo(() => {
    const ids = new Set<number>();
    for (const t of [...tradesSent, ...tradesReceived] as Trade[]) {
      if (t.trade_items) {
        t.trade_items.forEach((item: TradeItem) => ids.add(item.player_id));
      }
    }
    return Array.from(ids);
  }, [tradesSent, tradesReceived]);

  // Consultar detalles de todos los jugadores involucrados
  const { data: allPlayers = [] } = useQuery<Player[]>({
    queryKey: ["tradePlayersDetails", allPlayerIds],
    queryFn: async () => {
      if (!allPlayerIds.length) return [];
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position, nfl_team:nfl_teams(abbreviation)")
        .in("id", allPlayerIds);
      if (error) throw error;
      return data as Player[];
    },
    enabled: allPlayerIds.length > 0,
  });
  const playerMap = useMemo(() => {
    const map = new Map<number, Player>();
    allPlayers.forEach((p: Player) => {
      map.set(p.id, p);
    });
    return map;
  }, [allPlayers]);

  // Handler para aceptar trade con confirmación y ejecución
  const handleAcceptTrade = (tradeId: string) => {
    setConfirmTradeId(tradeId);
  };
  const handleConfirmAccept = async () => {
    if (!confirmTradeId) return;
    setExecutingTrade(true);
    try {
      // 1. Actualizar estado a 'accepted'
      const { error: updateError, data: tradeData } = await supabase
        .from("trades")
        .update({ status: "accepted" })
        .eq("id", confirmTradeId)
        .select()
        .single();
      if (updateError) throw updateError;
      // 2. Ejecutar el trade
      const { error: execError } = await supabase.rpc("execute_trade", { trade_id: confirmTradeId });
      if (execError) throw execError;
      // 3. Notificaciones
      if (tradeData) {
        await supabase.from("notifications").insert([
          {
            user_id: tradeData.proposer_team_id, // proponente
            league_id: tradeData.league_id,
            message: `Tu trade con el equipo ${tradeData.target_team_id} fue aceptado y ejecutado.`,
            type: "success",
            read: false,
          },
          {
            user_id: tradeData.target_team_id, // receptor
            league_id: tradeData.league_id,
            message: `Has aceptado y ejecutado un trade con el equipo ${tradeData.proposer_team_id}.`,
            type: "success",
            read: false,
          },
        ]);
      }
      toast({ title: "Trade ejecutado", description: "El intercambio de jugadores se realizó correctamente." });
      setConfirmTradeId(null);
      queryClient.invalidateQueries({ queryKey: ["tradesReceived", userTeam?.id] });
      queryClient.invalidateQueries({ queryKey: ["tradesSent", userTeam?.id] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "No se pudo ejecutar el trade";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setExecutingTrade(false);
    }
  };

  const handleTradeAction = async (tradeId: string, action: "accepted" | "rejected") => {
    if (action === "accepted") {
      handleAcceptTrade(tradeId);
      return;
    }
    try {
      const { error, data: tradeData } = await supabase
        .from("trades")
        .update({ status: action })
        .eq("id", tradeId)
        .select()
        .single();
      if (error) throw error;
      // Notificaciones
      if (tradeData) {
        await supabase.from("notifications").insert([
          {
            user_id: tradeData.proposer_team_id,
            league_id: tradeData.league_id,
            message: `Tu trade con el equipo ${tradeData.target_team_id} fue rechazado.`,
            type: "info",
            read: false,
          },
          {
            user_id: tradeData.target_team_id,
            league_id: tradeData.league_id,
            message: `Has rechazado un trade con el equipo ${tradeData.proposer_team_id}.`,
            type: "info",
            read: false,
          },
        ]);
      }
      toast({ title: `Trade rechazado` });
      queryClient.invalidateQueries({ queryKey: ["tradesReceived", userTeam?.id] });
      queryClient.invalidateQueries({ queryKey: ["tradesSent", userTeam?.id] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "No se pudo actualizar el trade";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const TradeCard = ({ trade, isSent }: { trade: Trade; isSent: boolean }) => {
    const otherTeam = isSent ? trade.target_team : trade.proposer_team;
    const myPlayers = trade.trade_items?.filter((item) => 
      isSent ? item.team_id === userTeam?.id : item.team_id === trade.target_team_id
    ) || [];
    const theirPlayers = trade.trade_items?.filter((item) => 
      isSent ? item.team_id === trade.target_team_id : item.team_id === trade.proposer_team_id
    ) || [];

    return (
      <Card className="bg-gradient-to-br from-nfl-dark-gray to-nfl-gray border-nfl-light-gray/20 hover:border-nfl-blue/30 transition-all duration-300 hover:shadow-lg hover:shadow-nfl-blue/10">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-nfl-blue/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-nfl-blue" />
              </div>
              <div>
                <CardTitle className="text-lg text-white">
                  {isSent ? `To: ${otherTeam?.name || "Unknown Team"}` : `From: ${otherTeam?.name || "Unknown Team"}`}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {trade.created_at ? new Date(trade.created_at).toLocaleDateString() : "-"}
                  </span>
                </div>
              </div>
            </div>
            <Badge className={`${getStatusColor(trade.status)} border px-3 py-1`}>
              <div className="flex items-center gap-1.5">
                {getStatusIcon(trade.status)}
                <span className="capitalize text-xs font-medium">{trade.status}</span>
              </div>
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
            {/* Your Players */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-nfl-blue flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                {isSent ? "You Give" : "You Get"}
              </h4>
              <div className="space-y-2">
                {myPlayers.map((item) => {
                  const player = playerMap.get(item.player_id);
                  return (
                    <div key={item.id} className="bg-nfl-darker/50 rounded-lg p-3 border border-nfl-light-gray/10">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium text-sm">
                          {player?.name || `Player #${item.player_id}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs px-2 py-0.5 bg-nfl-blue/20 text-nfl-blue border-nfl-blue/30">
                            {player?.position}
                          </Badge>
                          {player?.nfl_team?.abbreviation && (
                            <span className="text-xs text-gray-400">{player.nfl_team.abbreviation}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trade Arrow */}
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-gradient-to-r from-nfl-blue to-nfl-lightblue rounded-full flex items-center justify-center shadow-lg">
                <ArrowRightLeft className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Their Players */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-nfl-lightblue flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                {isSent ? "You Get" : "You Give"}
              </h4>
              <div className="space-y-2">
                {theirPlayers.map((item) => {
                  const player = playerMap.get(item.player_id);
                  return (
                    <div key={item.id} className="bg-nfl-darker/50 rounded-lg p-3 border border-nfl-light-gray/10">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium text-sm">
                          {player?.name || `Player #${item.player_id}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs px-2 py-0.5 bg-nfl-lightblue/20 text-nfl-lightblue border-nfl-lightblue/30">
                            {player?.position}
                          </Badge>
                          {player?.nfl_team?.abbreviation && (
                            <span className="text-xs text-gray-400">{player.nfl_team.abbreviation}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons for Received Trades */}
          {!isSent && trade.status === "pending" && (
            <div className="flex gap-3 pt-4 border-t border-nfl-light-gray/10">
              <Button
                onClick={() => handleTradeAction(trade.id, "accepted")}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Accept Trade
              </Button>
              <Button
                onClick={() => handleTradeAction(trade.id, "rejected")}
                variant="outline"
                className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <LeagueNav leagueId={leagueId} />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-nfl-blue via-nfl-blue/90 to-blue-700 border border-nfl-blue/20 mb-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"2\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
          <div className="relative p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <ArrowRightLeft className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">Trade Center</h1>
                  <p className="text-blue-100 text-lg">Manage your player trades and proposals</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20">
                  <div className="text-white text-sm mb-1">Active Trades</div>
                  <div className="text-2xl font-bold text-white">
                    {[...tradesReceived, ...tradesSent].filter(t => t.status === 'pending').length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="bg-nfl-gray border border-nfl-light-gray/20 p-1">
            <TabsTrigger 
              value="received" 
              className="data-[state=active]:bg-nfl-blue data-[state=active]:text-white px-6 py-2.5 rounded-md transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-current rounded-full"></div>
                Incoming Trades
                {tradesReceived.filter(t => t.status === 'pending').length > 0 && (
                  <Badge className="bg-nfl-red text-white text-xs ml-2">
                    {tradesReceived.filter(t => t.status === 'pending').length}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="sent" 
              className="data-[state=active]:bg-nfl-blue data-[state=active]:text-white px-6 py-2.5 rounded-md transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-current rounded-full"></div>
                Sent Trades
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-6">
            {loadingReceived ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-gray-400">
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span>Loading incoming trades...</span>
                </div>
              </div>
            ) : tradesReceived.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-nfl-dark-gray rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowRightLeft className="w-12 h-12 text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No incoming trades</h3>
                <p className="text-gray-400">You don't have any trade proposals at the moment.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(tradesReceived as unknown as Trade[]).map((trade) => (
                  <TradeCard key={trade.id} trade={trade} isSent={false} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-6">
            {loadingSent ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-gray-400">
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span>Loading sent trades...</span>
                </div>
              </div>
            ) : tradesSent.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-nfl-dark-gray rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowRightLeft className="w-12 h-12 text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No sent trades</h3>
                <p className="text-gray-400">You haven't proposed any trades yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(tradesSent as unknown as Trade[]).map((trade) => (
                  <TradeCard key={trade.id} trade={trade} isSent={true} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal de confirmación de aceptación de trade */}
        <Dialog open={!!confirmTradeId} onOpenChange={open => !open && setConfirmTradeId(null)}>
          <DialogContent className="bg-nfl-dark-gray border-nfl-light-gray/20">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Confirm Trade Acceptance
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-nfl-darker/50 rounded-lg p-4 border border-nfl-light-gray/10 mb-4">
                <p className="text-gray-300 mb-2">
                  Are you sure you want to accept this trade? This action cannot be undone.
                </p>
                <p className="text-sm text-yellow-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  The players will be automatically swapped between teams.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-3">
              <Button 
                variant="outline" 
                onClick={() => setConfirmTradeId(null)} 
                disabled={executingTrade}
                className="border-nfl-light-gray/30 text-gray-300 hover:bg-nfl-light-gray/10"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmAccept} 
                disabled={executingTrade}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0"
              >
                {executingTrade ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Confirm & Execute
                  </div>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
