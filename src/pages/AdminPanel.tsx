import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, Shield, AlertTriangle, Ban, 
  UserCheck, Edit, Database, Trophy, Eye, Trash2, RotateCcw, Target
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin, type RosterPlayer } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  avatar_url?: string;
  favorite_team?: string;
  role?: 'user' | 'admin' | 'super_admin';
  banned?: boolean;
  verified?: boolean;
  banned_at?: string;
  banned_reason?: string;
  verified_at?: string;
}

interface League {
  id: string;
  name: string;
  status: string;
  created_at: string;
  owner_id: string;
  entry_fee?: number;
  max_members?: number;
  owner?: { full_name: string; email: string };
}

interface Player {
  id: number;
  name: string;
  position: string;
  nfl_team_id?: number;
  photo_url?: string;
  nfl_team?: { name: string; abbreviation: string };
}

interface FantasyTeam {
  id: string;
  name: string;
  user_id: string;
  league_id: string;
  user?: { full_name: string; email: string };
  league?: { name: string };
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { banUser, unbanUser, verifyUser, getTeamRoster, editPlayerStats, editRosterPlayer, addPlayerToRoster, removePlayerFromRoster, recalculateTeamScores } = useAdmin();
  const queryClient = useQueryClient();
  const [searchUsers, setSearchUsers] = useState("");
  const [searchLeagues, setSearchLeagues] = useState("");
  const [searchPlayers, setSearchPlayers] = useState("");
  const [searchTeams, setSearchTeams] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<FantasyTeam | null>(null);
  const [showRosterDialog, setShowRosterDialog] = useState(false);
  const [teamRoster, setTeamRoster] = useState<RosterPlayer[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState("users");
  const [banReason, setBanReason] = useState("");
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [userFilter, setUserFilter] = useState<'all' | 'banned' | 'verified' | 'admins'>('all');

  // Obtener usuarios con búsqueda y filtros
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["adminUsers", searchUsers, userFilter],
    queryFn: async () => {
      let query = supabase
        .from("users")
        .select("id, email, full_name, created_at, avatar_url, favorite_team, role, banned, verified, banned_at, banned_reason, verified_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (searchUsers) {
        query = query.or(`full_name.ilike.%${searchUsers}%,email.ilike.%${searchUsers}%`);
      }

      // Aplicar filtros
      if (userFilter === 'banned') {
        query = query.eq('banned', true);
      } else if (userFilter === 'verified') {
        query = query.eq('verified', true);
      } else if (userFilter === 'admins') {
        query = query.in('role', ['admin', 'super_admin']);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as User[];
    },
  });

