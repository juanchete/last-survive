import { Layout } from "@/components/Layout";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlayerCard } from "@/components/PlayerCard";
import { WeeklyElimination } from "@/components/WeeklyElimination";
import { Search, Award } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAvailablePlayers } from "@/hooks/useAvailablePlayers";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useDraftState } from "@/hooks/useDraftState";
import { useIsMyDraftTurn } from "@/hooks/useIsMyDraftTurn";
import { draftPlayer } from "@/lib/draft";
import { useMyRoster } from "@/hooks/useMyRoster";
import type { Player } from "@/types";

export default function Draft() {
  // Obtener leagueId desde la URL
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "default";

  // Hooks de datos reales
  const { data: userTeam, isLoading: loadingUserTeam } = useUserFantasyTeam(leagueId);
  const { data: draftState, isLoading: loadingDraftState } = useDraftState(leagueId);
  const currentWeek = 1; // Puedes obtener la semana real con useCurrentWeek si lo necesitas
  const { data: availablePlayers = [], isLoading: loadingPlayers } = useAvailablePlayers(leagueId, currentWeek);
  // Llamar siempre el hook, aunque userTeam no esté listo
  const myTeamId = userTeam?.id || "";
  const isMyTurn = useIsMyDraftTurn(leagueId, myTeamId);
  const { data: myRoster = [] } = useMyRoster(userTeam?.id || "", currentWeek);

  // State para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('points');
  const [loadingPick, setLoadingPick] = useState(false);

  // Límites de slots
  const SLOT_LIMITS = {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,
    K: 1,
    DEF: 1,
    BENCH: 7,
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
    if (["RB", "WR", "TE"].includes(player.position) && canDraftInSlot("FLEX")) return "FLEX";
    if (player.position === "K" && canDraftInSlot("K")) return "K";
    if (player.position === "DEF" && canDraftInSlot("DEF")) return "DEF";
    if (canDraftInSlot("BENCH")) return "BENCH";
    return null;
  };

  // Mensaje de feedback para slots llenos
  const getSlotFeedback = (player: Player) => {
    if (player.position === "QB" && !canDraftInSlot("QB")) return "Ya tienes el máximo de QBs titulares.";
    if (player.position === "RB" && !canDraftInSlot("RB") && !canDraftInSlot("FLEX")) return "Ya tienes el máximo de RBs titulares y FLEX.";
    if (player.position === "WR" && !canDraftInSlot("WR") && !canDraftInSlot("FLEX")) return "Ya tienes el máximo de WRs titulares y FLEX.";
    if (player.position === "TE" && !canDraftInSlot("TE") && !canDraftInSlot("FLEX")) return "Ya tienes el máximo de TEs titulares y FLEX.";
    if (player.position === "K" && !canDraftInSlot("K")) return "Ya tienes el máximo de Kickers.";
    if (player.position === "DEF" && !canDraftInSlot("DEF")) return "Ya tienes el máximo de Defensas.";
    if (!canDraftInSlot("BENCH")) return "Tu banca está llena.";
    return null;
  };

  // Filtrar y ordenar jugadores
  const filteredPlayers = availablePlayers.filter(player => {
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

  // Manejar el pick de un jugador
  const handleDraft = async (playerId: number, slot: string) => {
    if (!userTeam) return;
    setLoadingPick(true);
    try {
      await draftPlayer({
        leagueId,
        fantasyTeamId: userTeam.id,
        playerId,
        week: currentWeek,
        slot,
      });
      // Aquí podrías refetchear los datos si lo deseas
    } finally {
      setLoadingPick(false);
    }
  };

  // Mostrar el orden de picks y el turno actual
  const renderDraftOrder = () => {
    if (!draftState?.draft_order) return null;
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {draftState.draft_order.map((teamId: string, idx: number) => (
          <Badge key={teamId} className={idx === draftState.current_pick ? "bg-nfl-blue text-white" : "bg-nfl-gray text-gray-300"}>
            Pick {idx + 1} {idx === draftState.current_pick && "(Turno)"}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Draft de Jugadores</h1>
              <Badge className="bg-nfl-blue">
                {userTeam?.players?.length || 0} Jugadores en Roster
              </Badge>
            </div>
            {/* Estado del draft */}
            {loadingDraftState ? (
              <p className="text-gray-400 mb-2">Cargando estado del draft...</p>
            ) : draftState ? (
              <div className="mb-4">
                <div className="mb-2">
                  Estado: <span className="font-bold text-nfl-blue">{draftState.draft_status}</span>
                </div>
                {renderDraftOrder()}
                {isMyTurn && <div className="text-nfl-green font-bold">¡Es tu turno para elegir!</div>}
                {!isMyTurn && <div className="text-gray-400">Esperando el turno...</div>}
              </div>
            ) : null}
            {/* Filtros */}
            <Card className="mb-6 bg-nfl-gray border-nfl-light-gray/20">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="search" className="text-sm text-gray-400 mb-1 block">Buscar Jugadores</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="search"
                        placeholder="Buscar por nombre o equipo..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="position" className="text-sm text-gray-400 mb-1 block">Posición</label>
                    <Select value={positionFilter} onValueChange={setPositionFilter}>
                      <SelectTrigger id="position">
                        <SelectValue placeholder="Todas las posiciones" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="QB">Quarterback (QB)</SelectItem>
                        <SelectItem value="RB">Running Back (RB)</SelectItem>
                        <SelectItem value="WR">Wide Receiver (WR)</SelectItem>
                        <SelectItem value="TE">Tight End (TE)</SelectItem>
                        <SelectItem value="K">Kicker (K)</SelectItem>
                        <SelectItem value="DEF">Defensa (DEF)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="sort" className="text-sm text-gray-400 mb-1 block">Ordenar por</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sort">
                        <SelectValue placeholder="Puntos (Mayor a menor)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="points">Puntos (Mayor a menor)</SelectItem>
                        <SelectItem value="name">Nombre (A-Z)</SelectItem>
                        <SelectItem value="position">Posición</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Jugadores disponibles */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Jugadores Disponibles</h2>
                <Badge variant="outline" className="bg-transparent">
                  {filteredPlayers.length} Jugadores
                </Badge>
              </div>
              {loadingPlayers ? (
                <p className="text-gray-400">Cargando jugadores...</p>
              ) : filteredPlayers.length > 0 ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {sortedPlayers.map(player => {
                    const slot = getAvailableSlot(player);
                    const canDraft = isMyTurn && !loadingPick && !!slot;
                    const feedback = !canDraft ? getSlotFeedback(player) : null;
                    return (
                      <div key={player.id} className="flex flex-col gap-2">
                        <PlayerCard
                          player={{
                            ...player,
                            position: player.position as 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF',
                          }}
                          onDraft={canDraft ? (playerId) => handleDraft(Number(playerId), slot!) : undefined}
                          showDraftButton={canDraft}
                        />
                        {feedback && (
                          <div className="text-xs text-red-400 px-2">{feedback}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Card className="bg-nfl-gray border-nfl-light-gray/20 p-8 text-center">
                  <div className="text-gray-400 mb-2">No hay jugadores que coincidan con tu búsqueda</div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setPositionFilter('all');
                    }}
                  >
                    Resetear Filtros
                  </Button>
                </Card>
              )}
            </div>
          </div>
          {/* Sidebar */}
          <div className="lg:w-80 space-y-8">
            <WeeklyElimination />
            {/* Reglas del draft */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-nfl-blue" />
                  <span>Reglas del Draft</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4 text-sm text-gray-300">
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> Solo puedes seleccionar cuando sea tu turno.
                  </p>
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> El draft es en modo serpiente, el orden se invierte cada ronda.
                  </p>
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> Debes completar tu plantilla respetando los límites de cada posición.
                  </p>
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> Si no eliges a tiempo, el sistema puede saltar tu turno.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
