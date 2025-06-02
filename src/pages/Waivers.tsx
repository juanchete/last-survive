import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { LeagueNav } from "@/components/LeagueNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useWaiverPlayers } from "@/hooks/useWaiverPlayers";
import { useWaiverPriority } from "@/hooks/useWaiverPriority";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useMyWaiverRequests } from "@/hooks/useMyWaiverRequests";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { useRosterLimits } from "@/hooks/useRosterLimits";
// import { useWaiverDeadline } from "@/hooks/useWaiverDeadline";
import { requestWaiver } from "@/lib/draft";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Clock, AlertTriangle, CheckCircle, Users } from "lucide-react";
import { useLocation } from "react-router-dom";
import type { Player } from "@/types";

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
  // const { data: waiverDeadline } = useWaiverDeadline(leagueId);

  // Form state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [selectedDropPlayerId, setSelectedDropPlayerId] = useState<string>("");
  const [loadingRequest, setLoadingRequest] = useState(false);

  // Get player position for roster limits
  const selectedPlayer = waiverPlayers.find(p => p.id === selectedPlayerId);
  const { data: rosterLimits } = useRosterLimits(
    userTeam?.id || "",
    currentWeek,
    selectedPlayer?.position || ""
  );

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

  const formatTimeRemaining = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <Layout>
      <LeagueNav leagueId={leagueId} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-nfl-blue" />
          <h1 className="text-3xl font-bold">Waivers - Week {currentWeek}</h1>
        </div>

        {/* Waiver Deadline Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Waiver Deadline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Temporal - simplificado hasta que funcionen las funciones SQL */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50">
                <Clock className="w-4 h-4 mr-1" />
                Tuesday 11:00 PM
              </Badge>
              <span className="text-sm text-gray-600">
                Aproximadamente 2 días restantes
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>¿Cómo funciona el waiver?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-gray-300 text-sm space-y-2">
              <li>Durante el periodo de waivers puedes solicitar jugadores que no estén en ningún equipo.</li>
              <li>La prioridad determina quién recibe al jugador si hay varias solicitudes.</li>
              <li>Si tu roster está lleno, <strong>debes seleccionar un jugador para soltar</strong>.</li>
              <li>Cuando termina el periodo, los jugadores no reclamados pasan a ser agentes libres.</li>
              <li>Recibirás notificaciones con los resultados de tus solicitudes.</li>
            </ul>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Waiver Priority */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Waiver Priority</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPriority ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="animate-spin w-4 h-4" /> Loading priority...
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {waiverPriority.map((wp, idx) => (
                      <li key={wp.fantasy_team_id} className="flex items-center gap-3">
                        <Badge 
                          variant={userTeam?.id === wp.fantasy_team_id ? "default" : "outline"}
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            userTeam?.id === wp.fantasy_team_id ? "bg-nfl-blue text-white" : "bg-gray-100"
                          }`}
                        >
                          {idx + 1}
                        </Badge>
                        <span className={`text-sm ${
                          userTeam?.id === wp.fantasy_team_id ? "font-bold text-nfl-blue" : "text-gray-600"
                        }`}>
                          Team {wp.fantasy_team_id?.slice(0, 8)}
                          {userTeam?.id === wp.fantasy_team_id && " (You)"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Waiver Request Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Solicitar Jugador</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Roster Status Alert */}
                {rosterLimits && (
                  <Alert className={rosterLimits.needs_drop ? "border-orange-500 bg-orange-50" : "border-green-500 bg-green-50"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="text-sm">
                        <strong>Roster Status:</strong> {rosterLimits.current_roster_count}/{rosterLimits.max_roster_size} jugadores
                        {rosterLimits.needs_drop && (
                          <span className="text-orange-700 block mt-1">
                            ⚠️ Roster lleno - Debes seleccionar un jugador para soltar
                          </span>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Player Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jugador a solicitar:</label>
                  <select
                    value={selectedPlayerId}
                    onChange={e => setSelectedPlayerId(e.target.value)}
                    className="w-full h-12 rounded-md border px-3 py-2 text-sm bg-white"
                    disabled={loadingPlayers || loadingRequest}
                  >
                    <option value="">Selecciona un jugador</option>
                    {waiverPlayers.map(player => (
                      <option 
                        key={player.id} 
                        value={player.id}
                        disabled={myWaiverRequests.some(req => req.player_id?.toString() === player.id)}
                      >
                        {player.name} ({player.position} - {player.team}) | {player.points} pts
                      </option>
                    ))}
                  </select>
                </div>

                {/* Drop Player Selection - Solo mostrar si es necesario */}
                {rosterLimits?.needs_drop && selectedPlayerId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-orange-700">
                      Jugador a soltar (requerido):
                    </label>
                    <select
                      value={selectedDropPlayerId}
                      onChange={e => setSelectedDropPlayerId(e.target.value)}
                      className="w-full h-12 rounded-md border border-orange-300 px-3 py-2 text-sm bg-white"
                      disabled={loadingRoster || loadingRequest}
                    >
                      <option value="">Selecciona jugador para soltar</option>
                      {activeRosterPlayers.map(player => (
                        <option key={player.id} value={player.id}>
                          {player.name} ({player.position} - {player.team}) | {player.points} pts
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Position Limits Info */}
                {selectedPlayer && rosterLimits && (
                  <Alert className="border-blue-500 bg-blue-50">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="text-sm text-blue-700">
                        <strong>{selectedPlayer.position} Limits:</strong> {rosterLimits.current_position_count}/{rosterLimits.max_position_count}
                        {rosterLimits.position_full && (
                          <span className="block mt-1">
                            ⚠️ Ya tienes el máximo de jugadores en esta posición
                          </span>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleRequest}
                  disabled={
                    !selectedPlayerId || 
                    alreadyRequested || 
                    loadingRequest ||
                    (rosterLimits?.needs_drop && !selectedDropPlayerId)
                  }
                  className="w-full h-12"
                  size="lg"
                >
                  {loadingRequest ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 mr-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Solicitar Waiver
                      {selectedDropPlayerId && " (con Drop)"}
                    </>
                  )}
                </Button>

                {alreadyRequested && (
                  <Alert className="border-yellow-500 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-yellow-700">
                      Ya solicitaste este jugador esta semana.
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                {/* My Requests */}
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Tus Solicitudes
                  </h3>
                  {loadingRequests ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="animate-spin w-4 h-4" /> Loading requests...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myWaiverRequests.length === 0 && (
                        <div className="text-gray-400 text-center py-4">
                          No tienes solicitudes esta semana.
                        </div>
                      )}
                      {myWaiverRequests.map(req => (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">
                              {waiverPlayers.find(p => p.id === req.player_id?.toString())?.name || `Jugador ${req.player_id}`}
                            </span>
                            {req.drop_player_id && (
                              <span className="text-sm text-gray-600">
                                (Drop: {activeRosterPlayers.find(p => p.id === req.drop_player_id?.toString())?.name || `Jugador ${req.drop_player_id}`})
                              </span>
                            )}
                          </div>
                          <Badge className={
                            req.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                            req.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                            'bg-red-100 text-red-800 border-red-300'
                          }>
                            {req.status === 'pending' ? 'Pendiente' :
                             req.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Waivers;
