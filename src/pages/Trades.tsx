import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

export default function Trades() {
  const [tab, setTab] = useState("sent");
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

  return (
    <Layout>
      <LeagueNav leagueId={leagueId} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Trades</h1>
        <Tabs value={tab} onValueChange={setTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="received">Received</TabsTrigger>
          </TabsList>
          <TabsContent value="sent">
            {loadingSent ? (
              <div className="flex items-center gap-2 text-gray-400"><Loader2 className="animate-spin w-4 h-4" />Loading sent trades...</div>
            ) : tradesSent.length === 0 ? (
              <div className="text-gray-400">No sent trades.</div>
            ) : (
              <ul className="space-y-4">
                {(tradesSent as unknown as Trade[]).map((trade) => (
                  <li key={trade.id} className="bg-nfl-dark-gray rounded-lg p-4 border border-nfl-light-gray/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-white">A: {trade.target_team?.name || "Equipo"}</span>
                      <span className="ml-2 text-xs px-2 py-1 rounded bg-nfl-blue/20 text-nfl-blue">{trade.status}</span>
                    </div>
                    <div className="text-gray-300 text-sm mb-1">Players offered:</div>
                    <ul className="list-disc ml-6 text-white text-sm">
                      {trade.trade_items?.filter((item) => item.team_id === userTeam.id).map((item) => (
                        <li key={item.id}>{playerMap.get(item.player_id)?.name || `Jugador #${item.player_id}`}</li>
                      ))}
                    </ul>
                    <div className="text-gray-300 text-sm mt-2 mb-1">Players requested:</div>
                    <ul className="list-disc ml-6 text-white text-sm">
                      {trade.trade_items?.filter((item) => item.team_id === trade.target_team_id).map((item) => (
                        <li key={item.id}>{playerMap.get(item.player_id)?.name || `Jugador #${item.player_id}`}</li>
                      ))}
                    </ul>
                    <div className="text-xs text-gray-500 mt-2">Proposed: {trade.created_at ? new Date(trade.created_at).toLocaleString() : "-"}</div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="received">
            {loadingReceived ? (
              <div className="flex items-center gap-2 text-gray-400"><Loader2 className="animate-spin w-4 h-4" />Loading received trades...</div>
            ) : tradesReceived.length === 0 ? (
              <div className="text-gray-400">No received trades.</div>
            ) : (
              <ul className="space-y-4">
                {(tradesReceived as unknown as Trade[]).map((trade) => (
                  <li key={trade.id} className="bg-nfl-dark-gray rounded-lg p-4 border border-nfl-light-gray/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-white">De: {trade.proposer_team?.name || "Equipo"}</span>
                      <span className="ml-2 text-xs px-2 py-1 rounded bg-nfl-blue/20 text-nfl-blue">{trade.status}</span>
                    </div>
                    <div className="text-gray-300 text-sm mb-1">Players offered:</div>
                    <ul className="list-disc ml-6 text-white text-sm">
                      {trade.trade_items?.filter((item) => item.team_id === trade.proposer_team_id).map((item) => (
                        <li key={item.id}>{playerMap.get(item.player_id)?.name || `Jugador #${item.player_id}`}</li>
                      ))}
                    </ul>
                    <div className="text-gray-300 text-sm mt-2 mb-1">Players requested:</div>
                    <ul className="list-disc ml-6 text-white text-sm">
                      {trade.trade_items?.filter((item) => item.team_id === userTeam.id).map((item) => (
                        <li key={item.id}>{playerMap.get(item.player_id)?.name || `Jugador #${item.player_id}`}</li>
                      ))}
                    </ul>
                    <div className="text-xs text-gray-500 mt-2">Proposed: {trade.created_at ? new Date(trade.created_at).toLocaleString() : "-"}</div>
                    {/* Botones de aceptar/rechazar si el trade está pendiente */}
                    {trade.status === "pending" && (
                      <div className="flex gap-2 mt-4">
                        <button
                          className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                          onClick={() => handleTradeAction(trade.id, "accepted")}
                        >Accept</button>
                        <button
                          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                          onClick={() => handleTradeAction(trade.id, "rejected")}
                        >Reject</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
        {/* Modal de confirmación de aceptación de trade */}
        <Dialog open={!!confirmTradeId} onOpenChange={open => !open && setConfirmTradeId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm accept trade</DialogTitle>
            </DialogHeader>
            <div className="py-2 text-gray-300">
              Are you sure you want to accept this trade? The players will be automatically swapped.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmTradeId(null)} disabled={executingTrade}>Cancel</Button>
              <Button className="bg-nfl-blue hover:bg-nfl-lightblue" onClick={handleConfirmAccept} disabled={executingTrade}>
                {executingTrade ? "Executing..." : "Confirm and execute"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

/*
SQL CORREGIDO PARA validate_waiver_request (solo verifica jugadores ocupados en la liga actual):

CREATE OR REPLACE FUNCTION validate_waiver_request(
  team_id UUID,
  player_to_add_id INTEGER,
  player_to_drop_id INTEGER,
  week_num INTEGER
) RETURNS JSON AS $$
DECLARE
  roster_limits JSON;
  player_to_add_position VARCHAR;
  player_to_drop_exists BOOLEAN DEFAULT false;
  player_already_claimed BOOLEAN DEFAULT false;
  validation_result JSON;
  league_id UUID;
BEGIN
  -- Obtener la liga del equipo que hace la solicitud
  SELECT league_id INTO league_id FROM fantasy_teams WHERE id = team_id;

  -- Obtener posición del jugador a agregar
  SELECT position INTO player_to_add_position
  FROM players WHERE id = player_to_add_id;

  -- Validar si el jugador ya está en algún roster activo de ESTA LIGA
  SELECT EXISTS(
    SELECT 1
    FROM team_rosters tr
    JOIN fantasy_teams ft ON tr.fantasy_team_id = ft.id
    WHERE tr.player_id = player_to_add_id
      AND tr.week = week_num
      AND tr.is_active = true
      AND ft.league_id = league_id
  ) INTO player_already_claimed;

  -- Verificar límites de roster
  SELECT check_roster_limits(team_id, week_num, player_to_add_position) INTO roster_limits;

  -- Si se especifica jugador a soltar, verificar que existe en el roster
  IF player_to_drop_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM team_rosters
      WHERE fantasy_team_id = team_id
        AND player_id = player_to_drop_id
        AND week = week_num
        AND is_active = true
    ) INTO player_to_drop_exists;
  END IF;

  -- Validar lógica (orden importante: verificar disponibilidad primero)
  IF player_already_claimed THEN
    validation_result := json_build_object(
      'valid', false,
      'error', 'Este jugador ya fue reclamado por otro equipo con mayor prioridad'
    );
  ELSIF (roster_limits->>'needs_drop')::boolean AND player_to_drop_id IS NULL THEN
    validation_result := json_build_object(
      'valid', false,
      'error', 'Roster lleno. Debes especificar un jugador para soltar.'
    );
  ELSIF player_to_drop_id IS NOT NULL AND NOT player_to_drop_exists THEN
    validation_result := json_build_object(
      'valid', false,
      'error', 'El jugador especificado para soltar no está en tu roster.'
    );
  ELSIF (roster_limits->>'position_full')::boolean AND player_to_drop_id IS NULL THEN
    validation_result := json_build_object(
      'valid', false,
      'error', format('Ya tienes el máximo de jugadores en posición %s', player_to_add_position)
    );
  ELSE
    validation_result := json_build_object(
      'valid', true,
      'message', 'Waiver request válida'
    );
  END IF;

  RETURN json_build_object(
    'validation', validation_result,
    'roster_limits', roster_limits,
    'player_to_add_position', player_to_add_position,
    'player_to_drop_exists', player_to_drop_exists
  );
END;
$$ LANGUAGE plpgsql;
*/ 