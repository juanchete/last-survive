import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, Shield, Settings, AlertTriangle, CheckCircle, Ban, 
  UserCheck, Edit, Database, Trophy, Search, Filter,
  Calendar, Activity, Eye, Trash2, Plus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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
}

interface League {
  id: string;
  name: string;
  status: string;
  created_at: string;
  owner_id: string;
  entry_fee?: number;
  max_members?: number;
}

interface Player {
  id: number;
  name: string;
  position: string;
  nfl_team_id?: number;
  photo_url?: string;
}

export default function Admin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchUsers, setSearchUsers] = useState("");
  const [searchLeagues, setSearchLeagues] = useState("");
  const [searchPlayers, setSearchPlayers] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [banReason, setBanReason] = useState("");

  // Obtener usuarios con búsqueda
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["adminUsers", searchUsers],
    queryFn: async () => {
      let query = supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (searchUsers) {
        query = query.or(`full_name.ilike.%${searchUsers}%,email.ilike.%${searchUsers}%`);
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

  // Obtener estadísticas básicas
  const { data: stats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const [usersResult, leaguesResult, playersResult] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("leagues").select("id", { count: "exact", head: true }),
        supabase.from("players").select("id", { count: "exact", head: true }),
      ]);

      return {
        totalUsers: usersResult.count || 0,
        totalLeagues: leaguesResult.count || 0,
        totalPlayers: playersResult.count || 0,
      };
    },
    refetchInterval: 30000,
  });

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

  // Función para eliminar liga (para resolver disputas)
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

  const handleEditPlayer = (player: Player) => {
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

        {/* Estadísticas generales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        </div>

        {/* Panel de pestañas */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-nfl-gray">
            <TabsTrigger value="users" className="text-white">Gestión de Usuarios</TabsTrigger>
            <TabsTrigger value="leagues" className="text-white">Supervisión de Ligas</TabsTrigger>
            <TabsTrigger value="players" className="text-white">Edición de Jugadores</TabsTrigger>
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
                          <div className="w-10 h-10 bg-nfl-blue rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.full_name}</p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                            <p className="text-xs text-gray-500">
                              Registrado: {new Date(user.created_at).toLocaleDateString()}
                            </p>
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
                                Ver Detalles
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-nfl-gray border-nfl-light-gray/20">
                              <DialogHeader>
                                <DialogTitle className="text-white">Detalles del Usuario</DialogTitle>
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
                                {user.favorite_team && (
                                  <div>
                                    <Label className="text-gray-400">Equipo Favorito</Label>
                                    <p className="text-white">{user.favorite_team}</p>
                                  </div>
                                )}
                                <Alert>
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription>
                                    ⚠️ Las funciones de banear/verificar usuarios estarán disponibles 
                                    después de ejecutar la migración de la base de datos.
                                  </AlertDescription>
                                </Alert>
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
                                      onClick={() => handleEditPlayer(selectedPlayer)}
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
        </Tabs>
      </div>
    </Layout>
  );
} 