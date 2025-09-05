import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, ChevronLeft, ChevronRight, TrendingUp, Heart, AlertCircle, Shield, Users } from "lucide-react";
import { useAvailablePlayersPaginated } from "@/hooks/useAvailablePlayersPaginated";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DraftPlayerListProps {
  leagueId: string;
  week: number;
  onSelectPlayer: (playerId: number) => void;
  isMyTurn: boolean;
  myRoster?: any[]; // Current roster to check slot limits
  slotCounts?: Record<string, number>; // Current count of each position
  slotLimits?: Record<string, number>; // Max allowed for each position
}

export function DraftPlayerList({ leagueId, week, onSelectPlayer, isMyTurn, myRoster = [], slotCounts = {}, slotLimits = {} }: DraftPlayerListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [position, setPosition] = useState("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'projected_points' | 'position' | 'team' | 'adp'>('adp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data, isLoading, error } = useAvailablePlayersPaginated({
    leagueId,
    week,
    position,
    searchTerm,
    page,
    pageSize: 25,
    sortBy,
    sortOrder
  });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Default slot limits if not provided
  const DEFAULT_SLOT_LIMITS = {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,    // RB/WR only
    K: 1,
    DEF: 1,
    DP: 1,      // Defensive Player
  };

  const finalSlotLimits = Object.keys(DEFAULT_SLOT_LIMITS).length > 0 && Object.keys(slotLimits).length === 0 
    ? DEFAULT_SLOT_LIMITS 
    : slotLimits;

  // Check if a position can be drafted
  const canDraftPosition = (position: string) => {
    // FLEX can be filled with RB or WR
    if (position === 'RB' || position === 'WR') {
      const rbCount = slotCounts['RB'] || 0;
      const wrCount = slotCounts['WR'] || 0;
      const flexCount = slotCounts['FLEX'] || 0;
      
      if (position === 'RB') {
        return rbCount < (finalSlotLimits['RB'] || 0) || flexCount < (finalSlotLimits['FLEX'] || 0);
      } else {
        return wrCount < (finalSlotLimits['WR'] || 0) || flexCount < (finalSlotLimits['FLEX'] || 0);
      }
    }
    
    // For other positions, check direct slot limit
    const currentCount = slotCounts[position] || 0;
    const maxAllowed = finalSlotLimits[position] || 0;
    return currentCount < maxAllowed;
  };

  // Check if player was drafted by current user
  const isDraftedByMe = (playerId: number) => {
    return myRoster.some(r => r.player_id === playerId);
  };

  // Get reason why player can't be drafted
  const getDraftDisabledReason = (player: any) => {
    if (!player.available) {
      // Check if drafted by current user
      if (isDraftedByMe(player.id)) {
        return "Ya seleccionado por ti";
      }
      return "Ya seleccionado";
    }
    if (!isMyTurn) {
      return "No es tu turno";
    }
    if (!canDraftPosition(player.position)) {
      const limit = finalSlotLimits[player.position] || 0;
      const current = slotCounts[player.position] || 0;
      return `Límite alcanzado (${current}/${limit})`;
    }
    return null;
  };

  const handleDraft = (playerId: number, playerName: string, position: string) => {
    if (!isMyTurn) {
      toast.error("No es tu turno para seleccionar");
      return;
    }
    if (!canDraftPosition(position)) {
      toast.error(`Ya tienes el límite de jugadores en posición ${position}`);
      return;
    }
    onSelectPlayer(playerId);
    toast.success(`Seleccionaste a ${playerName}`);
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Healthy':
        return <Heart className="h-4 w-4 text-green-500" />;
      case 'Questionable':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'Injured':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-500">Error al cargar jugadores: {error.message}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar jugador por nombre o universidad..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select value={position} onValueChange={(val) => { setPosition(val); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas las posiciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las posiciones</SelectItem>
              <SelectItem value="QB">QB - Quarterback</SelectItem>
              <SelectItem value="RB">RB - Running Back</SelectItem>
              <SelectItem value="WR">WR - Wide Receiver</SelectItem>
              <SelectItem value="TE">TE - Tight End</SelectItem>
              <SelectItem value="K">K - Kicker</SelectItem>
              <SelectItem value="DEF">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  DEF - Defensa
                </div>
              </SelectItem>
              <SelectItem value="DP">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  DP - Jugador Defensivo
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {data ? `${data.totalCount} jugadores disponibles` : 'Cargando...'}
          </p>
          {data && data.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Página {page} de {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                disabled={page === data.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Players Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('name')}
              >
                Jugador
                {sortBy === 'name' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('position')}
              >
                Pos
                {sortBy === 'position' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('team')}
              >
                Equipo
                {sortBy === 'team' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort('adp')}
              >
                <div className="flex items-center justify-end gap-1">
                  ADP
                  {sortBy === 'adp' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort('projected_points')}
              >
                <div className="flex items-center justify-end gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Proyección
                  {sortBy === 'projected_points' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </div>
              </TableHead>
              <TableHead className="text-right">2024</TableHead>
              <TableHead className="text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Cargando jugadores...
                </TableCell>
              </TableRow>
            ) : data?.players.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  No se encontraron jugadores disponibles
                </TableCell>
              </TableRow>
            ) : (
              data?.players.map((player) => {
                const draftedByMe = isDraftedByMe(player.id);
                return (
                <TableRow 
                  key={player.id}
                  className={cn(
                    "hover:bg-muted/50 transition-colors",
                    !player.available && "opacity-50",
                    draftedByMe && "bg-green-500/10"
                  )}
                >
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={player.photo} alt={player.name} />
                      <AvatarFallback>{player.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{player.name}</p>
                        {!player.available && (
                          <Badge 
                            variant={draftedByMe ? "default" : "secondary"} 
                            className={cn(
                              "text-xs",
                              draftedByMe && "bg-green-500 hover:bg-green-600"
                            )}
                          >
                            {draftedByMe ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Tu equipo
                              </div>
                            ) : (
                              "Drafteado"
                            )}
                          </Badge>
                        )}
                      </div>
                      {player.college && (
                        <p className="text-xs text-muted-foreground">{player.college}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getPositionColor(player.position)}>
                      {player.position}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {player.teamLogo && (
                        <img src={player.teamLogo} alt={player.team} className="h-6 w-6" />
                      )}
                      <span className="text-sm font-medium">{player.team}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-medium">
                      {player.adp ? player.adp.toFixed(0) : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm">
                      <p className="font-bold">{player.projectedPoints.toFixed(1)}</p>
                      {player.position === 'QB' && player.projectedPassingYards > 0 && (
                        <p className="text-xs text-muted-foreground">{player.projectedPassingYards} yds</p>
                      )}
                      {player.position === 'RB' && player.projectedRushingYards > 0 && (
                        <p className="text-xs text-muted-foreground">{player.projectedRushingYards} yds</p>
                      )}
                      {player.position === 'WR' && player.projectedReceivingYards > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {player.projectedReceptions.toFixed(1)} rec, {player.projectedReceivingYards} yds
                        </p>
                      )}
                      {player.position === 'TE' && player.projectedReceivingYards > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {player.projectedReceptions.toFixed(1)} rec
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className="text-sm text-muted-foreground">{player.lastSeasonPoints.toFixed(1)}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant={player.available && canDraftPosition(player.position) ? "default" : "outline"}
                      disabled={!player.available || !isMyTurn || !canDraftPosition(player.position)}
                      onClick={() => handleDraft(player.id, player.name, player.position)}
                      title={getDraftDisabledReason(player) || undefined}
                    >
                      {getDraftDisabledReason(player) || 'Seleccionar'}
                    </Button>
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(1)}
            disabled={page === 1}
          >
            Primera
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm px-4">
            Página {page} de {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(data.totalPages, page + 1))}
            disabled={page === data.totalPages}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(data.totalPages)}
            disabled={page === data.totalPages}
          >
            Última
          </Button>
        </div>
      )}
    </Card>
  );
}