import { useState, useEffect } from "react";
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
  UserCheck, Edit, Database, Trophy, Eye, Trash2, RotateCcw, Target, Settings, Zap, Activity, Plus
} from "lucide-react";
import { ProviderSelector } from "@/components/ProviderSelector";
import { DataSyncControl } from "@/components/DataSyncControl";
import { LiveScoreBoard } from "@/components/LiveScoreBoard";
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
  draft_date?: string;
  settings?: any;
}

interface LeagueMember {
  id: string;
  user_id: string;
  league_id: string;
  team_id: string;
  role?: string;
  joined_at?: string;
  user?: { full_name: string; email: string };
  fantasy_team?: { 
    name: string; 
    eliminated: boolean;
    points?: number;
  };
}

interface LeagueTeam {
  id: string;
  name: string;
  user_id: string;
  league_id: string;
  eliminated: boolean;
  points?: number;
  user?: { full_name: string; email: string };
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
  eliminated?: boolean;
  points?: number;
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
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [showRosterDialog, setShowRosterDialog] = useState(false);
  const [showLeagueDetailsDialog, setShowLeagueDetailsDialog] = useState(false);
  const [teamRoster, setTeamRoster] = useState<RosterPlayer[]>([]);
  // Get current active week dynamically like Team Battle does
  const { data: currentWeekData } = useQuery({
    queryKey: ["currentWeek", selectedLeague?.id],
    queryFn: async () => {
      if (!selectedLeague?.id) return { number: 1 };

      const { data, error } = await supabase
        .from("weeks")
        .select("number")
        .eq("league_id", selectedLeague.id)
        .eq("status", "active")
        .single();

      if (error) return { number: 1 };
      return data;
    },
    enabled: !!selectedLeague?.id,
  });

  // Local state for admin to manually select week for editing
  const [selectedWeek, setSelectedWeek] = useState(1);
  const currentWeek = currentWeekData?.number || 1;

  // Update selectedWeek when currentWeek changes (initialize with active week)
  useEffect(() => {
    if (currentWeekData?.number) {
      setSelectedWeek(currentWeekData.number);
    }
  }, [currentWeekData?.number]);
  const [activeTab, setActiveTab] = useState("data");
  const [banReason, setBanReason] = useState("");
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [userFilter, setUserFilter] = useState<'all' | 'banned' | 'verified' | 'admins'>('all');
  const [selectedLeagueTab, setSelectedLeagueTab] = useState("info");
  const [editingTeamPlayer, setEditingTeamPlayer] = useState<{teamId: string; playerId: number} | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");

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

  // Obtener detalles de liga seleccionada
  const { data: leagueDetails } = useQuery({
    queryKey: ["adminLeagueDetails", selectedLeague?.id],
    queryFn: async () => {
      if (!selectedLeague?.id) return null;
      
      // Primero obtener la liga básica
      const { data: leagueData, error: leagueError } = await supabase
        .from("leagues")
        .select(`
          *,
          owner:owner_id(full_name, email, id)
        `)
        .eq("id", selectedLeague.id)
        .single();

      if (leagueError) throw leagueError;

      // Obtener los miembros de la liga
      const { data: membersData, error: membersError } = await supabase
        .from("league_members")
        .select(`
          id,
          user_id,
          team_id,
          role,
          joined_at
        `)
        .eq("league_id", selectedLeague.id);

      if (membersError) throw membersError;

      // Obtener los equipos de fantasy
      const { data: teamsData, error: teamsError } = await supabase
        .from("fantasy_teams")
        .select(`
          id,
          name,
          user_id,
          eliminated,
          points,
          eliminated_week,
          user:user_id(full_name, email)
        `)
        .eq("league_id", selectedLeague.id);

      if (teamsError) throw teamsError;

      return {
        ...leagueData,
        league_members: membersData,
        fantasy_teams: teamsData
      };
    },
    enabled: !!selectedLeague?.id,
  });

