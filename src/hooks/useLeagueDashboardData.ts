import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LeagueMember {
  id: string;
  name: string;
  email: string;
  teamName: string;
  status: "active" | "banned" | "pending";
  joinDate: string;
  avatar?: string;
  lastActive?: string;
  role: string;
  eliminated: boolean;
  user_id: string;
  team_id: string;
}

interface SupabaseUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  banned: boolean;
  created_at: string;
  updated_at: string;
}

interface SupabaseFantasyTeam {
  id: string;
  name: string;
  eliminated: boolean;
  points: number;
  rank: number;
}

interface SupabaseLeagueMember {
  id: string;
  role: string;
  joined_at: string;
  user_id: string;
  team_id: string;
  users: SupabaseUser;
  fantasy_teams: SupabaseFantasyTeam | null;
}

interface SupabaseTrade {
  id: string;
  status: string;
  created_at: string;
  season: number;
  week: number;
  notes?: string;
  proposer_team_id: string;
  target_team_id: string;
  proposer_team: {
    name: string;
  } | null;
  target_team: {
    name: string;
  } | null;
  trade_items: Array<{
    id: string;
    player_id: number;
    team_id: string;
    players: {
      id: number;
      name: string;
      position: string;
    };
  }>;
}

interface SupabaseTeam {
  id: string;
  name: string;
  points: number;
  rank: number;
  eliminated: boolean;
  user_id: string;
  users: {
    id: string;
    full_name: string;
  } | null;
}

interface RosterPlayerFromRPC {
  roster_id: number;
  player_id: number;
  player_name: string;
  player_position: string;
  slot: string;
  is_active: boolean;
  acquired_type: string;
  acquired_week: number;
  fantasy_points: number;
  nfl_team_name: string;
}

export interface LeagueTrade {
  id: string;
  fromTeam: string;
  fromPlayer: string;
  fromPlayerPosition?: string;
  toTeam: string;
  toPlayer: string;
  toPlayerPosition?: string;
  date: string;
  status: "pending" | "completed" | "vetoed" | "accepted" | "rejected";
  proposedBy?: string;
  vetoReason?: string;
  tradeValue?: {
    fromPlayerValue: number;
    toPlayerValue: number;
  };
  season: number;
  week: number;
}

export interface LeagueTeam {
  id: string;
  name: string;
  owner: string;
  owner_id: string;
  wins: number;
  losses: number;
  points: number;
  eliminated: boolean;
  rank: number;
  roster: Array<{
    id: number;
    name: string;
    position: string;
    points: number;
    roster_id: number;
    slot: string;
    is_active: boolean;
  }>;
}

export interface LeagueStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  pendingUsers: number;
  currentWeek: number;
  activeTrades: number;
  completedTrades: number;
  totalMatches: number;
  leagueName: string;
  season: number;
}

