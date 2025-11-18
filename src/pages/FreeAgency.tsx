import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useLocation } from "react-router-dom";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useFreeAgentPlayers } from "@/hooks/useFreeAgentPlayers";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { DraftPlayerList } from "@/components/DraftPlayerList";

export default function FreeAgency() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "";
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: userTeam } = useUserFantasyTeam(leagueId);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>("");
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const [selectedDropPlayer, setSelectedDropPlayer] = useState<string>("");

  // Get current week
  const { data: currentWeek } = useQuery({
    queryKey: ["currentWeek", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weeks")
        .select("number")
        .eq("league_id", leagueId)
        .eq("status", "active")
        .single();

      if (error) return { number: 1 };
      return data;
    },
    enabled: !!leagueId,
  });

  const weekNumber = currentWeek?.number || 1;

  // Get free agent players for this league
  const { data: freeAgentPlayers = [] } = useFreeAgentPlayers(leagueId, weekNumber);

  // Get user's current roster
  const slotOrder = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'DP'];
  const { data: userRosterData = [] } = useRosterWithPlayerDetails(userTeam?.id || "", weekNumber);

  const userRoster = [...userRosterData].sort((a, b) => {
    const aSlot = a.slot || a.position;
    const bSlot = b.slot || b.position;
    const aIndex = slotOrder.indexOf(aSlot);
    const bIndex = slotOrder.indexOf(bSlot);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return aSlot.localeCompare(bSlot);
  });

  const handleAddPlayer = async () => {
    if (!selectedPlayer || !userTeam) {
      toast({
        title: "Error",
        description: "Por favor selecciona un jugador para agregar",
        variant: "destructive",
      });
      return;
    }

    // Validate roster size
    const currentRosterSize = userRoster.length;
    const finalSize = selectedDropPlayer ? currentRosterSize : currentRosterSize + 1;

    if (finalSize > 10) {
      toast({
        title: "Error",
        description: "Tu roster está lleno. Debes soltar un jugador primero.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('claim_free_agent', {
        p_league_id: leagueId,
        p_fantasy_team_id: userTeam.id,
        p_player_id: parseInt(selectedPlayer),
        p_drop_player_id: selectedDropPlayer ? parseInt(selectedDropPlayer) : null,
        p_week: weekNumber
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Failed to add free agent");
      }

      const playerName = freeAgentPlayers.find(p => p.id === selectedPlayer)?.name || "Jugador";

      toast({
        title: "✅ ¡Jugador Agregado!",
        description: selectedDropPlayer
          ? `${playerName} ha sido agregado a tu banca. Se soltó otro jugador.`
          : `${playerName} ha sido agregado a tu banca (BENCH). Actívalo desde tu equipo.`,
      });

      setShowAddPlayerDialog(false);
      setSelectedPlayer(null);
      setSelectedDropPlayer("");

      // Refresh data
      await queryClient.invalidateQueries({
        queryKey: ["rosterWithDetails", userTeam.id, weekNumber]
      });
      await queryClient.invalidateQueries({
        queryKey: ["freeAgentPlayers", leagueId, weekNumber]
      });
    } catch (error) {
      console.error("Error adding free agent:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el jugador. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handlePlayerClick = (playerId: number | string, playerName?: string) => {
    setSelectedPlayer(String(playerId));
    setSelectedPlayerName(playerName || "");
    setShowAddPlayerDialog(true);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-nfl-dark-gray">
        {/* League Header */}
        <LeagueHeader leagueId={leagueId} />

        {/* League Navigation Tabs */}
        <LeagueTabs leagueId={leagueId} activeTab="free-agency" />

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Free Agency</h2>
            <p className="text-gray-400">Add players to your roster immediately - first come, first served!</p>
          </div>

          {/* Player List */}
          <DraftPlayerList
            leagueId={leagueId}
            week={weekNumber}
            onSelectPlayer={handlePlayerClick}
            config={{
              showADP: false,
              showSeasonPoints: false,
              showWeekPoints: true,
              buttonText: "Add",
              buttonIcon: <UserPlus className="h-4 w-4" />,
              validateTurn: false,
              validateSlots: false,
              useExternalData: true,
              externalPlayers: freeAgentPlayers,
              externalTotalCount: freeAgentPlayers.length,
              externalTotalPages: Math.ceil(freeAgentPlayers.length / 25),
              externalIsLoading: false,
            }}
          />
        </div>
      </div>

      {/* Add Player Dialog */}
      <Dialog open={showAddPlayerDialog} onOpenChange={setShowAddPlayerDialog}>
        <DialogContent className="bg-nfl-gray border-nfl-light-gray/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Agregar Jugador de Free Agency</DialogTitle>
            <DialogDescription className="text-gray-400">
              {userRoster.length < 10 ? (
                <>
                  El jugador se agregará a tu banca (BENCH). Roster actual: {userRoster.length}/10 jugadores
                  <br />
                  <span className="text-nfl-accent">✓ Tienes {10 - userRoster.length} espacio{10 - userRoster.length !== 1 ? 's' : ''} disponible{10 - userRoster.length !== 1 ? 's' : ''}</span>
                </>
              ) : (
                <>
                  Tu roster está lleno ({userRoster.length}/10). Debes liberar un jugador primero.
                  <br />
                  <span className="text-red-400">⚠️ Roster completo - selecciona un jugador para soltar</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {userRoster.length >= 10 && (
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Soltar Jugador (Requerido - roster lleno)
                </label>
                <Select value={selectedDropPlayer} onValueChange={setSelectedDropPlayer}>
                  <SelectTrigger className="bg-nfl-dark-gray border-nfl-light-gray/20 text-white">
                    <SelectValue placeholder="Selecciona un jugador para soltar" />
                  </SelectTrigger>
                  <SelectContent className="bg-nfl-dark-gray border-nfl-light-gray/20">
                    {userRoster.map((player) => (
                      <SelectItem key={player.id} value={player.id} className="text-white">
                        {player.name} ({player.position}) - {player.slot || 'BENCH'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {userRoster.length < 10 && (
              <div className="bg-nfl-dark-gray/50 border border-nfl-light-gray/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-nfl-accent/20 flex items-center justify-center">
                    <span className="text-nfl-accent text-lg">ℹ️</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium mb-1">Información sobre la Banca</h4>
                    <p className="text-sm text-gray-400">
                      El jugador se agregará a tu banca (BENCH) y no estará activo inicialmente.
                      Podrás activarlo desde la página de tu equipo más adelante.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAddPlayerDialog(false)}
                className="border-nfl-light-gray/20 text-gray-300 hover:bg-nfl-light-gray/10"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddPlayer}
                disabled={userRoster.length >= 10 && !selectedDropPlayer}
                className="bg-nfl-accent hover:bg-nfl-accent/90 text-black"
              >
                {userRoster.length >= 10 ? 'Intercambiar Jugadores' : 'Agregar a Banca'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