  // Obtener jugadores de un equipo específico
  const { data: teamPlayers } = useQuery({
    queryKey: ["adminTeamPlayers", editingTeamPlayer?.teamId],
    queryFn: async () => {
      if (!editingTeamPlayer?.teamId) return [];
      
      const { data, error } = await supabase
        .from("team_rosters")
        .select(`
          id,
          player_id,
          slot,
          acquired_week,
          acquired_type,
          is_active,
          player:player_id(
            id,
            name,
            position,
            nfl_team_id,
            nfl_team:nfl_team_id(name, abbreviation)
          )
        `)
        .eq("fantasy_team_id", editingTeamPlayer.teamId)
        .eq("week", selectedWeek)
        .eq("is_active", true)
        .order("player_id")
        .order("acquired_week", { ascending: false });

      if (error) throw error;

      // Filtrar duplicados - mantener solo el registro más reciente de cada jugador
      const uniquePlayers = new Map();
      data?.forEach((roster: any) => {
        const playerId = roster.player_id;
        if (!uniquePlayers.has(playerId) ||
            roster.acquired_week > uniquePlayers.get(playerId).acquired_week) {
          uniquePlayers.set(playerId, roster);
        }
      });

      return Array.from(uniquePlayers.values());
    },
    enabled: !!editingTeamPlayer?.teamId,
  });