export function useLeagueDashboardData(leagueId: string, week?: number) {
  const { user } = useAuth();

  // Obtener semana actual si no se proporciona una específica
  const { data: currentWeekData } = useQuery({
    queryKey: ["currentWeek", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weeks")
        .select("number")
        .eq("league_id", leagueId)
        .eq("status", "active")
        .single();
      if (error) {
        // Si no hay semana activa, usar semana 1 por defecto
        return { number: 1 };
      }
      return data;
    },
    enabled: !!leagueId && !week, // Solo ejecutar si no se proporciona semana específica
  });

  const selectedWeek = week || currentWeekData?.number || 1;

  // Obtener información básica de la liga
  const {
    data: leagueInfo,
    isLoading: leagueLoading,
    error: leagueError,
  } = useQuery({
    queryKey: ["leagueInfo", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select("name, created_at")
        .eq("id", leagueId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!leagueId && !!user,
  });

  // Obtener miembros de la liga directamente de league_members (como en admin panel)
  const {
    data: members,
    isLoading: membersLoading,
    error: membersError,
  } = useQuery({
    queryKey: ["leagueMembers", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("league_members")
        .select(
          `
          id,
          role,
          joined_at,
          user_id,
          team_id,
          users!inner(
            id,
            full_name,
            email,
            avatar_url,
            banned,
            created_at,
            updated_at
          ),
          fantasy_teams(
            id,
            name,
            eliminated,
            points,
            rank
          )
        `
        )
        .eq("league_id", leagueId);

      if (error) throw error;

      return ((data as SupabaseLeagueMember[]) || []).map((member) => ({
        id: member.id,
        name: member.users.full_name,
        email: member.users.email,
        teamName: member.fantasy_teams?.name || "Sin equipo",
        status: member.users.banned ? ("banned" as const) : ("active" as const),
        joinDate: member.joined_at || new Date().toISOString(),
        avatar: member.users.avatar_url || undefined,
        lastActive: member.users.updated_at || undefined,
        role: member.role,
        eliminated: member.fantasy_teams?.eliminated || false,
        user_id: member.user_id || "",
        team_id: member.team_id || "",
      })) as LeagueMember[];
    },
    enabled: !!leagueId && !!user,
  });

  // Obtener intercambios con datos reales de equipos y jugadores
  const {
    data: trades,
    isLoading: tradesLoading,
    error: tradesError,
  } = useQuery({
    queryKey: ["leagueTrades", leagueId, selectedWeek],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades")
        .select(
          `
          id,
          status,
          created_at,
          season,
          week,
          notes,
          proposer_team_id,
          target_team_id,
          proposer_team:fantasy_teams!proposer_team_id(name),
          target_team:fantasy_teams!target_team_id(name),
          trade_items(
            id,
            player_id,
            team_id,
            players(id, name, position)
          )
        `
        )
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return ((data as SupabaseTrade[]) || []).map((trade) => {
        // Obtener jugadores de cada equipo
        const fromTeamItems =
          trade.trade_items?.filter(
            (item) => item.team_id === trade.proposer_team_id
          ) || [];
        const toTeamItems =
          trade.trade_items?.filter(
            (item) => item.team_id === trade.target_team_id
          ) || [];

        const fromPlayer = fromTeamItems[0]?.players?.name || "Sin jugador";
        const toPlayer = toTeamItems[0]?.players?.name || "Sin jugador";
        const fromPlayerPosition = fromTeamItems[0]?.players?.position;
        const toPlayerPosition = toTeamItems[0]?.players?.position;

        return {
          id: trade.id,
          fromTeam: trade.proposer_team?.name || "Equipo desconocido",
          fromPlayer,
          fromPlayerPosition,
          toTeam: trade.target_team?.name || "Equipo desconocido",
          toPlayer,
          toPlayerPosition,
          date: trade.created_at,
          status: trade.status as LeagueTrade["status"],
          season: trade.season,
          week: trade.week,
        };
      }) as LeagueTrade[];
    },
    enabled: !!leagueId && !!user && !!selectedWeek,
  });

  // Obtener equipos con rosters reales
  const {
    data: teams,
    isLoading: teamsLoading,
    error: teamsError,
  } = useQuery({
    queryKey: ["leagueTeams", leagueId, selectedWeek],
    queryFn: async () => {
      // Primero obtener información básica de los equipos
      const { data: teamsData, error } = await supabase
        .from("fantasy_teams")
        .select(
          `
          id,
          name,
          points,
          rank,
          eliminated,
          user_id,
          users(
            id,
            full_name
          )
        `
        )
        .eq("league_id", leagueId)
        .order("rank", { ascending: true });

      if (error) throw error;

      // Para cada equipo, obtener su roster usando la función admin
      const teamsWithRosters = await Promise.all(
        ((teamsData as SupabaseTeam[]) || []).map(async (team) => {
          // Obtener roster del equipo para la semana seleccionada
          const { data: rosterData, error: rosterError } = await supabase.rpc(
            "get_team_roster_admin",
            {
              team_id: team.id,
              week_num: selectedWeek,
            }
          );

          if (rosterError) {
            console.error(
              "Error fetching roster for team",
              team.id,
              rosterError
            );
          }

          const roster = ((rosterData as RosterPlayerFromRPC[]) || []).map(
            (player) => ({
              id: player.player_id,
              name: player.player_name,
              position: player.player_position,
              points: Number(player.fantasy_points) || 0,
              roster_id: player.roster_id,
              slot: player.slot,
              is_active: player.is_active,
            })
          );

          return {
            id: team.id,
            name: team.name,
            owner: team.users?.full_name || "Sin propietario",
            owner_id: team.user_id || "",
            wins: 0,
            losses: 0,
            points: team.points || 0,
            eliminated: team.eliminated || false,
            rank: team.rank || 0,
            roster,
          };
        })
      );

      return teamsWithRosters as LeagueTeam[];
    },
    enabled: !!leagueId && !!user && !!selectedWeek,
  });

  // Calcular estadísticas
  const stats: LeagueStats | undefined =
    leagueInfo && members && trades
      ? {
          totalUsers: members.length,
          activeUsers: members.filter((m) => m.status === "active").length,
          bannedUsers: members.filter((m) => m.status === "banned").length,
          pendingUsers: members.filter((m) => m.status === "pending").length,
          currentWeek: selectedWeek,
          activeTrades: trades.filter(
            (t) => t.status === "pending" || t.status === "accepted"
          ).length,
          completedTrades: trades.filter((t) => t.status === "completed")
            .length,
          totalMatches: 0,
          leagueName: leagueInfo.name,
          season: 2024,
        }
      : undefined;

  return {
    members,
    trades,
    teams,
    stats,
    selectedWeek,
    isLoading: leagueLoading || membersLoading || tradesLoading || teamsLoading,
    error: leagueError || membersError || tradesError || teamsError,
  };
}
