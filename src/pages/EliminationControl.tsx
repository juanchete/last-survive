import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Trophy, Target, Users, Clock, TrendingDown, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  useWeeklyScores, 
  useProcessElimination, 
  useEliminationHistory, 
  useActiveTeams 
} from "@/hooks/useWeeklyElimination";
import { useIsLeagueOwner } from "@/hooks/useIsLeagueOwner";

export default function EliminationControl() {
  const { id: leagueId } = useParams<{ id: string }>();
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedSeason, setSelectedSeason] = useState<number>(2024);

  // Verificar permisos
  const { data: isOwner, isLoading: loadingOwnership } = useIsLeagueOwner(leagueId || "");

  // Hooks
  const { data: weeklyScores, isLoading: loadingScores, refetch: refetchScores } = 
    useWeeklyScores(leagueId || "", selectedWeek, selectedSeason);
  
  const { data: eliminationHistory, isLoading: loadingHistory } = 
    useEliminationHistory(leagueId || "");
  
  const { data: activeTeams, isLoading: loadingActive } = 
    useActiveTeams(leagueId || "");

  const eliminationMutation = useProcessElimination();

  if (!leagueId) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loadingOwnership) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Solo el propietario de la liga puede acceder al control de eliminaciones.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleProcessElimination = async () => {
    if (!weeklyScores || weeklyScores.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de procesar la eliminación para la semana ${selectedWeek}?\n\n` +
      `Esto eliminará al equipo: ${weeklyScores[0]?.teamName} (${weeklyScores[0]?.totalPoints} pts)\n\n` +
      `Esta acción no se puede deshacer.`
    );

    if (confirmed) {
      eliminationMutation.mutate({
        leagueId,
        week: selectedWeek,
        season: selectedSeason
      });
    }
  };

  const handleRecalculateScores = () => {
    refetchScores();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🎯 Control de Eliminaciones</h1>
          <p className="text-muted-foreground">
            Gestiona las eliminaciones semanales automáticas
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Users className="w-4 h-4 mr-1" />
          {activeTeams?.length || 0} equipos activos
        </Badge>
      </div>

      {/* Controles de Semana */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Seleccionar Semana
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="week">Semana</Label>
              <Input
                id="week"
                type="number"
                min="1"
                max="18"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(parseInt(e.target.value) || 1)}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="season">Temporada</Label>
              <Input
                id="season"
                type="number"
                min="2020"
                max="2030"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(parseInt(e.target.value) || 2024)}
                className="w-full"
              />
            </div>
          </div>
          <Button 
            onClick={handleRecalculateScores}
            disabled={loadingScores}
            variant="outline"
            className="w-full"
          >
            {loadingScores ? "Calculando..." : "Recalcular Puntajes"}
          </Button>
        </CardContent>
      </Card>

      {/* Puntajes Semanales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Puntajes de la Semana {selectedWeek}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingScores ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !weeklyScores || weeklyScores.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No se encontraron puntajes para la semana {selectedWeek}. 
                Verifica que existan datos y que los equipos tengan rosters configurados.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {weeklyScores.map((score, index) => (
                <div 
                  key={score.fantasyTeamId}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    index === 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={index === 0 ? "destructive" : "secondary"}>
                      #{index + 1}
                    </Badge>
                    <div>
                      <h3 className="font-semibold">{score.teamName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {score.activePlayersCount} jugadores activos
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {score.totalPoints.toFixed(1)}
                    </p>
                    <p className="text-sm text-muted-foreground">puntos</p>
                  </div>
                  {index === 0 && (
                    <Badge variant="destructive" className="ml-2">
                      <TrendingDown className="w-4 h-4 mr-1" />
                      A Eliminar
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acción de Eliminación */}
      {weeklyScores && weeklyScores.length > 1 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Target className="w-5 h-5" />
              Procesar Eliminación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Equipo a eliminar:</strong> {weeklyScores[0].teamName} 
                ({weeklyScores[0].totalPoints.toFixed(1)} puntos)
                <br />
                <strong>Acción:</strong> Se marcará como eliminado y sus jugadores serán liberados al waiver pool.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleProcessElimination}
              disabled={eliminationMutation.isPending}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              {eliminationMutation.isPending ? 
                "Procesando Eliminación..." : 
                `🎯 Eliminar Equipo: ${weeklyScores[0].teamName}`
              }
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Historial de Eliminaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Historial de Eliminaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !eliminationHistory || eliminationHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay eliminaciones registradas aún
            </p>
          ) : (
            <div className="space-y-3">
              {eliminationHistory.map((team) => (
                <div 
                  key={team.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <h3 className="font-medium">{team.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {team.users.full_name}
                    </p>
                  </div>
                  <Badge variant="outline">
                    Semana {team.eliminated_week}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipos Activos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Equipos Activos Restantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingActive ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !activeTeams || activeTeams.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No hay equipos activos. La liga ha terminado.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeTeams.map((team) => (
                <div 
                  key={team.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-green-50 border-green-200"
                >
                  <div>
                    <h3 className="font-medium">{team.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {team.users.full_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">#{team.rank}</Badge>
                    <p className="text-sm mt-1">{team.points} pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
} 