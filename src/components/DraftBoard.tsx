import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DraftPlayerCard } from "@/components/DraftPlayerCard";
import { Search, Filter, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player } from "@/types";

interface DraftBoardProps {
  players: Player[];
  onDraft: (playerId: number, slot: string) => Promise<void>;
  isMyTurn: boolean;
  loadingPick: boolean;
  draftState: any;
  getAvailableSlot: (player: Player) => string | null;
  getSlotFeedback: (player: Player) => string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  positionFilter: string;
  setPositionFilter: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
}

export function DraftBoard({
  players,
  onDraft,
  isMyTurn,
  loadingPick,
  draftState,
  getAvailableSlot,
  getSlotFeedback,
  searchTerm,
  setSearchTerm,
  positionFilter,
  setPositionFilter,
  sortBy,
  setSortBy
}: DraftBoardProps) {
  // Get top available player
  const topPlayer = players[0];

  return (
    <div className="space-y-6">
      {/* Featured Player Card */}
      {topPlayer && isMyTurn && draftState?.draft_status === 'in_progress' && (
        <Card className="bg-gradient-to-r from-nfl-blue/20 to-nfl-lightblue/20 border-nfl-blue">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-nfl-blue" />
              Best Available Player
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-nfl-dark-gray flex items-center justify-center text-2xl font-bold">
                  {topPlayer.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{topPlayer.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={cn(
                      "text-white",
                      topPlayer.position === "QB" && "bg-nfl-blue",
                      topPlayer.position === "RB" && "bg-nfl-green",
                      topPlayer.position === "WR" && "bg-nfl-yellow",
                      topPlayer.position === "TE" && "bg-nfl-accent",
                      topPlayer.position === "K" && "bg-nfl-lightblue",
                      topPlayer.position === "DEF" && "bg-nfl-red",
                      topPlayer.position === "DP" && "bg-purple-600"
                    )}>
                      {topPlayer.position}
                    </Badge>
                    <span className="text-gray-400">{topPlayer.team}</span>
                    <span className="text-nfl-blue font-bold">{topPlayer.points} PPJ</span>
                  </div>
                </div>
              </div>
              {(() => {
                const slot = getAvailableSlot(topPlayer);
                const canDraft = isMyTurn && !loadingPick && !!slot;
                return canDraft ? (
                  <Button
                    size="lg"
                    className="bg-nfl-blue hover:bg-nfl-lightblue"
                    onClick={() => onDraft(Number(topPlayer.id), slot)}
                    disabled={loadingPick}
                  >
                    Draft to {slot}
                  </Button>
                ) : (
                  <div className="text-sm text-red-400">
                    {getSlotFeedback(topPlayer)}
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="bg-nfl-gray border-nfl-light-gray/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-nfl-blue" />
            Player Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="text-sm text-gray-400 mb-1 block">
                Search Players
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by name or team..."
                  className="pl-10 bg-nfl-dark-gray border-nfl-light-gray/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="position" className="text-sm text-gray-400 mb-1 block">
                Position
              </label>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger id="position" className="bg-nfl-dark-gray border-nfl-light-gray/20">
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="QB">Quarterback (QB)</SelectItem>
                  <SelectItem value="RB">Running Back (RB)</SelectItem>
                  <SelectItem value="WR">Wide Receiver (WR)</SelectItem>
                  <SelectItem value="TE">Tight End (TE)</SelectItem>
                  <SelectItem value="K">Kicker (K)</SelectItem>
                  <SelectItem value="DEF">Defense (DEF)</SelectItem>
                  <SelectItem value="DP">Defensive Player (DP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="sort" className="text-sm text-gray-400 mb-1 block">
                Sort By
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort" className="bg-nfl-dark-gray border-nfl-light-gray/20">
                  <SelectValue placeholder="Points (High to Low)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">PPJ (High to Low)</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="position">Position</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Players Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-nfl-blue" />
            Available Players
          </h2>
          <Badge variant="outline" className="bg-transparent border-nfl-light-gray/20">
            {players.length} Players
          </Badge>
        </div>
        
        {players.length > 0 ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {players.map(player => {
              const slot = getAvailableSlot(player);
              const canDraft = isMyTurn && 
                              !loadingPick && 
                              !!slot && 
                              draftState?.draft_status === 'in_progress';
              const feedback = !canDraft ? getSlotFeedback(player) : null;
              
              let disabledReason = feedback;
              if (draftState?.draft_status === 'pending') {
                disabledReason = "Draft pausado por el administrador";
              } else if (draftState?.draft_status === 'completed') {
                disabledReason = "Draft finalizado";
              } else if (!isMyTurn) {
                disabledReason = "No es tu turno";
              }
              
              // Add mock status and matchup
              const enhancedPlayer = {
                ...player,
                status: "healthy" as const,
                matchup: `vs ${["KC", "BUF", "SF", "DAL", "GB"][Math.floor(Math.random() * 5)]}`
              };
              
              return (
                <DraftPlayerCard
                  key={player.id}
                  player={enhancedPlayer}
                  onDraft={canDraft ? (playerId) => onDraft(Number(playerId), slot!) : undefined}
                  canDraft={canDraft}
                  slot={slot || undefined}
                  disabled={!canDraft}
                  disabledReason={disabledReason || undefined}
                />
              );
            })}
          </div>
        ) : (
          <Card className="bg-nfl-gray border-nfl-light-gray/20 p-8 text-center">
            <div className="text-gray-400 mb-2">No players match your search</div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setPositionFilter('all');
              }}
            >
              Reset Filters
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}