import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useLocation } from "react-router-dom";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, TrendingUp, UserPlus, AlertCircle, Heart, Shield, Users, CheckCircle } from "lucide-react";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useFreeAgentPlayers } from "@/hooks/useFreeAgentPlayers";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { cn } from "@/lib/utils";

export default function FreeAgency() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "";
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: userTeam } = useUserFantasyTeam(leagueId);
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'position' | 'team' | 'points' | 'projected_points'>('projected_points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const [selectedDropPlayer, setSelectedDropPlayer] = useState<string>("");
  const pageSize = 25;

  // Get current week
  const { data: currentWeek } = useQuery({
    queryKey: ["currentWeek", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weeks")
        .select("number")
        .eq("league_id", leagueId)
        .eq("status", "active")
        .single();

      if (error) return { number: 1 };
      return data;
    },
    enabled: !!leagueId,
  });

  const weekNumber = currentWeek?.number || 1;

  // Get free agent players for this league
  const { data: freeAgentPlayers = [] } = useFreeAgentPlayers(leagueId, weekNumber);

  // Get user's current roster
  const slotOrder = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'DP'];
  const { data: userRosterData = [] } = useRosterWithPlayerDetails(userTeam?.id || "", weekNumber);

  const userRoster = [...userRosterData].sort((a, b) => {
    const aSlot = a.slot || a.position;
    const bSlot = b.slot || b.position;
    const aIndex = slotOrder.indexOf(aSlot);
    const bIndex = slotOrder.indexOf(bSlot);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return aSlot.localeCompare(bSlot);
  });

  // Filter and sort players
  const filteredPlayers = freeAgentPlayers
    .filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           player.team.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === "all" || player.position === positionFilter;
      return matchesSearch && matchesPosition;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'position':
          comparison = a.position.localeCompare(b.position);
          break;
        case 'team':
          comparison = a.team.localeCompare(b.team);
          break;
        case 'points':
          comparison = (b.points || 0) - (a.points || 0);
          break;
        case 'projected_points':
        default:
          comparison = (b.projected_points || 0) - (a.projected_points || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / pageSize);
  const paginatedPlayers = filteredPlayers.slice((page - 1) * pageSize, page * pageSize);

  // Handle sorting
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'points' || column === 'projected_points' ? 'desc' : 'asc');
    }
  };

  // Get position color
  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      'QB': 'bg-red-500/10 text-red-500 border-red-500/20',
      'RB': 'bg-green-500/10 text-green-500 border-green-500/20',
      'WR': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'TE': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'K': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'DEF': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'DP': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    };
    return colors[position] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const handleAddPlayer = async () => {
    if (!selectedPlayer || !userTeam) {
      toast({
        title: "Error",
        description: "Por favor selecciona un jugador para agregar",
        variant: "destructive",
      });
      return;
    }

    // Validate roster size
    const currentRosterSize = userRoster.length;
    const finalSize = selectedDropPlayer ? currentRosterSize : currentRosterSize + 1;

    if (finalSize > 10) {
      toast({
        title: "Error",
        description: "Tu roster está lleno. Debes soltar un jugador primero.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('claim_free_agent', {
        p_league_id: leagueId,
        p_fantasy_team_id: userTeam.id,
        p_player_id: parseInt(selectedPlayer),
        p_drop_player_id: selectedDropPlayer ? parseInt(selectedDropPlayer) : null,
        p_week: weekNumber
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Failed to add free agent");
      }

      const playerName = freeAgentPlayers.find(p => p.id === selectedPlayer)?.name || "Jugador";

      toast({
        title: "✅ ¡Jugador Agregado!",
        description: selectedDropPlayer
          ? `${playerName} ha sido agregado a tu banca. Se soltó otro jugador.`
          : `${playerName} ha sido agregado a tu banca (BENCH). Actívalo desde tu equipo.`,
      });

      setShowAddPlayerDialog(false);
      setSelectedPlayer(null);
      setSelectedDropPlayer("");

      // Refresh data
      await queryClient.invalidateQueries({
        queryKey: ["rosterWithDetails", userTeam.id, weekNumber]
      });
      await queryClient.invalidateQueries({
        queryKey: ["freeAgentPlayers", leagueId, weekNumber]
      });
    } catch (error) {
      console.error("Error adding free agent:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el jugador. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handlePlayerClick = (playerId: string) => {
    setSelectedPlayer(playerId);
    setShowAddPlayerDialog(true);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-nfl-dark-gray">
        {/* League Header */}
        <LeagueHeader leagueId={leagueId} />

        {/* League Navigation Tabs */}
        <LeagueTabs leagueId={leagueId} activeTab="free-agency" />

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <Card className="bg-nfl-gray border-nfl-light-gray/20 p-6">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Free Agency</h2>
              <p className="text-gray-400">Add players to your roster immediately - first come, first served!</p>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search players by name or team..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9 bg-nfl-dark-gray border-nfl-light-gray/20 text-white"
                  />
                </div>
                <Select value={positionFilter} onValueChange={(val) => { setPositionFilter(val); setPage(1); }}>
                  <SelectTrigger className="w-[200px] bg-nfl-dark-gray border-nfl-light-gray/20 text-white">
                    <SelectValue placeholder="All Positions" />
                  </SelectTrigger>
                  <SelectContent className="bg-nfl-dark-gray border-nfl-light-gray/20">
                    <SelectItem value="all">All Positions</SelectItem>
                    <SelectItem value="QB">QB - Quarterback</SelectItem>
                    <SelectItem value="RB">RB - Running Back</SelectItem>
                    <SelectItem value="WR">WR - Wide Receiver</SelectItem>
                    <SelectItem value="TE">TE - Tight End</SelectItem>
                    <SelectItem value="K">K - Kicker</SelectItem>
                    <SelectItem value="DEF">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        DEF - Defense
                      </div>
                    </SelectItem>
                    <SelectItem value="DP">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        DP - Defensive Player
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results count and pagination */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-400">
                  {filteredPlayers.length} players available
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="border-nfl-light-gray/20 text-gray-300"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-white">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="border-nfl-light-gray/20 text-gray-300"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Players Table */}
            <div className="rounded-lg border border-nfl-light-gray/20">
              <Table>
                <TableHeader>
                  <TableRow className="border-nfl-light-gray/20 hover:bg-transparent">
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-nfl-light-gray/10 text-gray-400"
                      onClick={() => handleSort('name')}
                    >
                      Player
                      {sortBy === 'name' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-nfl-light-gray/10 text-gray-400"
                      onClick={() => handleSort('position')}
                    >
                      Pos
                      {sortBy === 'position' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-nfl-light-gray/10 text-gray-400"
                      onClick={() => handleSort('team')}
                    >
                      Team
                      {sortBy === 'team' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-nfl-light-gray/10 text-right text-gray-400"
                      onClick={() => handleSort('projected_points')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-4 w-4" />
                        Proyección
                        {sortBy === 'projected_points' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-nfl-light-gray/10 text-right text-gray-400"
                      onClick={() => handleSort('points')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Pts Semana
                        {sortBy === 'points' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                      </div>
                    </TableHead>
                    <TableHead className="text-center text-gray-400">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPlayers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                        No players found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPlayers.map((player) => (
                      <TableRow
                        key={player.id}
                        className="border-nfl-light-gray/20 hover:bg-nfl-light-gray/10 transition-colors"
                      >
                        <TableCell>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={player.photo} alt={player.name} />
                            <AvatarFallback className="bg-nfl-blue text-white">
                              {player.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-white">{player.name}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPositionColor(player.position)}>
                            {player.position}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {player.nfl_team_logo && (
                              <img src={player.nfl_team_logo} alt={player.team} className="h-6 w-6 object-contain" />
                            )}
                            <span className="text-sm font-medium text-white">{player.team}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-bold text-white">
                            {player.projected_points?.toFixed(1) || '0.0'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-medium text-gray-300">
                            {player.points?.toFixed(1) || '0.0'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={() => handlePlayerClick(player.id)}
                            className="bg-nfl-accent hover:bg-nfl-accent/90 text-black"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="border-nfl-light-gray/20 text-gray-300"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="border-nfl-light-gray/20 text-gray-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm px-4 text-white">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="border-nfl-light-gray/20 text-gray-300"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="border-nfl-light-gray/20 text-gray-300"
                >
                  Last
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Add Player Dialog */}
      <Dialog open={showAddPlayerDialog} onOpenChange={setShowAddPlayerDialog}>
        <DialogContent className="bg-nfl-gray border-nfl-light-gray/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Agregar Jugador de Free Agency</DialogTitle>
            <DialogDescription className="text-gray-400">
              {userRoster.length < 10 ? (
                <>
                  El jugador se agregará a tu banca (BENCH). Roster actual: {userRoster.length}/10 jugadores
                  <br />
                  <span className="text-nfl-accent">✓ Tienes {10 - userRoster.length} espacio{10 - userRoster.length !== 1 ? 's' : ''} disponible{10 - userRoster.length !== 1 ? 's' : ''}</span>
                </>
              ) : (
                <>
                  Tu roster está lleno ({userRoster.length}/10). Debes liberar un jugador primero.
                  <br />
                  <span className="text-red-400">⚠️ Roster completo - selecciona un jugador para soltar</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {userRoster.length >= 10 && (
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Soltar Jugador (Requerido - roster lleno)
                </label>
                <Select value={selectedDropPlayer} onValueChange={setSelectedDropPlayer}>
                  <SelectTrigger className="bg-nfl-dark-gray border-nfl-light-gray/20 text-white">
                    <SelectValue placeholder="Selecciona un jugador para soltar" />
                  </SelectTrigger>
                  <SelectContent className="bg-nfl-dark-gray border-nfl-light-gray/20">
                    {userRoster.map((player) => (
                      <SelectItem key={player.id} value={player.id} className="text-white">
                        {player.name} ({player.position}) - {player.slot || 'BENCH'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {userRoster.length < 10 && (
              <div className="bg-nfl-dark-gray/50 border border-nfl-light-gray/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-nfl-accent/20 flex items-center justify-center">
                    <span className="text-nfl-accent text-lg">ℹ️</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium mb-1">Información sobre la Banca</h4>
                    <p className="text-sm text-gray-400">
                      El jugador se agregará a tu banca (BENCH) y no estará activo inicialmente.
                      Podrás activarlo desde la página de tu equipo más adelante.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAddPlayerDialog(false)}
                className="border-nfl-light-gray/20 text-gray-300 hover:bg-nfl-light-gray/10"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddPlayer}
                disabled={userRoster.length >= 10 && !selectedDropPlayer}
                className="bg-nfl-accent hover:bg-nfl-accent/90 text-black"
              >
                {userRoster.length >= 10 ? 'Intercambiar Jugadores' : 'Agregar a Banca'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
