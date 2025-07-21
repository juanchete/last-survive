import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAvailablePlayers } from "@/hooks/useAvailablePlayers";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { useAuth } from "@/hooks/useAuth";
import { useDraftState } from "@/hooks/useDraftState";
import { useIsMyDraftTurn } from "@/hooks/useIsMyDraftTurn";
import { useIsLeagueOwner } from "@/hooks/useIsLeagueOwner";
import { draftPlayer } from "@/lib/draft";
import { pauseDraft, resumeDraft, resetDraft, completeDraft, simulateCompleteDraft } from "@/lib/draftControl";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface DebugInfo {
  leagueId: string | undefined;
  userId: string | undefined;
  userTeam: string | undefined;
  totalTeams: number | undefined;
  availablePlayersCount: number | undefined;
  currentTurn: number | undefined;
  isMyTurn: boolean;
  draftStatus: string | undefined;
  isOwner: boolean;
}

export default function DraftDebug() {
  const { id: leagueId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: teams } = useFantasyTeams(leagueId || "");
  const { data: draftState } = useDraftState(leagueId || "");
  const { data: isOwner = false } = useIsLeagueOwner(leagueId || "");
  const currentWeek = 1;
  const { data: availablePlayers = [] } = useAvailablePlayers(leagueId || "", currentWeek);
  const queryClient = useQueryClient();

  const [loadingPick, setLoadingPick] = useState(false);
  const [loadingControl, setLoadingControl] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    leagueId: undefined,
    userId: undefined,
    userTeam: undefined,
    totalTeams: undefined,
    availablePlayersCount: undefined,
    currentTurn: undefined,
    isMyTurn: false,
    draftStatus: undefined,
    isOwner: false,
  });

  const userTeam = teams?.find(team => team.owner === user?.email);
  const isMyTurn = useIsMyDraftTurn(leagueId || "", userTeam?.id || "");

  // Función para refrescar todos los datos
  const refreshAllData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["availablePlayers", leagueId, currentWeek] }),
      queryClient.invalidateQueries({ queryKey: ["draftState", leagueId] }),
      queryClient.invalidateQueries({ queryKey: ["fantasyTeams", leagueId] }),
      queryClient.invalidateQueries({ queryKey: ["isLeagueOwner", leagueId, user?.id] }),
    ]);
  };

  // Cargar info de debug
  useEffect(() => {
    const info: DebugInfo = {
      leagueId,
      userId: user?.id,
      userTeam: userTeam?.id,
      totalTeams: teams?.length,
      availablePlayersCount: availablePlayers?.length,
      currentTurn: draftState?.current_pick,
      isMyTurn,
      draftStatus: draftState?.draft_status,
      isOwner,
    };
    setDebugInfo(info);
  }, [leagueId, user, userTeam, teams, availablePlayers, draftState, isMyTurn, isOwner]);

  // Control functions
  const handlePauseDraft = async () => {
    if (!user?.id || !leagueId) return;
    setLoadingControl(true);
    try {
      const result = await pauseDraft(user.id, leagueId);
      if (result.success) {
        toast.success(result.message);
        await refreshAllData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error pausando draft');
    } finally {
      setLoadingControl(false);
    }
  };

  const handleResumeDraft = async () => {
    if (!user?.id || !leagueId) return;
    setLoadingControl(true);
    try {
      const result = await resumeDraft(user.id, leagueId);
      if (result.success) {
        toast.success(result.message);
        await refreshAllData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error reanudando draft');
    } finally {
      setLoadingControl(false);
    }
  };

  const handleResetDraft = async () => {
    if (!user?.id || !leagueId) return;
    
    // Confirmación para reset
    if (!confirm('⚠️ ¿Estás seguro? Esto eliminará todos los picks del draft.')) {
      return;
    }

    setLoadingControl(true);
    try {
      const result = await resetDraft(user.id, leagueId);
      if (result.success) {
        toast.success(result.message);
        await refreshAllData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error reseteando draft');
    } finally {
      setLoadingControl(false);
    }
  };

  const handleCompleteDraft = async () => {
    if (!user?.id || !leagueId) return;
    setLoadingControl(true);
    try {
      const result = await completeDraft(user.id, leagueId);
      if (result.success) {
        toast.success(result.message);
        await refreshAllData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error finalizando draft');
    } finally {
      setLoadingControl(false);
    }
  };

  const handleSimulateDraft = async () => {
    if (!user?.id || !leagueId) return;
    
    // Confirmación para simulación
    if (!confirm('🤖 ¿Simular draft completo automáticamente? Esto puede tomar unos minutos y completará todos los picks restantes.')) {
      return;
    }

    setLoadingControl(true);
    try {
      toast.info('🤖 Iniciando simulación de draft...');
      
      const result = await simulateCompleteDraft(user.id, leagueId, 5); // 5 rondas para testing
      
      if (result.success) {
        toast.success(`${result.message} (${result.completedPicks}/${result.totalPicks} picks)`);
        await refreshAllData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error simulando draft completo');
    } finally {
      setLoadingControl(false);
    }
  };

  const handleDebugDraft = async (playerId: number) => {

    if (!userTeam) {
      console.error('❌ No userTeam found');
      toast.error('No se encontró tu equipo');
      return;
    }

    if (!leagueId) {
      console.error('❌ No leagueId found');
      toast.error('No se encontró la liga');
      return;
    }

    setLoadingPick(true);
    
    try {
      
      const result = await draftPlayer({
        leagueId,
        fantasyTeamId: userTeam.id,
        playerId,
        week: currentWeek,
        slot: "bench", // Slot por defecto para debug
      });

      toast.success(`¡Jugador ${playerId} drafteado exitosamente!`);
      
      // Refrescar datos después del draft
      await refreshAllData();
      toast.info('Datos actualizados');
      
    } catch (error: unknown) {
      console.error('💥 ERROR en draft:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoadingPick(false);
    }
  };

  if (!teams) {
    return <div>Cargando equipos...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">🐛 Draft Debug Mode</h1>
        <p className="text-gray-600">Liga: {leagueId}</p>
        {loadingPick && (
          <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 rounded">
            🏈 Procesando draft...
          </div>
        )}
        {loadingControl && (
          <div className="mt-2 p-3 bg-blue-100 border border-blue-400 rounded">
            ⚙️ Procesando control de draft...
          </div>
        )}
      </div>

      {/* Debug Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>📊 Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <strong>Liga ID:</strong><br />
              {debugInfo.leagueId}
            </div>
            <div>
              <strong>User ID:</strong><br />
              {debugInfo.userId}
            </div>
            <div>
              <strong>Team ID:</strong><br />
              {debugInfo.userTeam}
            </div>
            <div>
              <strong>User Email:</strong><br />
              {user?.email}
            </div>
            <div>
              <strong>Total Teams:</strong><br />
              {debugInfo.totalTeams}
            </div>
            <div>
              <strong>Current Turn:</strong><br />
              {debugInfo.currentTurn}
            </div>
            <div>
              <strong>Is My Turn:</strong><br />
              <Badge variant={debugInfo.isMyTurn ? "default" : "secondary"}>
                {debugInfo.isMyTurn ? "Sí" : "No"}
              </Badge>
            </div>
            <div>
              <strong>Draft Status:</strong><br />
              <Badge variant="outline">{debugInfo.draftStatus}</Badge>
            </div>
            <div>
              <strong>Available Players:</strong><br />
              {debugInfo.availablePlayersCount}
            </div>
            <div>
              <strong>Is Owner:</strong><br />
              <Badge variant={debugInfo.isOwner ? "default" : "secondary"}>
                {debugInfo.isOwner ? "Sí" : "No"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Draft Controls - Solo si eres owner */}
      {isOwner && (
        <Card className="mb-6 border-blue-200">
          <CardHeader>
            <CardTitle>🎮 Draft Controls (Owner Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Controles Normales */}
              <div>
                <h4 className="text-sm font-medium mb-2">Controles de Draft</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button 
                    onClick={handlePauseDraft}
                    disabled={loadingControl || draftState?.draft_status !== 'in_progress'}
                    variant="outline"
                    className="w-full"
                  >
                    ⏸️ Pausar Draft
                  </Button>
                  <Button 
                    onClick={handleResumeDraft}
                    disabled={loadingControl || draftState?.draft_status !== 'pending'}
                    variant="outline"
                    className="w-full"
                  >
                    ▶️ Reanudar Draft
                  </Button>
                  <Button 
                    onClick={handleResetDraft}
                    disabled={loadingControl}
                    variant="destructive"
                    className="w-full"
                  >
                    🔄 Reset Draft
                  </Button>
                  <Button 
                    onClick={handleCompleteDraft}
                    disabled={loadingControl || draftState?.draft_status === 'completed'}
                    variant="default"
                    className="w-full"
                  >
                    ✅ Finalizar Draft
                  </Button>
                </div>
              </div>

              {/* Controles de Testing */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2 text-purple-600">🧪 Testing Controls</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Button 
                    onClick={handleSimulateDraft}
                    disabled={loadingControl || draftState?.draft_status === 'completed'}
                    variant="secondary"
                    className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700"
                  >
                    🤖 Simular Draft Completo
                  </Button>
                  <div className="text-xs text-gray-500 flex items-center">
                    Completa automáticamente todos los picks restantes
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>⚡ Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              🔄 Refresh Page
            </Button>
            <Button 
              onClick={refreshAllData}
              variant="outline"
              disabled={loadingPick || loadingControl}
            >
              🔄 Refresh Data
            </Button>
            <Button 
              variant="outline"
            >
              🖨️ Log State
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Players */}
      <Card>
        <CardHeader>
          <CardTitle>👥 Available Players</CardTitle>
          <p className="text-sm text-gray-600">
            {availablePlayers?.length || 0} jugadores disponibles
          </p>
        </CardHeader>
        <CardContent>
          {!availablePlayers || availablePlayers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay jugadores disponibles. 
              <br />
              ¿Ejecutaste el SQL para agregar jugadores de prueba?
            </p>
          ) : (
            <div className="grid gap-4">
              {availablePlayers.slice(0, 10).map((player) => (
                <div 
                  key={player.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h4 className="font-semibold">{player.name}</h4>
                    <p className="text-sm text-gray-600">
                      {player.position} - {player.team}
                    </p>
                    <p className="text-xs text-gray-500">
                      ID: {player.id} | Points: {player.points}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDebugDraft(Number(player.id))}
                    disabled={loadingPick || loadingControl || draftState?.draft_status !== 'in_progress'}
                    size="sm"
                    variant={isMyTurn && draftState?.draft_status === 'in_progress' ? "default" : "secondary"}
                  >
                    {loadingPick ? "Drafteando..." : "🏈 Draft"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 