  // Obtener ligas con búsqueda
  const { data: leagues, isLoading: loadingLeagues } = useQuery({
    queryKey: ["adminLeagues", searchLeagues],
    queryFn: async () => {
      let query = supabase
        .from("leagues")
        .select(`
          id, name, status, created_at, owner_id, entry_fee, max_members,
          owner:owner_id(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (searchLeagues) {
        query = query.ilike("name", `%${searchLeagues}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as League[];
    },
  });

  // Obtener jugadores con búsqueda
  const { data: players, isLoading: loadingPlayers } = useQuery({
    queryKey: ["adminPlayers", searchPlayers],
    queryFn: async () => {
      let query = supabase
        .from("players")
        .select(`
          id, name, position, nfl_team_id, photo_url,
          nfl_team:nfl_team_id(name, abbreviation)
        `)
        .order("name", { ascending: true })
        .limit(100);

      if (searchPlayers) {
        query = query.ilike("name", `%${searchPlayers}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Player[];
    },
  });

  // Obtener equipos fantasy
  const { data: fantasyTeams, isLoading: loadingTeams } = useQuery({
    queryKey: ["adminFantasyTeams", searchTeams],
    queryFn: async () => {
      let query = supabase
        .from("fantasy_teams")
        .select(`
          id, name, user_id, league_id,
          user:user_id(full_name, email),
          league:league_id(name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (searchTeams) {
        query = query.ilike("name", `%${searchTeams}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FantasyTeam[];
    },
  });

  // Obtener estadísticas básicas
  const { data: stats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const [usersResult, leaguesResult, playersResult, teamsResult, bannedUsersResult, verifiedUsersResult, adminUsersResult] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("leagues").select("id", { count: "exact", head: true }),
        supabase.from("players").select("id", { count: "exact", head: true }),
        supabase.from("fantasy_teams").select("id", { count: "exact", head: true }),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("banned", true),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("verified", true),
        supabase.from("users").select("id", { count: "exact", head: true }).in("role", ["admin", "super_admin"]),
      ]);

      return {
        totalUsers: usersResult.count || 0,
        totalLeagues: leaguesResult.count || 0,
        totalPlayers: playersResult.count || 0,
        totalTeams: teamsResult.count || 0,
        bannedUsers: bannedUsersResult.count || 0,
        verifiedUsers: verifiedUsersResult.count || 0,
        adminUsers: adminUsersResult.count || 0,
      };
    },
    refetchInterval: 30000,
  });

  // Mutación para resetear usuario
  const resetUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("fantasy_teams")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminFantasyTeams"] });
      toast({
        title: "Éxito",
        description: "Equipos fantasy del usuario eliminados exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Error al resetear usuario: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Función para banear usuario
  const handleBanUser = async (userId: string, reason: string) => {
    try {
      const result = await banUser(userId, reason);
      if (result.success) {
        toast({
          title: "Éxito",
          description: result.message,
        });
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
        setShowBanDialog(false);
        setBanReason("");
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al banear usuario",
        variant: "destructive",
      });
    }
  };

  // Función para verificar usuario
  const handleVerifyUser = async (userId: string) => {
    try {
      const result = await verifyUser(userId);
      if (result.success) {
        toast({
          title: "Éxito", 
          description: result.message,
        });
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al verificar usuario",
        variant: "destructive",
      });
    }
  };

  // Función para ver roster de equipo
  const handleViewRoster = async (team: FantasyTeam) => {
    setSelectedTeam(team);
    setShowRosterDialog(true);
    
    try {
      const roster = await getTeamRoster(team.id, currentWeek);
      setTeamRoster(roster);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar el roster del equipo",
        variant: "destructive",
      });
    }
  };

  // Función para editar puntajes de jugador
  const handleEditPlayerStats = async (playerId: number, newPoints: number, reason?: string) => {
    try {
      const result = await editPlayerStats({
        player_id: playerId,
        week: currentWeek,
        season: 2024,
        fantasy_points: newPoints,
        reason: reason
      });

      if (result.success) {
        toast({
          title: "Puntajes actualizados",
          description: `Puntos cambiados de ${result.old_points || 0} a ${result.new_points}`,
        });
        // Recargar roster
        if (selectedTeam) {
          const roster = await getTeamRoster(selectedTeam.id, currentWeek);
          setTeamRoster(roster);
        }
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al editar puntajes",
        variant: "destructive",
      });
    }
  };

  // Función para recalcular puntajes de equipo
  const handleRecalculateTeamScores = async (teamId: string) => {
    try {
      const result = await recalculateTeamScores(teamId, currentWeek, 2024);

      if (result.success) {
        toast({
          title: "Puntajes recalculados",
          description: `Puntaje semanal: ${result.weekly_score}`,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al recalcular puntajes",
        variant: "destructive",
      });
    }
  };

  // Mutación para editar datos de jugador
  const editPlayerMutation = useMutation({
    mutationFn: async (playerData: Player) => {
      const { data, error } = await supabase
        .from("players")
        .update({
          name: playerData.name,
          position: playerData.position,
          nfl_team_id: playerData.nfl_team_id,
          photo_url: playerData.photo_url
        })
        .eq("id", playerData.id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPlayers"] });
      toast({
        title: "Éxito",
        description: "Datos del jugador actualizados",
      });
      setSelectedPlayer(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Función para eliminar liga
  const deleteLeagueMutation = useMutation({
    mutationFn: async (leagueId: string) => {
      const { error } = await supabase
        .from("leagues")
        .delete()
        .eq("id", leagueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminLeagues"] });
      toast({
        title: "Éxito",
        description: "Liga eliminada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditPlayer = () => {
    if (!selectedPlayer) return;
    editPlayerMutation.mutate(selectedPlayer);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Shield className="h-8 w-8 text-nfl-blue" />
          <div>
            <h1 className="text-3xl font-bold text-white">Panel de Administración</h1>
            <p className="text-gray-400">Gestión completa del sistema Last Survive</p>
          </div>
        </div>

        {/* Alerta sobre funcionalidades */}
        <Alert className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Panel de Administración Funcional</strong><br/>
            ✅ <strong>Completamente implementado:</strong> Gestión de usuarios, supervisión de ligas, edición de jugadores, gestión de equipos fantasy.<br/>
            ✅ <strong>Funciones avanzadas:</strong> Sistema completamente funcional con hook <code>useAdmin</code> incluyendo funciones de banear/verificar usuarios. Tipos TypeScript actualizados.
          </AlertDescription>
        </Alert>

        {/* Estadísticas generales */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <Card className="bg-nfl-gray border-nfl-light-gray/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-nfl-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-nfl-gray border-nfl-light-gray/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Ligas</CardTitle>
              <Trophy className="h-4 w-4 text-nfl-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.totalLeagues || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-nfl-gray border-nfl-light-gray/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Jugadores</CardTitle>
              <Database className="h-4 w-4 text-nfl-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.totalPlayers || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-nfl-gray border-nfl-light-gray/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Equipos Fantasy</CardTitle>
              <Target className="h-4 w-4 text-nfl-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.totalTeams || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-nfl-gray border-nfl-light-gray/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Administradores</CardTitle>
              <Shield className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.adminUsers || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-nfl-gray border-nfl-light-gray/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Verificados</CardTitle>
              <UserCheck className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.verifiedUsers || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-nfl-gray border-nfl-light-gray/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Baneados</CardTitle>
              <Ban className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.bannedUsers || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Panel de pestañas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-nfl-gray">
            <TabsTrigger value="users" className="text-white">Gestión de Usuarios</TabsTrigger>
            <TabsTrigger value="leagues" className="text-white">Supervisión de Ligas</TabsTrigger>
            <TabsTrigger value="players" className="text-white">Edición de Jugadores</TabsTrigger>
            <TabsTrigger value="teams" className="text-white">Gestión de Equipos</TabsTrigger>
          </TabsList>

          {/* Gestión de Usuarios */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestión de Usuarios
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar usuarios por nombre o email..."
                      value={searchUsers}
                      onChange={(e) => setSearchUsers(e.target.value)}
                      className="bg-nfl-dark border-nfl-light-gray/20"
                    />
                  </div>
                  <div className="min-w-[200px]">
                    <Select value={userFilter} onValueChange={(value: 'all' | 'banned' | 'verified' | 'admins') => setUserFilter(value)}>
                      <SelectTrigger className="bg-nfl-dark border-nfl-light-gray/20">
                        <SelectValue placeholder="Filtrar por..." />
                      </SelectTrigger>
                      <SelectContent className="bg-nfl-dark border-nfl-light-gray/20">
                        <SelectItem value="all">Todos los usuarios</SelectItem>
                        <SelectItem value="admins">Solo administradores</SelectItem>
                        <SelectItem value="verified">Solo verificados</SelectItem>
                        <SelectItem value="banned">Solo baneados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <p className="text-gray-400">Cargando usuarios...</p>
                ) : (
                  <div className="space-y-4">
                    {users?.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border border-nfl-light-gray/20 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            user.banned ? 'bg-red-600' : 
                            user.role === 'super_admin' ? 'bg-purple-600' :
                            user.role === 'admin' ? 'bg-blue-600' :
                            user.verified ? 'bg-green-600' : 'bg-nfl-blue'
                          }`}>
                            {user.banned ? <Ban className="h-5 w-5 text-white" /> :
                             user.role === 'super_admin' || user.role === 'admin' ? <Shield className="h-5 w-5 text-white" /> :
                             user.verified ? <UserCheck className="h-5 w-5 text-white" /> :
                             <Users className="h-5 w-5 text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-white">{user.full_name}</p>
                              {user.role === 'super_admin' && (
                                <Badge className="bg-purple-600 text-white text-xs">Super Admin</Badge>
                              )}
                              {user.role === 'admin' && (
                                <Badge className="bg-blue-600 text-white text-xs">Admin</Badge>
                              )}
                              {user.verified && user.role === 'user' && (
                                <Badge className="bg-green-600 text-white text-xs">Verificado</Badge>
                              )}
                              {user.banned && (
                                <Badge className="bg-red-600 text-white text-xs">Baneado</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{user.email}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Registrado: {new Date(user.created_at).toLocaleDateString()}</span>
                              {user.banned && user.banned_at && (
                                <span className="text-red-400">
                                  Baneado: {new Date(user.banned_at).toLocaleDateString()}
                                </span>
                              )}
                              {user.verified && user.verified_at && (
                                <span className="text-green-400">
                                  Verificado: {new Date(user.verified_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {user.banned && user.banned_reason && (
                              <p className="text-xs text-red-300 mt-1">
                                Razón: {user.banned_reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Gestionar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-nfl-gray border-nfl-light-gray/20 max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-white">Gestionar Usuario</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-gray-400">Nombre Completo</Label>
                                  <p className="text-white">{user.full_name}</p>
                                </div>
                                <div>
                                  <Label className="text-gray-400">Email</Label>
                                  <p className="text-white">{user.email}</p>
                                </div>
                                <div>
                                  <Label className="text-gray-400">Fecha de Registro</Label>
                                  <p className="text-white">{new Date(user.created_at).toLocaleString()}</p>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-nfl-light-gray/20">
                                  <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                      <strong>Funciones disponibles:</strong><br/>
                                      • Resetear usuario (eliminar todos sus equipos fantasy)<br/>
                                      • Banear/verificar usuarios: ✅ Implementado y activo con hook useAdmin
                                    </AlertDescription>
                                  </Alert>

                                  {/* Resetear Usuario */}
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline" className="w-full">
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Resetear Usuario
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-nfl-gray border-nfl-light-gray/20">
                                      <DialogHeader>
                                        <DialogTitle className="text-white">Confirmar Reset</DialogTitle>
                                      </DialogHeader>
                                      <Alert>
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription>
                                          Esto eliminará todos los equipos fantasy del usuario. ¿Continuar?
                                        </AlertDescription>
                                      </Alert>
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="destructive"
                                          onClick={() => resetUserMutation.mutate(user.id)}
                                          disabled={resetUserMutation.isPending}
                                        >
                                          Confirmar Reset
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>

                                  {/* Funciones avanzadas activas */}
                                  <div className="space-y-2">
                                    {/* Banear Usuario */}
                                    <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
                                      <DialogTrigger asChild>
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="w-full text-red-400 border-red-400 hover:bg-red-400/10"
                                          onClick={() => setShowBanDialog(true)}
                                        >
                                          <Ban className="h-4 w-4 mr-2" />
                                          Banear Usuario
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="bg-nfl-gray border-nfl-light-gray/20">
                                        <DialogHeader>
                                          <DialogTitle className="text-white">Banear Usuario</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <Alert>
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertDescription>
                                              ¿Estás seguro de que quieres banear a <strong>{selectedUser?.full_name}</strong>?
                                              Esta acción puede ser revertida posteriormente.
                                            </AlertDescription>
                                          </Alert>
                                          <div>
                                            <Label htmlFor="banReason" className="text-gray-400">Razón del ban (opcional)</Label>
                                            <Input
                                              id="banReason"
                                              value={banReason}
                                              onChange={(e) => setBanReason(e.target.value)}
                                              placeholder="Ej: Comportamiento tóxico, spam, etc."
                                              className="bg-nfl-dark border-nfl-light-gray/20"
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <Button 
                                              variant="destructive"
                                              onClick={() => selectedUser?.id && handleBanUser(selectedUser.id, banReason)}
                                            >
                                              Confirmar Ban
                                            </Button>
                                            <Button 
                                              variant="outline"
                                              onClick={() => {
                                                setShowBanDialog(false);
                                                setBanReason("");
                                              }}
                                            >
                                              Cancelar
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>

                                    {/* Verificar Usuario */}
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="w-full text-green-400 border-green-400 hover:bg-green-400/10"
                                        >
                                          <UserCheck className="h-4 w-4 mr-2" />
                                          Verificar Usuario
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="bg-nfl-gray border-nfl-light-gray/20">
                                        <DialogHeader>
                                          <DialogTitle className="text-white">Verificar Usuario</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <Alert>
                                            <UserCheck className="h-4 w-4" />
                                            <AlertDescription>
                                              ¿Verificar a <strong>{selectedUser?.full_name}</strong> como usuario legítimo?
                                              Esto les dará un badge de verificación.
                                            </AlertDescription>
                                          </Alert>
                                          <div className="flex gap-2">
                                            <Button 
                                              onClick={() => selectedUser?.id && handleVerifyUser(selectedUser.id)}
                                              className="bg-green-600 hover:bg-green-700"
                                            >
                                              Verificar Usuario
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Supervisión de Ligas */}
          <TabsContent value="leagues" className="space-y-6">
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Supervisión de Ligas
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar ligas por nombre..."
                      value={searchLeagues}
                      onChange={(e) => setSearchLeagues(e.target.value)}
                      className="bg-nfl-dark border-nfl-light-gray/20"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLeagues ? (
                  <p className="text-gray-400">Cargando ligas...</p>
                ) : (
                  <div className="space-y-4">
                    {leagues?.map((league) => (
                      <div key={league.id} className="flex items-center justify-between p-4 border border-nfl-light-gray/20 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-nfl-blue rounded-full flex items-center justify-center">
                            <Trophy className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{league.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={league.status === 'active' ? 'default' : 'secondary'}>
                                {league.status}
                              </Badge>
                              {league.entry_fee && (
                                <Badge variant="outline">${league.entry_fee}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              Creada: {new Date(league.created_at).toLocaleDateString()}
                            </p>
                            {league.owner && (
                              <p className="text-xs text-gray-400">
                                Propietario: {league.owner.full_name} ({league.owner.email})
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`/standings?league=${league.id}`, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Liga
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar Liga
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-nfl-gray border-nfl-light-gray/20">
                              <DialogHeader>
                                <DialogTitle className="text-white">Resolver Disputa - {league.name}</DialogTitle>
                              </DialogHeader>
                              <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  ¿Estás seguro de que quieres eliminar esta liga? Esta acción no se puede deshacer.
                                </AlertDescription>
                              </Alert>
                              <div className="flex gap-2 mt-4">
                                <Button 
                                  variant="destructive" 
                                  onClick={() => deleteLeagueMutation.mutate(league.id)}
                                  disabled={deleteLeagueMutation.isPending}
                                >
                                  Confirmar Eliminación
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Edición de Jugadores */}
          <TabsContent value="players" className="space-y-6">
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Edición Manual de Jugadores
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar jugadores por nombre..."
                      value={searchPlayers}
                      onChange={(e) => setSearchPlayers(e.target.value)}
                      className="bg-nfl-dark border-nfl-light-gray/20"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPlayers ? (
                  <p className="text-gray-400">Cargando jugadores...</p>
                ) : (
                  <div className="space-y-4">
                    {players?.map((player) => (
                      <div key={player.id} className="flex items-center justify-between p-4 border border-nfl-light-gray/20 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-nfl-blue rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{player.position}</span>
                          </div>
                          <div>
                            <p className="font-medium text-white">{player.name}</p>
                            <p className="text-sm text-gray-400">Posición: {player.position}</p>
                            {player.nfl_team && (
                              <p className="text-xs text-gray-500">
                                Equipo: {player.nfl_team.name} ({player.nfl_team.abbreviation})
                              </p>
                            )}
                            <p className="text-xs text-gray-500">ID: {player.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedPlayer(player)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-nfl-gray border-nfl-light-gray/20">
                              <DialogHeader>
                                <DialogTitle className="text-white">Editar Jugador</DialogTitle>
                              </DialogHeader>
                              {selectedPlayer && (
                                <div className="space-y-4">
                                  <div>
                                    <Label className="text-gray-400">Nombre</Label>
                                    <Input
                                      value={selectedPlayer.name}
                                      onChange={(e) => setSelectedPlayer({
                                        ...selectedPlayer,
                                        name: e.target.value
                                      })}
                                      className="bg-nfl-dark border-nfl-light-gray/20"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-gray-400">Posición</Label>
                                    <Select
                                      value={selectedPlayer.position}
                                      onValueChange={(value) => setSelectedPlayer({
                                        ...selectedPlayer,
                                        position: value
                                      })}
                                    >
                                      <SelectTrigger className="bg-nfl-dark border-nfl-light-gray/20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="QB">QB</SelectItem>
                                        <SelectItem value="RB">RB</SelectItem>
                                        <SelectItem value="WR">WR</SelectItem>
                                        <SelectItem value="TE">TE</SelectItem>
                                        <SelectItem value="K">K</SelectItem>
                                        <SelectItem value="DEF">DEF</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-gray-400">URL de Foto</Label>
                                    <Input
                                      value={selectedPlayer.photo_url || ""}
                                      onChange={(e) => setSelectedPlayer({
                                        ...selectedPlayer,
                                        photo_url: e.target.value
                                      })}
                                      className="bg-nfl-dark border-nfl-light-gray/20"
                                      placeholder="https://example.com/photo.jpg"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      onClick={handleEditPlayer}
                                      disabled={editPlayerMutation.isPending}
                                    >
                                      Guardar Cambios
                                    </Button>
                                    <Button 
                                      variant="outline"
                                      onClick={() => setSelectedPlayer(null)}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gestión de Equipos */}
          <TabsContent value="teams" className="space-y-6">
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Gestión de Equipos Fantasy
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar equipos fantasy por nombre..."
                      value={searchTeams}
                      onChange={(e) => setSearchTeams(e.target.value)}
                      className="bg-nfl-dark border-nfl-light-gray/20"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTeams ? (
                  <p className="text-gray-400">Cargando equipos fantasy...</p>
                ) : (
                  <div className="space-y-4">
                    {fantasyTeams?.map((team) => (
                      <div key={team.id} className="flex items-center justify-between p-4 border border-nfl-light-gray/20 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-nfl-blue rounded-full flex items-center justify-center">
                            <Target className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{team.name}</p>
                            <p className="text-xs text-gray-500">ID: {team.id}</p>
                            {team.user && (
                              <p className="text-xs text-gray-400">
                                Propietario: {team.user.full_name} ({team.user.email})
                              </p>
                            )}
                            {team.league && (
                              <p className="text-xs text-gray-400">
                                Liga: {team.league.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewRoster(team)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Roster
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Diálogo de Gestión de Roster */}
        <Dialog open={showRosterDialog} onOpenChange={setShowRosterDialog}>
          <DialogContent className="bg-nfl-gray border-nfl-light-gray/20 max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Target className="h-5 w-5" />
                Gestión de Roster - {selectedTeam?.name}
              </DialogTitle>
              <div className="flex items-center gap-4 mt-4">
                <div>
                  <Label className="text-gray-400">Semana</Label>
                  <Select
                    value={currentWeek.toString()}
                    onValueChange={(value) => {
                      setCurrentWeek(parseInt(value));
                      if (selectedTeam) {
                        handleViewRoster(selectedTeam);
                      }
                    }}
                  >
                    <SelectTrigger className="bg-nfl-dark border-nfl-light-gray/20 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
                        <SelectItem key={week} value={week.toString()}>
                          {week}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedTeam && handleRecalculateTeamScores(selectedTeam.id)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Recalcular Puntajes
                </Button>
              </div>
            </DialogHeader>
            
            <div className="max-h-96 overflow-y-auto">
              {teamRoster.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No hay jugadores en el roster para esta semana</p>
              ) : (
                <div className="space-y-3">
                  {teamRoster.map((rosterPlayer) => (
                    <div key={rosterPlayer.roster_id} className="flex items-center justify-between p-4 border border-nfl-light-gray/20 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-nfl-blue rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{rosterPlayer.player_position}</span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{rosterPlayer.player_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={rosterPlayer.slot === 'BENCH' ? 'secondary' : 'default'}>
                              {rosterPlayer.slot}
                            </Badge>
                            <Badge variant="outline">
                              {rosterPlayer.nfl_team_name}
                            </Badge>
                            {rosterPlayer.is_active && (
                              <Badge variant="outline" className="text-green-400 border-green-400">
                                Activo
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Adquirido: Semana {rosterPlayer.acquired_week} ({rosterPlayer.acquired_type})
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">{rosterPlayer.fantasy_points} pts</p>
                          <p className="text-xs text-gray-400">Puntos Fantasy</p>
                        </div>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-nfl-gray border-nfl-light-gray/20">
                            <DialogHeader>
                              <DialogTitle className="text-white">
                                Editar Puntajes - {rosterPlayer.player_name}
                              </DialogTitle>
                            </DialogHeader>
                            <EditPlayerStatsForm
                              playerId={rosterPlayer.player_id}
                              currentPoints={rosterPlayer.fantasy_points}
                              playerName={rosterPlayer.player_name}
                              week={currentWeek}
                              onSave={handleEditPlayerStats}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

// Componente para editar puntajes de jugador
interface EditPlayerStatsFormProps {
  playerId: number;
  currentPoints: number;
  playerName: string;
  week: number;
  onSave: (playerId: number, newPoints: number, reason?: string) => Promise<void>;
}

function EditPlayerStatsForm({ playerId, currentPoints, playerName, week, onSave }: EditPlayerStatsFormProps) {
  const [newPoints, setNewPoints] = useState(currentPoints.toString());
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSave(playerId, parseFloat(newPoints), reason || undefined);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-gray-400">Jugador</Label>
        <p className="text-white font-medium">{playerName}</p>
        <p className="text-sm text-gray-400">Semana {week} - Puntos actuales: {currentPoints}</p>
      </div>
      
      <div>
        <Label htmlFor="newPoints" className="text-gray-400">Nuevos Puntos Fantasy</Label>
        <Input
          id="newPoints"
          type="number"
          step="0.1"
          value={newPoints}
          onChange={(e) => setNewPoints(e.target.value)}
          className="bg-nfl-dark border-nfl-light-gray/20"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="reason" className="text-gray-400">Razón del cambio (opcional)</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej: Corrección de estadísticas, error de cálculo..."
          className="bg-nfl-dark border-nfl-light-gray/20"
        />
      </div>
      
      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : "Guardar Cambios"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setNewPoints(currentPoints.toString())}>
          Resetear
        </Button>
      </div>
    </form>
  );
} 