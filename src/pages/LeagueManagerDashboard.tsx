import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Users, Trophy, TrendingUp, Settings, AlertCircle, Calculator, Trash2, Edit3, UserPlus } from 'lucide-react';
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
import { LeagueJoinRequests } from '@/components/LeagueJoinRequests';
import { InvitePlayerToLeague } from '@/components/InvitePlayerToLeague';
import { useLeagueDashboardData } from '@/hooks/useLeagueDashboardData';
import { useLeagueDashboardActions } from '@/hooks/useLeagueDashboardActions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    maxMembers: 10,
    entryFee: 0,
    status: "active",
    imageUrl: ""
  });
  
  // Verificar si el usuario es owner de la liga
  const { data: isOwner, isLoading: isOwnerLoading } = useIsLeagueOwner(leagueId || "");
  
  // Obtener datos de la liga con semana configurable
  const { members, trades, teams, stats, selectedWeek: currentWeek, isLoading, error } = useLeagueDashboardData(leagueId || "", selectedWeek);
  
  // Get league details for invite component
  const { data: leagueDetails, error: leagueError, isLoading: leagueLoading } = useQuery({
    queryKey: ['league-details', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('League ID is required');
      
      const { data, error } = await supabase
        .from('leagues')
        .select('id, name, private_code, entry_fee, max_members, start_date, prize')
        .eq('id', leagueId)
        .single();
      
      if (error) {
        console.error('Error fetching league details for', leagueId, ':', error);
        throw new Error(`Failed to load league details: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('League not found');
      }
      
      console.log('League details loaded successfully:', data);
      return data;
    },
    enabled: !!leagueId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
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
    removeUserFromLeague,
    deleteLeague,
    editLeague,
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
    } else if (action === 'remove') {
      removeUserFromLeague({ userId, reason });
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

  const handleEditLeague = () => {
    setEditFormData({
      name: stats?.leagueName || "",
      maxMembers: 10, // Podrías obtener esto de los datos de la liga
      entryFee: 0, // Podrías obtener esto de los datos de la liga
      status: "active", // Podrías obtener esto de los datos de la liga
      imageUrl: "" // Se podría obtener de los datos de la liga
    });
    setShowEditDialog(true);
  };

  const handleSaveLeague = () => {
    editLeague({
      name: editFormData.name,
      maxMembers: editFormData.maxMembers,
      entryFee: editFormData.entryFee,
      status: editFormData.status,
      imageUrl: editFormData.imageUrl
    });
    setShowEditDialog(false);
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
          
          {/* Botón para editar liga */}
          <Button variant="outline" size="sm" onClick={handleEditLeague}>
            <Edit3 className="h-4 w-4 mr-2" />
            Editar Liga
          </Button>
          
          {/* Botón para eliminar liga */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Liga
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar Liga Completamente?</AlertDialogTitle>
                <AlertDialogDescription>
                  <div className="space-y-3">
                    <p>¿Estás seguro de que quieres eliminar <strong>{stats?.leagueName}</strong>? Esta acción es <strong>IRREVERSIBLE</strong>.</p>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800 font-medium">⚠️ Esta acción eliminará PERMANENTEMENTE:</p>
                      <ul className="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
                        <li>La liga completa y toda su configuración</li>
                        <li>Todos los equipos fantasy y sus rosters</li>
                        <li>Todo el historial de intercambios</li>
                        <li>Las estadísticas y ranking de la temporada</li>
                        <li>Todas las solicitudes de waiver</li>
                        <li>Los registros de eliminación semanal</li>
                      </ul>
                      <p className="text-sm text-red-800 font-medium mt-2">
                        Los usuarios NO podrán recuperar sus datos ni unirse nuevamente a esta liga.
                      </p>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteLeague()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Sí, Eliminar Liga Permanentemente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Solicitudes
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
              
              {/* Only show invite component if we have real league details */}
              {isOwner && leagueDetails && (
                <InvitePlayerToLeague 
                  leagueId={leagueId!}
                  league={{
                    id: leagueDetails.id,
                    name: leagueDetails.name,
                    private_code: leagueDetails.private_code, // Use real code, no fallback
                    entry_fee: leagueDetails.entry_fee || 0,
                    max_members: leagueDetails.max_members || 10,
                    start_date: leagueDetails.start_date,
                    prize: leagueDetails.prize || ""
                  }}
                  isOwner={!!isOwner}
                />
              )}
              
              {/* Show message if league details are loading or failed */}
              {isOwner && !leagueDetails && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm">
                    ⏳ Cargando información de la liga...
                  </p>
                  {leagueError && (
                    <p className="text-red-400 text-xs mt-2">
                      Error: {leagueError.message}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Join Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <LeagueJoinRequests 
              leagueId={leagueId!} 
              isOwner={!!isOwner} 
            />
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

      </Tabs>

      {/* Dialog de Edición de Liga */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Configuración de Liga</DialogTitle>
            <DialogDescription>
              Modifica la configuración básica de tu liga de fantasy NFL.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="league-name">Nombre de la Liga</Label>
              <Input
                id="league-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({
                  ...editFormData,
                  name: e.target.value
                })}
                placeholder="Nombre de tu liga"
              />
            </div>
            
            <div>
              <Label htmlFor="max-members">Máximo de Miembros</Label>
              <Input
                id="max-members"
                type="number"
                min="2"
                max="32"
                value={editFormData.maxMembers}
                onChange={(e) => setEditFormData({
                  ...editFormData,
                  maxMembers: parseInt(e.target.value) || 10
                })}
              />
            </div>
            
            <div>
              <Label htmlFor="entry-fee">Cuota de Entrada ($)</Label>
              <Input
                id="entry-fee"
                type="number"
                min="0"
                step="0.01"
                value={editFormData.entryFee}
                onChange={(e) => setEditFormData({
                  ...editFormData,
                  entryFee: parseFloat(e.target.value) || 0
                })}
              />
            </div>
            
            <div>
              <Label htmlFor="image-url">URL de Imagen de Liga</Label>
              <Input
                id="image-url"
                type="url"
                value={editFormData.imageUrl}
                onChange={(e) => setEditFormData({
                  ...editFormData,
                  imageUrl: e.target.value
                })}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Agrega una imagen para personalizar tu liga (opcional)
              </p>
              {editFormData.imageUrl && (
                <div className="mt-2">
                  <img 
                    src={editFormData.imageUrl} 
                    alt="Vista previa" 
                    className="w-20 h-20 object-cover rounded border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="status">Estado de la Liga</Label>
              <Select
                value={editFormData.status}
                onValueChange={(value) => setEditFormData({
                  ...editFormData,
                  status: value
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">En Draft</SelectItem>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLeague} disabled={actionsLoading}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeagueManagerDashboard; 