  // Mutación para cambiar jugador de un equipo
  const changeTeamPlayerMutation = useMutation({
    mutationFn: async ({ teamId, oldPlayerId, newPlayerId, slot }: { teamId: string; oldPlayerId: number; newPlayerId: number; slot: string }) => {
      // Primero desactivar el jugador actual
      const { error: removeError } = await supabase
        .from("team_rosters")
        .update({ is_active: false })
        .eq("fantasy_team_id", teamId)
        .eq("player_id", oldPlayerId)
        .eq("is_active", true);

      if (removeError) throw removeError;

      // Luego agregar el nuevo jugador en el mismo slot
      const { error: addError } = await supabase
        .from("team_rosters")
        .insert({
          fantasy_team_id: teamId,
          player_id: newPlayerId,
          week: currentWeek || 1,
          slot: slot,  // Use the same slot as the replaced player
          acquired_week: currentWeek || 1,
          acquired_type: "free_agent",
          is_active: true
        });

      if (addError) throw addError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTeamPlayers"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeagueDetails"] });
      toast({
        title: "Éxito",
        description: "Jugador cambiado exitosamente",
      });
      setEditingTeamPlayer(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Error al cambiar jugador: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para eliminar jugador de un equipo
  const removeTeamPlayerMutation = useMutation({
    mutationFn: async ({ teamId, playerId }: { teamId: string; playerId: number }) => {
      const { error } = await supabase
        .from("team_rosters")
        .update({ is_active: false })
        .eq("fantasy_team_id", teamId)
        .eq("player_id", playerId)
        .eq("is_active", true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTeamPlayers"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeagueDetails"] });
      // Invalidate Team Battle queries
      queryClient.invalidateQueries({ queryKey: ["rosterWithDetails"] });
      queryClient.invalidateQueries({ queryKey: ["fantasyTeams"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStandings"] });
      queryClient.invalidateQueries({ queryKey: ["teamProjections"] });
      toast({
        title: "Éxito",
        description: "Jugador eliminado del equipo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Error al eliminar jugador: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para agregar jugador a un equipo
  const addTeamPlayerMutation = useMutation({
    mutationFn: async ({ teamId, playerId, slot, isNewSlot }: { teamId: string; playerId: number; slot: string; isNewSlot?: boolean }) => {
      if (isNewSlot) {
        // Para slots nuevos (vacíos), simplemente agregar sin verificar/reemplazar
        const { error } = await supabase
          .from("team_rosters")
          .insert({
            fantasy_team_id: teamId,
            player_id: playerId,
            week: currentWeek || 1,
            slot: slot,
            acquired_week: currentWeek || 1,
            acquired_type: "free_agent",
            is_active: true
          });

        if (error) throw error;
      } else {
        // Lógica original para reemplazar slots existentes
        // First check if slot is occupied
        const { data: existingPlayer } = await supabase
          .from("team_rosters")
          .select("player_id")
          .eq("fantasy_team_id", teamId)
          .eq("slot", slot)
          .eq("is_active", true)
          .single();

        // If slot is occupied, deactivate the current player
        if (existingPlayer) {
          const { error: removeError } = await supabase
            .from("team_rosters")
            .update({ is_active: false })
            .eq("fantasy_team_id", teamId)
            .eq("player_id", existingPlayer.player_id)
            .eq("is_active", true);

          if (removeError) throw removeError;
        }

        // Add the new player to the slot
        const { error } = await supabase
          .from("team_rosters")
          .insert({
            fantasy_team_id: teamId,
            player_id: playerId,
            week: currentWeek || 1,
            slot: slot,
            acquired_week: currentWeek || 1,
            acquired_type: "free_agent",
            is_active: true
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTeamPlayers"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeagueDetails"] });
      // Invalidate Team Battle queries
      queryClient.invalidateQueries({ queryKey: ["rosterWithDetails"] });
      queryClient.invalidateQueries({ queryKey: ["fantasyTeams"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStandings"] });
      queryClient.invalidateQueries({ queryKey: ["teamProjections"] });
      toast({
        title: "Éxito",
        description: "Jugador agregado al equipo",
      });
      setAvailablePlayers([]);
      setSelectedSlot("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Error al agregar jugador: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar configuración de la liga
  const updateLeagueMutation = useMutation({
    mutationFn: async (leagueData: Partial<League>) => {
      const { error } = await supabase
        .from("leagues")
        .update(leagueData)
        .eq("id", selectedLeague?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminLeagues"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeagueDetails"] });
      toast({
        title: "Éxito",
        description: "Liga actualizada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Error al actualizar liga: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Búsqueda de jugadores disponibles con filtro por posición
  const searchAvailablePlayers = async (search: string, positionFilter?: string) => {
    // Si no hay posición seleccionada, no buscar
    if (!positionFilter) {
      setAvailablePlayers([]);
      return;
    }

    let query = supabase
      .from("players")
      .select(`
        id,
        name,
        position,
        nfl_team_id,
        nfl_team:nfl_team_id(name, abbreviation)
      `)
      .ilike("name", `%${search}%`)
      .limit(20);

    // Aplicar filtro por posición según el slot seleccionado
    if (positionFilter === "FLEX") {
      // Para FLEX, incluir RB, WR, TE
      query = query.in("position", ["RB", "WR", "TE"]);
    } else if (positionFilter === "DP") {
      // Para DP, incluir posiciones defensivas
      query = query.in("position", ["DP", "LB", "DB", "DL"]);
    } else {
      // Para posiciones específicas (QB, RB, WR, TE, K, DEF)
      query = query.eq("position", positionFilter);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error",
        description: "Error al buscar jugadores",
        variant: "destructive",
      });
      return;
    }

    setAvailablePlayers(data || []);
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-nfl-blue" />
            <div>
              <h1 className="text-3xl font-bold text-white">Panel de Administración</h1>
              <p className="text-gray-400">Gestión completa del sistema Last Survive</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/testing'}
          >
            <Settings className="h-4 w-4 mr-2" />
            Testing Dashboard
          </Button>
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
          <TabsList className="grid w-full grid-cols-6 bg-nfl-gray">
            <TabsTrigger value="users" className="text-white">Gestión de Usuarios</TabsTrigger>
            <TabsTrigger value="data" className="text-white">Gestión de Datos</TabsTrigger>
            <TabsTrigger value="live" className="text-white">En Vivo</TabsTrigger>
            <TabsTrigger value="leagues" className="text-white">Supervisión de Ligas</TabsTrigger>
            <TabsTrigger value="players" className="text-white">Edición de Jugadores</TabsTrigger>
            <TabsTrigger value="teams" className="text-white">Gestión de Equipos</TabsTrigger>
          </TabsList>


          {/* Data Management - SportsData Integration */}
          <TabsContent value="data" className="space-y-6">
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Fantasy Data Provider
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProviderSelector />
              </CardContent>
            </Card>

            {/* Data Sync Control */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20 mt-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Synchronization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataSyncControl />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Score Board - Real-time Stats */}
          <TabsContent value="live" className="space-y-6">
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Puntuación en Vivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedLeague ? (
                  <LiveScoreBoard 
                    leagueId={selectedLeague.id}
                    week={currentWeek || 1}
                    season={2024}
                    autoStart={false}
                  />
                ) : (
                  <Alert className="border-yellow-600 bg-yellow-600/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-white">
                      Selecciona una liga para ver las puntuaciones en vivo
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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
                            onClick={() => {
                              setSelectedLeague(league);
                              setShowLeagueDetailsDialog(true);
                            }}
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Gestionar Liga
                          </Button>
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
                                <DialogTitle className="text-white">Eliminar Liga - {league.name}</DialogTitle>
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

        {/* Diálogo de Gestión Completa de Liga */}
        <Dialog open={showLeagueDetailsDialog} onOpenChange={setShowLeagueDetailsDialog}>
          <DialogContent className="bg-nfl-gray border-nfl-light-gray/20 max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Gestión Completa de Liga - {selectedLeague?.name}
              </DialogTitle>
            </DialogHeader>

            {leagueDetails && (
              <Tabs value={selectedLeagueTab} onValueChange={setSelectedLeagueTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-4 bg-nfl-dark">
                  <TabsTrigger value="info">Información</TabsTrigger>
                  <TabsTrigger value="teams">Equipos</TabsTrigger>
                  <TabsTrigger value="players">Jugadores</TabsTrigger>
                  <TabsTrigger value="settings">Configuración</TabsTrigger>
                </TabsList>

                {/* Tab de Información General */}
                <TabsContent value="info" className="space-y-4">
                  <Card className="bg-nfl-dark border-nfl-light-gray/20">
                    <CardHeader>
                      <CardTitle className="text-white">Información General</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-400">Nombre de la Liga</Label>
                          <p className="text-white font-medium">{leagueDetails.name}</p>
                        </div>
                        <div>
                          <Label className="text-gray-400">Estado</Label>
                          <Badge variant={leagueDetails.status === 'active' ? 'default' : 'secondary'}>
                            {leagueDetails.status}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-gray-400">Propietario</Label>
                          <p className="text-white">{leagueDetails.owner?.full_name}</p>
                          <p className="text-xs text-gray-400">{leagueDetails.owner?.email}</p>
                        </div>
                        <div>
                          <Label className="text-gray-400">Fecha de Creación</Label>
                          <p className="text-white">{new Date(leagueDetails.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                          <Label className="text-gray-400">Cuota de Entrada</Label>
                          <p className="text-white">${leagueDetails.entry_fee || 0}</p>
                        </div>
                        <div>
                          <Label className="text-gray-400">Miembros</Label>
                          <p className="text-white">{leagueDetails.fantasy_teams?.length || 0} / {leagueDetails.max_members || 10}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-nfl-dark border-nfl-light-gray/20">
                    <CardHeader>
                      <CardTitle className="text-white">Estadísticas de la Liga</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-white">{leagueDetails.fantasy_teams?.length || 0}</p>
                          <p className="text-sm text-gray-400">Equipos Totales</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-400">
                            {leagueDetails.fantasy_teams?.filter((t: any) => !t.eliminated).length || 0}
                          </p>
                          <p className="text-sm text-gray-400">Equipos Activos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-400">
                            {leagueDetails.fantasy_teams?.filter((t: any) => t.eliminated).length || 0}
                          </p>
                          <p className="text-sm text-gray-400">Equipos Eliminados</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab de Equipos */}
                <TabsContent value="teams" className="space-y-4">
                  <Card className="bg-nfl-dark border-nfl-light-gray/20">
                    <CardHeader>
                      <CardTitle className="text-white">Equipos de la Liga</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {leagueDetails.fantasy_teams?.map((team: any) => (
                          <div key={team.id} className="flex items-center justify-between p-4 border border-nfl-light-gray/20 rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                team.eliminated ? 'bg-red-600' : 'bg-green-600'
                              }`}>
                                <Target className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-white">{team.name}</p>
                                <p className="text-sm text-gray-400">
                                  Propietario: {team.user?.full_name} ({team.user?.email})
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant={team.eliminated ? 'destructive' : 'default'}>
                                    {team.eliminated ? 'Eliminado' : 'Activo'}
                                  </Badge>
                                  <span className="text-xs text-gray-400">
                                    Puntos totales: {team.points || 0}
                                  </span>
                                  {team.eliminated && team.eliminated_week && (
                                    <span className="text-xs text-red-400">
                                      Semana {team.eliminated_week}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingTeamPlayer({ teamId: team.id, playerId: 0 });
                                  setSelectedLeagueTab("players"); // Cambiar a la pestaña de jugadores
                                }}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Editar Roster
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewRoster({ ...team, league_id: selectedLeague.id })}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Detalles
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab de Jugadores */}
                <TabsContent value="players" className="space-y-4">
                  <Card className="bg-nfl-dark border-nfl-light-gray/20">
                    <CardHeader>
                      <CardTitle className="text-white">Todos los Jugadores de la Liga</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {editingTeamPlayer ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-white">
                                Editando Roster del Equipo
                              </h3>
                              <p className="text-sm text-gray-400">
                                {leagueDetails.fantasy_teams?.find((t: any) => t.id === editingTeamPlayer.teamId)?.name || 'Equipo'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedLeagueTab("teams")}
                              >
                                Ver Equipos
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingTeamPlayer(null)}
                              >
                                Cerrar Edición
                              </Button>
                            </div>
                          </div>

                          {/* Roster organizado por slots */}
                          <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-white mb-4">
                              Roster del Equipo - Formato Team Battle
                            </h4>

                            {(() => {
                              // Definir los slots en orden con múltiples posiciones
                              const slotDefinitions = [
                                { position: 'QB', count: 1 },
                                { position: 'RB', count: 2 },
                                { position: 'WR', count: 2 },
                                { position: 'TE', count: 1 },
                                { position: 'FLEX', count: 1 },
                                { position: 'K', count: 1 },
                                { position: 'DEF', count: 1 },
                                { position: 'DP', count: 1 }
                              ];

                              // Crear array de todos los slots individuales
                              const allSlots: Array<{position: string, index: number, slotId: string}> = [];
                              slotDefinitions.forEach(({ position, count }) => {
                                for (let i = 0; i < count; i++) {
                                  allSlots.push({
                                    position,
                                    index: i,
                                    slotId: count > 1 ? `${position}_${i + 1}` : position
                                  });
                                }
                              });

                              // Agrupar jugadores por posición
                              const playersByPosition = new Map();
                              teamPlayers?.forEach((roster: any) => {
                                const position = roster.slot;
                                if (!playersByPosition.has(position)) {
                                  playersByPosition.set(position, []);
                                }
                                playersByPosition.get(position).push(roster);
                              });

                              return allSlots.map((slotInfo) => {
                                const { position, index, slotId } = slotInfo;
                                const playersInPosition = playersByPosition.get(position) || [];
                                const player = playersInPosition[index];

                                return (
                                  <div key={slotId} className="border border-nfl-light-gray/20 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-nfl-blue rounded-full flex items-center justify-center">
                                          <span className="text-white text-sm font-bold">
                                            {slotDefinitions.find(s => s.position === position)?.count > 1
                                              ? `${position}${index + 1}`
                                              : position}
                                          </span>
                                        </div>

                                        {player ? (
                                          // Jugador asignado
                                          <div>
                                            <p className="text-white font-medium">{player.player?.name}</p>
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-gray-400">
                                                {player.player?.position}
                                              </span>
                                              <span className="text-xs text-gray-400">
                                                {player.player?.nfl_team?.abbreviation}
                                              </span>
                                            </div>
                                          </div>
                                        ) : (
                                          // Slot vacío
                                          <div>
                                            <p className="text-gray-400 font-medium">Slot Vacío</p>
                                            <p className="text-xs text-gray-500">
                                              {position === 'FLEX' ? 'RB/WR/TE' : `Necesita ${position}`}
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex gap-2">
                                        {player ? (
                                          // Botones para jugador existente
                                          <>
                                            <Dialog>
                                              <DialogTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                  <Edit className="h-4 w-4 mr-1" />
                                                  Cambiar
                                                </Button>
                                              </DialogTrigger>
                                              <DialogContent className="bg-nfl-gray border-nfl-light-gray/20">
                                                <DialogHeader>
                                                  <DialogTitle className="text-white">Cambiar Jugador en {position}</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                  <p className="text-gray-400">
                                                    Reemplazar a <strong className="text-white">{player.player?.name}</strong>
                                                  </p>
                                                  <Input
                                                    placeholder={`Buscar nuevo ${position}...`}
                                                    onChange={(e) => {
                                                      if (e.target.value.length > 2) {
                                                        searchAvailablePlayers(e.target.value, position);
                                                      } else {
                                                        setAvailablePlayers([]);
                                                      }
                                                    }}
                                                    className="bg-nfl-dark border-nfl-light-gray/20"
                                                  />
                                                  {availablePlayers.length > 0 && (
                                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                                      {availablePlayers.map((availablePlayer) => (
                                                        <div key={availablePlayer.id} className="flex items-center justify-between p-2 hover:bg-nfl-dark rounded">
                                                          <div>
                                                            <span className="text-white">{availablePlayer.name}</span>
                                                            <span className="text-gray-400 ml-2">({availablePlayer.position})</span>
                                                            {availablePlayer.nfl_team && (
                                                              <span className="text-gray-500 ml-2">{availablePlayer.nfl_team.abbreviation}</span>
                                                            )}
                                                          </div>
                                                          <Button
                                                            size="sm"
                                                            onClick={() => changeTeamPlayerMutation.mutate({
                                                              teamId: editingTeamPlayer.teamId,
                                                              oldPlayerId: player.player_id,
                                                              newPlayerId: availablePlayer.id,
                                                              slot: position
                                                            })}
                                                          >
                                                            Seleccionar
                                                          </Button>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              </DialogContent>
                                            </Dialog>
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              onClick={() => removeTeamPlayerMutation.mutate({
                                                teamId: editingTeamPlayer.teamId,
                                                playerId: player.player_id
                                              })}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </>
                                        ) : (
                                          // Botón para slot vacío
                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <Button variant="outline" size="sm" className="text-green-400 border-green-400 hover:bg-green-400/10">
                                                <Plus className="h-4 w-4 mr-1" />
                                                Agregar {position}
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-nfl-gray border-nfl-light-gray/20">
                                              <DialogHeader>
                                                <DialogTitle className="text-white">Agregar Jugador a {position}</DialogTitle>
                                              </DialogHeader>
                                              <div className="space-y-4">
                                                <p className="text-gray-400">
                                                  Buscar jugador para el slot <strong className="text-white">{position}</strong>
                                                </p>
                                                <Input
                                                  placeholder={`Buscar ${position}...`}
                                                  onChange={(e) => {
                                                    if (e.target.value.length > 2) {
                                                      searchAvailablePlayers(e.target.value, position);
                                                    } else {
                                                      setAvailablePlayers([]);
                                                    }
                                                  }}
                                                  className="bg-nfl-dark border-nfl-light-gray/20"
                                                />
                                                {availablePlayers.length > 0 && (
                                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                                    {availablePlayers.map((availablePlayer) => (
                                                      <div key={availablePlayer.id} className="flex items-center justify-between p-2 hover:bg-nfl-dark rounded">
                                                        <div>
                                                          <span className="text-white">{availablePlayer.name}</span>
                                                          <span className="text-gray-400 ml-2">({availablePlayer.position})</span>
                                                          {availablePlayer.nfl_team && (
                                                            <span className="text-gray-500 ml-2">{availablePlayer.nfl_team.abbreviation}</span>
                                                          )}
                                                        </div>
                                                        <Button
                                                          size="sm"
                                                          onClick={() => addTeamPlayerMutation.mutate({
                                                            teamId: editingTeamPlayer.teamId,
                                                            playerId: availablePlayer.id,
                                                            slot: position,
                                                            isNewSlot: !player // Si no hay player en este slot, es un slot nuevo
                                                          })}
                                                        >
                                                          Agregar a {position}
                                                        </Button>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </DialogContent>
                                          </Dialog>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-400">Selecciona un equipo para ver y editar sus jugadores</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab de Configuración */}
                <TabsContent value="settings" className="space-y-4">
                  <Card className="bg-nfl-dark border-nfl-light-gray/20">
                    <CardHeader>
                      <CardTitle className="text-white">Configuración de la Liga</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-gray-400">Nombre de la Liga</Label>
                        <Input
                          value={leagueDetails.name}
                          onChange={(e) => {
                            // Aquí podrías actualizar un estado local si quieres edición en tiempo real
                          }}
                          className="bg-nfl-dark border-nfl-light-gray/20"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">Estado de la Liga</Label>
                        <Select value={leagueDetails.status} onValueChange={(value) => {
                          updateLeagueMutation.mutate({ status: value });
                        }}>
                          <SelectTrigger className="bg-nfl-dark border-nfl-light-gray/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Activa</SelectItem>
                            <SelectItem value="completed">Completada</SelectItem>
                            <SelectItem value="cancelled">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-gray-400">Cuota de Entrada</Label>
                        <Input
                          type="number"
                          value={leagueDetails.entry_fee || 0}
                          onChange={(e) => {
                            // Actualizar cuota
                          }}
                          className="bg-nfl-dark border-nfl-light-gray/20"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">Máximo de Miembros</Label>
                        <Input
                          type="number"
                          value={leagueDetails.max_members || 10}
                          onChange={(e) => {
                            // Actualizar máximo
                          }}
                          className="bg-nfl-dark border-nfl-light-gray/20"
                        />
                      </div>
                      
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Los cambios en la configuración de la liga afectarán inmediatamente a todos los participantes.
                        </AlertDescription>
                      </Alert>

                      <Button
                        onClick={() => {
                          toast({
                            title: "Función en desarrollo",
                            description: "La actualización masiva de configuración estará disponible pronto",
                          });
                        }}
                      >
                        Guardar Configuración
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

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
                    value={selectedWeek.toString()}
                    onValueChange={(value) => {
                      setSelectedWeek(parseInt(value));
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