import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { LeagueNav } from "@/components/LeagueNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWaiverPlayers } from "@/hooks/useWaiverPlayers";
import { useWaiverPriority } from "@/hooks/useWaiverPriority";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useMyWaiverRequests } from "@/hooks/useMyWaiverRequests";
import { requestWaiver } from "@/lib/draft";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { Player } from "@/types";

const Waivers = () => {
  // Aquí debes obtener leagueId y currentWeek de tu store global o props
  const leagueId = ""; // Reemplaza por tu lógica real
  const currentWeek = 1; // Reemplaza por tu lógica real
  const { data: userTeam } = useUserFantasyTeam(leagueId);
  const { data: waiverPlayers = [], isLoading: loadingPlayers } = useWaiverPlayers(leagueId, currentWeek);
  const { data: waiverPriority = [], isLoading: loadingPriority } = useWaiverPriority(leagueId, currentWeek);
  const { data: myWaiverRequests = [], isLoading: loadingRequests, refetch } = useMyWaiverRequests(leagueId, currentWeek, userTeam?.id || "");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [waiverPlayersState, setWaiverPlayersState] = useState<Player[]>([]);

  const handleRequest = async () => {
    if (!selectedPlayerId || !userTeam) return;
    setLoadingRequest(true);
    try {
      await requestWaiver({
        leagueId,
        week: currentWeek,
        fantasyTeamId: userTeam.id,
        playerId: Number(selectedPlayerId),
      });
      toast({ title: "Solicitud enviada", description: "Tu waiver fue registrado." });
      setSelectedPlayerId("");
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

  return (
    <Layout>
      <LeagueNav leagueId={leagueId} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Waivers - Week {currentWeek}</h1>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>¿Cómo funciona el waiver?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-gray-300 text-sm space-y-1">
              <li>Durante el periodo de waivers puedes solicitar jugadores que no estén en ningún equipo.</li>
              <li>La prioridad determina quién recibe al jugador si hay varias solicitudes.</li>
              <li>Cuando termina el periodo, los jugadores no reclamados pasan a ser agentes libres.</li>
              <li>Puedes ver el estado de tus solicitudes abajo.</li>
            </ul>
          </CardContent>
        </Card>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Prioridad de waivers */}
          <Card>
            <CardHeader>
              <CardTitle>Waivers Priority</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPriority ? (
                <div className="flex items-center gap-2 text-gray-400"><Loader2 className="animate-spin" /> Loading priority...</div>
              ) : (
                <ul className="space-y-2">
                  {waiverPriority.map((wp, idx) => (
                    <li key={wp.fantasy_team_id} className="flex items-center gap-2">
                      <Badge className={userTeam?.id === wp.fantasy_team_id ? "bg-nfl-blue text-white" : "bg-nfl-gray text-gray-300"}>
                        {idx + 1}
                      </Badge>
                      <span className={userTeam?.id === wp.fantasy_team_id ? "font-bold text-nfl-blue" : ""}>
                        Team {wp.fantasy_team_id}{userTeam?.id === wp.fantasy_team_id && " (You)"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          {/* Solicitar jugador */}
          <Card>
            <CardHeader>
              <CardTitle>Solicitar Jugador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <select
                  value={selectedPlayerId}
                  onChange={e => setSelectedPlayerId(e.target.value)}
                  className="w-full h-10 rounded-md border px-3 py-2 text-sm"
                  disabled={loadingPlayers || loadingRequest}
                >
                  <option value="">Selecciona un jugador</option>
                  {waiverPlayers.map(player => (
                    <option key={player.id} value={player.id} disabled={myWaiverRequests.some(req => req.player_id?.toString() === player.id)}>
                      {player.name} ({player.position} - {player.team}) | {player.points} pts
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleRequest}
                  disabled={!selectedPlayerId || alreadyRequested || loadingRequest}
                  className="w-full"
                >
                  {loadingRequest ? <Loader2 className="animate-spin w-4 h-4 mr-2 inline" /> : null}
                  Solicitar Waiver
                </Button>
                {alreadyRequested && (
                  <div className="text-xs text-yellow-500">Ya solicitaste este jugador esta semana.</div>
                )}
              </div>
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Your Requests</h3>
                {loadingRequests ? (
                  <div className="flex items-center gap-2 text-gray-400"><Loader2 className="animate-spin" /> Loading requests...</div>
                ) : (
                  <div className="space-y-2">
                    {myWaiverRequests.length === 0 && (
                      <div className="text-gray-400">You have not requested any players this week.</div>
                    )}
                    {myWaiverRequests.map(req => (
                      <div key={req.id} className="flex items-center gap-2">
                        <span className="font-medium">
                          {waiverPlayers.find(p => p.id === req.player_id?.toString())?.name || `Jugador ${req.player_id}`}
                        </span>
                        <Badge className={
                          req.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                          req.status === 'approved' ? 'bg-green-200 text-green-800' :
                          'bg-red-200 text-red-800'
                        }>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
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
    </Layout>
  );
};

export default Waivers;
