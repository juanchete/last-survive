import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Users, Trophy, TrendingUp, Settings, AlertCircle, Calculator, Trash2, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardStatsCard from '@/components/DashboardStatsCard';
import UserManagementTable from '@/components/UserManagementTable';
import TradeManagementPanel from '@/components/TradeManagementPanel';
import { SleeperAPIControl } from '@/components/SleeperAPIControl';
import { useLeagueDashboardData } from '@/hooks/useLeagueDashboardData';
import { useLeagueDashboardActions } from '@/hooks/useLeagueDashboardActions';
import { useIsLeagueOwner } from '@/hooks/useIsLeagueOwner';
import { useAuth } from '@/hooks/useAuth';

const LeagueManagerDashboard: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedWeek, setSelectedWeek] = useState<number | undefined>(undefined);
  const [editingPlayer, setEditingPlayer] = useState<{
    id: number;
    rosterId: number;
    currentPoints: number;
  } | null>(null);
  const [newPoints, setNewPoints] = useState("");
  
  // Verificar si el usuario es owner de la liga
  const { data: isOwner, isLoading: isOwnerLoading } = useIsLeagueOwner(leagueId || "");
  
  // Obtener datos de la liga con semana configurable
  const { members, trades, teams, stats, selectedWeek: currentWeek, isLoading, error } = useLeagueDashboardData(leagueId || "", selectedWeek);
  
  // Acciones del dashboard
  const { 
    banUser, 
    unbanUser, 
    vetoTrade, 
    editPlayerPoints,
    removePlayerFromRoster,
    addPlayerToRoster,
    editRosterPlayer,
    recalculateTeamScores,
    isLoading: actionsLoading 
  } = useLeagueDashboardActions(leagueId || "");

  // Si no hay user o leagueId, redireccionar
  if (!user || !leagueId) {
    return <Navigate to="/login" replace />;
  }

  // Si está cargando la verificación de ownership
  if (isOwnerLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-96 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Si no es owner de la liga, no permitir acceso
  if (!isOwner) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tienes permisos para acceder al panel de administración de esta liga. 
            Solo el propietario de la liga puede gestionar estos ajustes.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Si hay error cargando los datos
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar los datos de la liga: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleUserAction = (userId: string, action: string, reason?: string) => {
    if (action === 'ban') {
      banUser({ userId, reason });
    } else if (action === 'unban') {
      unbanUser({ userId, reason });
    }
  };

  const handleTradeVeto = (tradeId: string, reason: string) => {
    vetoTrade({ tradeId, reason });
  };

  const handleScoreEdit = (playerId: number, newScore: number) => {
    editPlayerPoints({ 
      playerId, 
      week: stats?.currentWeek || 13, 
      season: stats?.season || 2024, 
      newPoints: newScore 
    });
    setEditingPlayer(null);
    setNewPoints("");
  };

  const startEditingPlayer = (playerId: number, rosterId: number, currentPoints: number) => {
    setEditingPlayer({ id: playerId, rosterId, currentPoints });
    setNewPoints(currentPoints.toString());
  };

  const cancelEditing = () => {
    setEditingPlayer(null);
    setNewPoints("");
  };

  const handleRemovePlayer = (rosterId: number, playerName: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${playerName} del roster?`)) {
      removePlayerFromRoster({ 
        rosterId, 
        reason: `Eliminado por el administrador en semana ${currentWeek}` 
      });
    }
  };

  const handleRecalculateTeam = (teamId: string, teamName: string) => {
    if (confirm(`¿Recalcular los puntajes de ${teamName} para la semana ${currentWeek}?`)) {
      recalculateTeamScores({ 
        teamId, 
        week: currentWeek || 1, 
        season: stats?.season || 2024 
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
          <p className="text-muted-foreground">
            Gestiona {stats?.leagueName || 'tu liga'} de fantasy NFL
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="week-select" className="text-sm font-medium">
              Ver Semana:
            </Label>
            <Select
              value={selectedWeek?.toString() || currentWeek?.toString() || ""}
              onValueChange={(value) => setSelectedWeek(parseInt(value))}
            >
              <SelectTrigger className="w-32" id="week-select">
                <SelectValue placeholder="Semana" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
                  <SelectItem key={week} value={week.toString()}>
                    Semana {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-sm">
            Temporada {stats?.season || 2024}
          </Badge>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="trades" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Intercambios
          </TabsTrigger>
          <TabsTrigger value="scoring" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Puntuación
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            API Sleeper
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <DashboardStatsCard
                  title="Total Usuarios"
                  value={stats?.totalUsers || 0}
                  description={`${stats?.activeUsers || 0} activos, ${stats?.bannedUsers || 0} baneados`}
                  icon={Users}
                />
                <DashboardStatsCard
                  title="Semana Actual"
                  value={stats?.currentWeek || 13}
                  description={`Temporada ${stats?.season || 2024}`}
                  icon={TrendingUp}
                />
                <DashboardStatsCard
                  title="Intercambios Activos"
                  value={stats?.activeTrades || 0}
                  description={`${stats?.completedTrades || 0} completados`}
                  icon={Trophy}
                />
                <DashboardStatsCard
                  title="Total Partidos"
                  value={stats?.totalMatches || 0}
                  description="En temporada actual"
                  icon={Settings}
                />
              </div>

              {/* Top Teams */}
              <Card>
                <CardHeader>
                  <CardTitle>Clasificación de Equipos</CardTitle>
                  <CardDescription>Los equipos mejor posicionados en tu liga</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teams?.slice(0, 5).map((team, index) => (
                      <div key={team.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                            {team.rank || index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{team.name}</p>
                            <p className="text-sm text-muted-foreground">{team.owner}</p>
                          </div>
                          {team.eliminated && (
                            <Badge variant="destructive">Eliminado</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{team.points} pts</p>
                          <p className="text-sm text-muted-foreground">{team.wins}-{team.losses}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <UserManagementTable
              users={members || []}
              onUserAction={handleUserAction}
              isLoading={actionsLoading}
            />
          )}
        </TabsContent>

        {/* Trades Tab */}
        <TabsContent value="trades" className="space-y-6">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <TradeManagementPanel
              trades={trades || []}
              onTradeAction={(tradeId, action, reason) => {
                if (action === 'veto') {
                  handleTradeVeto(tradeId, reason || '');
                }
              }}
              isLoading={actionsLoading}
            />
          )}
        </TabsContent>

        {/* Scoring Tab */}
        <TabsContent value="scoring" className="space-y-6">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <div className="space-y-6">

              {teams?.map((team) => (
                <Card key={team.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{team.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-normal text-muted-foreground">
                          Propietario: {team.owner}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRecalculateTeam(team.id, team.name)}
                          disabled={actionsLoading}
                        >
                          <Calculator className="h-4 w-4 mr-1" />
                          Recalcular Puntos
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Puntos totales: {team.points} | Ranking: #{team.rank} | Semana: {currentWeek}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jugador</TableHead>
                          <TableHead>Posición</TableHead>
                          <TableHead>Slot</TableHead>
                          <TableHead>Puntos</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {team.roster && team.roster.length > 0 ? team.roster.map((player) => (
                          <TableRow key={player.id}>
                            <TableCell className="font-medium">{player.name}</TableCell>
                            <TableCell>{player.position}</TableCell>
                            <TableCell>{player.slot}</TableCell>
                            <TableCell>
                              {editingPlayer?.id === player.id ? (
                                <Input
                                  type="number"
                                  value={newPoints}
                                  onChange={(e) => setNewPoints(e.target.value)}
                                  className="w-20"
                                  step="0.1"
                                />
                              ) : (
                                <span>{player.points}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={player.is_active ? "default" : "secondary"}>
                                {player.is_active ? "Activo" : "Banco"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {editingPlayer?.id === player.id ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleScoreEdit(player.id, parseFloat(newPoints))}
                                      disabled={actionsLoading}
                                    >
                                      Guardar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEditing}
                                    >
                                      Cancelar
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => startEditingPlayer(player.id, player.roster_id, player.points)}
                                    >
                                      Editar
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      onClick={() => handleRemovePlayer(player.roster_id, player.name)}
                                      disabled={actionsLoading}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Eliminar
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              No hay jugadores en el roster para la semana {currentWeek}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sleeper API Tab */}
        <TabsContent value="api" className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Integración con Sleeper API</h3>
              <p className="text-sm text-muted-foreground">
                Sincroniza jugadores, equipos y estadísticas semanales con la API de Sleeper para mantener tus datos actualizados automáticamente.
              </p>
            </div>
            <SleeperAPIControl />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeagueManagerDashboard; 