import { Layout } from "@/components/Layout";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlayerCard } from "@/components/PlayerCard";
import { WeeklyElimination } from "@/components/WeeklyElimination";
import { Search, Award, Info, ListOrdered } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { useWaiverPlayers } from "@/hooks/useWaiverPlayers";
import { useMyWaiverRequests } from "@/hooks/useMyWaiverRequests";
import { useWaiverPriority } from "@/hooks/useWaiverPriority";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useToast } from "@/hooks/use-toast";
import { requestWaiver } from "@/lib/draft";
import type { Player } from "@/types";

export default function Waivers() {
  // Get leagueId from URL
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "default";
  
  // Get the current week
  const { data: currentWeekData } = useCurrentWeek(leagueId);
  const currentWeek = currentWeekData?.number || 1;
  
  // Fetch user team
  const { data: userTeam, isLoading: loadingUserTeam } = useUserFantasyTeam(leagueId);
  const myTeamId = userTeam?.id || "";
  
  // Fetch waiver data
  const { data: waiversPlayers = [], isLoading: loadingPlayers } = useWaiverPlayers(leagueId, currentWeek);
  const { data: myRequests = [], isLoading: loadingRequests } = useMyWaiverRequests(leagueId, currentWeek, myTeamId);
  const { data: waiverPriority = [], isLoading: loadingPriority } = useWaiverPriority(leagueId, currentWeek);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('points');
  const [loadingRequest, setLoadingRequest] = useState(false);
  const { toast } = useToast();

  // Filter and sort players
  const filteredPlayers = waiversPlayers.filter(player => {
    if (positionFilter !== 'all' && player.position !== positionFilter) return false;
    if (searchTerm && !player.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !player.team?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });
  
  // Sort players
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (sortBy === 'points') return (b.points || 0) - (a.points || 0);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'position') return a.position.localeCompare(b.position);
    return 0;
  }).map(player => ({
    ...player,
    position: player.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF"
  }));

  // Check if player is already requested
  const isPlayerRequested = (playerId: number | string) => {
    return myRequests.some(request => request.player_id === Number(playerId));
  };

  // Get my waiver priority position
  const getMyPriority = () => {
    const myPriority = waiverPriority.find(p => p.fantasy_team_id === myTeamId);
    return myPriority?.priority || "N/A";
  };

  // Handle waiver request
  const handleWaiverRequest = async (playerId: number | string) => {
    if (!userTeam) return;
    if (isPlayerRequested(playerId)) {
      toast({
        title: "Ya has solicitado este jugador",
        description: "No puedes solicitar el mismo jugador dos veces.",
        variant: "destructive"
      });
      return;
    }
    
    setLoadingRequest(true);
    try {
      await requestWaiver({
        leagueId,
        week: currentWeek,
        fantasyTeamId: userTeam.id,
        playerId: Number(playerId)
      });
      
      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud de waiver ha sido registrada.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar tu solicitud.",
        variant: "destructive"
      });
    } finally {
      setLoadingRequest(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Sistema de Waivers</h1>
              <Badge className="bg-nfl-blue">
                Semana {currentWeek}
              </Badge>
            </div>
            
            {/* My Priority */}
            <div className="mb-6">
              <Card className="bg-nfl-gray border-nfl-light-gray/20">
                <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
                  <CardTitle className="flex items-center gap-2">
                    <ListOrdered className="w-5 h-5 text-nfl-blue" />
                    <span>Mi Prioridad de Waiver</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-400">Tu posición en la cola de waivers:</div>
                    <div className="font-bold text-lg text-nfl-blue">
                      {loadingPriority ? 'Cargando...' : `${getMyPriority()}° lugar`}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    La prioridad determina quién obtiene el jugador cuando múltiples equipos lo solicitan.
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* My Waiver Requests */}
            <Card className="mb-6 bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-nfl-blue" />
                  <span>Mis Solicitudes de Waiver</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {loadingRequests ? (
                  <p className="text-gray-400">Cargando solicitudes...</p>
                ) : myRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No tienes solicitudes de waiver pendientes.</p>
                    <p className="text-sm text-gray-500 mt-2">Usa el buscador de abajo para solicitar jugadores.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jugador</TableHead>
                        <TableHead>Posición</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myRequests.map((request) => {
                        const player = waiversPlayers.find(p => Number(p.id) === request.player_id);
                        return (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">{player?.name || `Jugador #${request.player_id}`}</TableCell>
                            <TableCell>{player?.position || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={request.status === "pending" ? "outline" : "default"}>
                                {request.status === "pending" ? "Pendiente" : 
                                 request.status === "approved" ? "Aprobado" : "Rechazado"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            
            {/* Filters */}
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
            
            {/* Available Players */}
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
                    const isRequested = isPlayerRequested(player.id);
                    return (
                      <div key={player.id} className="flex flex-col gap-2">
                        <PlayerCard
                          player={player}
                          onDraft={
                            !loadingRequest && !isRequested 
                              ? () => handleWaiverRequest(player.id) 
                              : undefined
                          }
                          showDraftButton={!isRequested}
                          buttonText="Solicitar Waiver"
                        />
                        {isRequested && (
                          <div className="text-xs text-nfl-green px-2">
                            Ya has solicitado este jugador
                          </div>
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
            
            {/* Waiver Rules */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-nfl-blue" />
                  <span>Reglas de Waivers</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4 text-sm text-gray-300">
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> Las solicitudes de waivers se procesan cada semana después de los partidos.
                  </p>
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> La prioridad se determina en orden inverso a la clasificación de la liga.
                  </p>
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> Si solicitas varios jugadores, se procesarán en el orden que los hayas seleccionado.
                  </p>
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> Después de obtener un jugador por waivers, pasarás al final de la cola de prioridad.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Waiver Priority List */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-nfl-blue" />
                  <span>Orden de Prioridad</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {loadingPriority ? (
                  <p className="text-gray-400">Cargando prioridades...</p>
                ) : (
                  <div className="space-y-2">
                    {waiverPriority.sort((a, b) => a.priority - b.priority).map((item) => (
                      <div 
                        key={item.fantasy_team_id} 
                        className={`flex justify-between items-center p-2 rounded ${item.fantasy_team_id === myTeamId ? 'bg-nfl-dark-blue/10' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge className="bg-nfl-gray border border-nfl-light-gray/50 text-white">
                            {item.priority}
                          </Badge>
                          <span className={item.fantasy_team_id === myTeamId ? 'font-bold' : ''}>
                            {item.team_name}
                          </span>
                        </div>
                        {item.fantasy_team_id === myTeamId && (
                          <Badge className="bg-nfl-blue">Tú</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
