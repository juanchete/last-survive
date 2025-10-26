import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useLocation, useNavigate } from "react-router-dom";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { useAuth } from "@/hooks/useAuth";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { User, Save, AlertTriangle, CheckCircle, XCircle, Clock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player } from "@/types";
import { useQueryClient, useQuery } from "@tanstack/react-query";

// Define lineup positions and requirements
const LINEUP_SLOTS = [
  { position: "QB", label: "Quarterback", count: 1 },
  { position: "RB", label: "Running Back", count: 2 },
  { position: "WR", label: "Wide Receiver", count: 2 },
  { position: "TE", label: "Tight End", count: 1 },
  { position: "FLEX", label: "RB/WR", count: 1 },
  { position: "K", label: "Kicker", count: 1 },
  { position: "DEF", label: "Defense", count: 1 },
  { position: "DP", label: "Defensive Player", count: 1 },
];

interface RosterPlayer {
  id: string;
  player_id: number;
  name: string;
  position: "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "DP";
  team: string;
  points: number;
  projected_points?: number;
  slot?: string;
  is_active: boolean;
  photo?: string;
  status?: string;
  matchup?: string;
}

export default function Team() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "";
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isEliminated, canMakeChanges, readOnlyMessage } = useTeamAccess(leagueId);
  
  const { data: currentWeekData } = useCurrentWeek(leagueId);
  const currentWeek = currentWeekData?.number || 1;
  const { data: userTeam } = useUserFantasyTeam(leagueId);
  const { data: rosterData = [], isLoading } = useRosterWithPlayerDetails(
    userTeam?.id || "", 
    currentWeek
  );
  
  // Get player projections and health status
  const { data: playerStats } = useQuery({
    queryKey: ["playerStats", rosterData.map(p => p.player_id), currentWeek],
    queryFn: async () => {
      if (rosterData.length === 0) return [];
      
      const playerIds = rosterData.map(p => p.player_id);
      
      // Get projections for this week
      const { data: stats, error: statsError } = await supabase
        .from("player_stats")
        .select("player_id, projected_points")
        .in("player_id", playerIds)
        .eq("week", currentWeek)
        .eq("season", new Date().getFullYear());
      
      // Get player health status
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, status")
        .in("id", playerIds);
      
      if (statsError || playersError) return [];
      
      // Combine the data
      const statsMap = new Map(stats?.map(s => [s.player_id, s.projected_points]) || []);
      const statusMap = new Map(players?.map(p => [p.id, p.status]) || []);
      
      return playerIds.map(id => ({
        player_id: id,
        projected_points: statsMap.get(id) || 0,
        status: statusMap.get(id) || 'Unknown'
      }));
    },
    enabled: rosterData.length > 0 && !!currentWeek,
  });

  // State for lineup management
  const [lineup, setLineup] = useState<Record<string, RosterPlayer | null>>({});
  const [bench, setBench] = useState<RosterPlayer[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState<RosterPlayer | null>(null);
  const [showSlotDialog, setShowSlotDialog] = useState(false);

  // Convert roster data to our format
  useEffect(() => {
    if (rosterData.length > 0) {
      const players: RosterPlayer[] = rosterData.map(item => {
        const playerStat = playerStats?.find(s => s.player_id === item.player_id);
        
        return {
          id: item.id, // This is the roster entry ID
          player_id: item.player_id, // Use the actual player_id from the roster data
          name: item.name || "Unknown Player",
          position: item.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "DP",
          team: item.team || "FA",
          points: item.points || 0,
          projected_points: playerStat?.projected_points || 0,
          slot: item.slot,
          is_active: item.is_active,
          photo: item.photo,
          status: playerStat?.status || "Unknown",
          matchup: `vs ${["KC", "BUF", "SF", "DAL", "GB"][Math.floor(Math.random() * 5)]}`
        };
      });

      // Initialize lineup slots
      const newLineup: Record<string, RosterPlayer | null> = {};
      const benchPlayers: RosterPlayer[] = [];

      // Create slot keys for each position
      LINEUP_SLOTS.forEach(slot => {
        for (let i = 0; i < slot.count; i++) {
          const key = slot.count > 1 ? `${slot.position}_${i + 1}` : slot.position;
          newLineup[key] = null;
        }
      });

      // Assign players to lineup based on their current slot
      players.forEach(player => {
        if (player.is_active && player.slot && player.slot !== "BENCH") {
          // Find the first available slot for this position
          let assigned = false;
          
          // Check exact position slots first
          for (const [key, value] of Object.entries(newLineup)) {
            if (!value && key.startsWith(player.slot) && canPlaceInSlot(player, key)) {
              newLineup[key] = player;
              assigned = true;
              break;
            }
          }
          
          // If not assigned and it's a FLEX-eligible player, try FLEX slot
          if (!assigned && ["RB", "WR"].includes(player.position) && !newLineup["FLEX"]) {
            newLineup["FLEX"] = player;
            assigned = true;
          }
          
          // If still not assigned, add to bench
          if (!assigned) {
            benchPlayers.push(player);
          }
        } else {
          benchPlayers.push(player);
        }
      });

      setLineup(newLineup);
      setBench(benchPlayers);
    }
  }, [rosterData, playerStats]);


  // Check if a player can be placed in a slot
  const canPlaceInSlot = (player: RosterPlayer, slotKey: string): boolean => {
    const slotPosition = slotKey.split("_")[0];
    
    if (slotPosition === "FLEX") {
      return ["RB", "WR"].includes(player.position); // Only RB/WR for FLEX
    }
    
    return player.position === slotPosition;
  };

  // Move player to lineup slot
  const moveToLineup = (player: RosterPlayer, slotKey: string) => {
    if (!canMakeChanges) {
      toast({
        title: "Unable to Move Player",
        description: readOnlyMessage || "You cannot make changes to your roster.",
        variant: "destructive",
      });
      return;
    }
    
    if (!canPlaceInSlot(player, slotKey)) {
      toast({
        title: "Invalid Position",
        description: `${player.name} cannot play in the ${slotKey} position`,
        variant: "destructive",
      });
      return;
    }

    const currentPlayer = lineup[slotKey];
    const newLineup = { ...lineup };
    const newBench = [...bench];

    // If there's already a player in this slot, move them to bench
    if (currentPlayer) {
      newBench.push(currentPlayer);
    }

    // Remove player from bench if they're there
    const benchIndex = newBench.findIndex(p => p.id === player.id);
    if (benchIndex > -1) {
      newBench.splice(benchIndex, 1);
    }

    // Remove player from other lineup slot if they're there
    Object.keys(newLineup).forEach(key => {
      if (newLineup[key]?.id === player.id) {
        newLineup[key] = null;
      }
    });

    // Place player in new slot
    newLineup[slotKey] = player;

    setLineup(newLineup);
    setBench(newBench);
    setHasChanges(true);
  };

  // Move player to bench
  const moveToBench = (player: RosterPlayer, slotKey: string) => {
    if (!canMakeChanges) {
      toast({
        title: "Unable to Move Player",
        description: readOnlyMessage || "You cannot make changes to your roster.",
        variant: "destructive",
      });
      return;
    }

    const newLineup = { ...lineup };
    const newBench = [...bench];

    newLineup[slotKey] = null;
    newBench.push(player);

    setLineup(newLineup);
    setBench(newBench);
    setHasChanges(true);
  };

  // Handle bench player selection
  const handleBenchPlayerClick = (player: RosterPlayer) => {
    if (!canMakeChanges) {
      toast({
        title: "No puedes hacer cambios",
        description: readOnlyMessage || "No puedes modificar tu roster en este momento.",
        variant: "destructive",
      });
      return;
    }
    setSelectedBenchPlayer(player);
    setShowSlotDialog(true);
  };

  // Move bench player to specific slot
  const moveBenchPlayerToSlot = (slotKey: string) => {
    if (!selectedBenchPlayer) return;

    moveToLineup(selectedBenchPlayer, slotKey);
    setShowSlotDialog(false);
    setSelectedBenchPlayer(null);
  };

  // Save lineup changes
  const saveLineup = async () => {
    if (!userTeam || !currentWeek) {
      toast({
        title: "Error",
        description: "Unable to save: Team or week information is missing",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Prepare all updates
      const updates = [];
      const failedUpdates = [];

      // Update lineup players
      for (const [slotKey, player] of Object.entries(lineup)) {
        if (player) {
          const slot = slotKey.split("_")[0]; // Remove number suffix (e.g., "QB_1" -> "QB")
          updates.push({
            type: 'lineup',
            player,
            slotKey,
            promise: supabase
              .from("team_rosters")
              .update({ 
                slot: slot,
                is_active: true 
              })
              .eq("fantasy_team_id", userTeam.id)
              .eq("player_id", player.player_id)
              .eq("week", currentWeek)
          });
        }
      }

      // Update bench players
      for (const player of bench) {
        updates.push({
          type: 'bench',
          player,
          promise: supabase
            .from("team_rosters")
            .update({ 
              slot: "BENCH",
              is_active: false 
            })
            .eq("fantasy_team_id", userTeam.id)
            .eq("player_id", player.player_id)
            .eq("week", currentWeek)
        });
      }

      // Execute all updates and check results
      const results = await Promise.allSettled(updates.map(u => u.promise));
      
      // Check each result
      results.forEach((result, index) => {
        const update = updates[index];
        if (result.status === 'rejected') {
          failedUpdates.push({
            player: update.player,
            error: result.reason
          });
        } else if (result.value.error) {
          failedUpdates.push({
            player: update.player,
            error: result.value.error
          });
        } else if (result.value.count === 0) {
          // No rows were updated - this player might not exist in the roster
          failedUpdates.push({
            player: update.player,
            error: { message: `Player ${update.player.name} not found in roster for week ${currentWeek}` }
          });
        }
      });

      if (failedUpdates.length > 0) {
        console.error("Failed updates:", failedUpdates);
        toast({
          title: "Partial Save",
          description: `Some players could not be updated: ${failedUpdates.map(f => f.player.name).join(", ")}`,
          variant: "destructive",
        });
      } else {
        // All updates successful
        toast({
          title: "Lineup Saved",
          description: "Your lineup has been saved successfully",
        });
        setHasChanges(false);
      }

      // Always invalidate the roster query to refetch fresh data
      await queryClient.invalidateQueries({ 
        queryKey: ["rosterWithDetails", userTeam.id, currentWeek] 
      });
      
    } catch (error) {
      console.error("Error saving lineup:", error);
      toast({
        title: "Error",
        description: "Failed to save lineup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Position colors
  const positionColors = {
    QB: "bg-nfl-blue",
    RB: "bg-nfl-green",
    WR: "bg-nfl-yellow",
    TE: "bg-nfl-accent",
    K: "bg-nfl-lightblue",
    DEF: "bg-nfl-red",
    DP: "bg-purple-600"
  };

  if (!leagueId) {
    navigate("/dashboard");
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-nfl-dark-gray">
        <LeagueHeader leagueId={leagueId} />
        <LeagueTabs leagueId={leagueId} activeTab="team" />

        {/* Eliminated Team Warning */}
        {isEliminated && (
          <div className="container mx-auto px-4 pt-4">
            <Alert className="bg-red-500/20 border-red-500/30 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="font-medium">
                {readOnlyMessage}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Manage Your Roster</h2>
              <p className="text-gray-400 mt-1">
                Week {currentWeek} • Set your starting lineup
              </p>
            </div>
            {hasChanges && canMakeChanges && (
              <Button
                onClick={saveLineup}
                disabled={isSaving}
                className="bg-nfl-green hover:bg-nfl-green/90"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Lineup"}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Starting Lineup */}
            <div className="lg:col-span-2">
              <Card className="bg-nfl-gray border-nfl-light-gray/20">
                <CardHeader className="border-b border-nfl-light-gray/20">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Starting Lineup
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {rosterData.length === 0 && !isLoading ? (
                    <div className="text-center py-12">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                      <p className="text-gray-400 text-lg mb-2">
                        No roster found for week {currentWeek}
                      </p>
                      <p className="text-gray-500 text-sm">
                        Your roster will be automatically created when the league advances to this week.
                      </p>
                      {isEliminated && (
                        <p className="text-red-400 text-sm mt-2">
                          Team has been eliminated
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                    {LINEUP_SLOTS.map(slot => {
                      const slots = [];
                      for (let i = 0; i < slot.count; i++) {
                        const slotKey = slot.count > 1 ? `${slot.position}_${i + 1}` : slot.position;
                        const player = lineup[slotKey];

                        slots.push(
                          <LineupSlot
                            key={slotKey}
                            slotKey={slotKey}
                            label={slot.label}
                            position={slot.position}
                            player={player}
                            onRemove={canMakeChanges ? () => player && moveToBench(player, slotKey) : undefined}
                            onDrop={canMakeChanges ? (p) => moveToLineup(p, slotKey) : undefined}
                            disabled={!canMakeChanges}
                            positionColors={positionColors}
                          />
                        );
                      }
                      return slots;
                    })}
                  </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bench Section */}
            <div className="lg:col-span-2">
              <Card className="bg-nfl-gray border-nfl-light-gray/20">
                <CardHeader className="border-b border-nfl-light-gray/20">
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Banca ({bench.length} jugadores)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {bench.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-10 h-10 mx-auto mb-3 text-gray-500" />
                      <p className="text-gray-400">No hay jugadores en la banca</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Agrega jugadores desde Free Agency o mueve jugadores aquí desde el lineup
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bench.map(player => (
                        <BenchPlayer
                          key={player.id}
                          player={player}
                          onSelect={canMakeChanges ? handleBenchPlayerClick : undefined}
                          positionColors={positionColors}
                          disabled={!canMakeChanges}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Slot Selection Dialog */}
      <Dialog open={showSlotDialog} onOpenChange={setShowSlotDialog}>
        <DialogContent className="bg-nfl-gray border-nfl-light-gray/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Selecciona un Slot</DialogTitle>
            <DialogDescription className="text-gray-400">
              ¿En qué posición quieres colocar a {selectedBenchPlayer?.name}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {selectedBenchPlayer && LINEUP_SLOTS.map(slot => {
              // Check if this player can play in this position
              const canPlay = canPlaceInSlot(selectedBenchPlayer, slot.position);
              if (!canPlay) return null;

              // Get all slots for this position
              const slotsForPosition = [];
              for (let i = 0; i < slot.count; i++) {
                const slotKey = slot.count > 1 ? `${slot.position}_${i + 1}` : slot.position;
                const currentPlayer = lineup[slotKey];

                slotsForPosition.push(
                  <Button
                    key={slotKey}
                    onClick={() => moveBenchPlayerToSlot(slotKey)}
                    variant="outline"
                    className="w-full justify-between border-nfl-light-gray/20 text-white hover:bg-nfl-light-gray/10"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className={cn(positionColors[slot.position], "text-white")}>
                        {slot.position}
                      </Badge>
                      <span>{slot.label} {slot.count > 1 ? `#${i + 1}` : ''}</span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {currentPlayer ? `Reemplazar a ${currentPlayer.name}` : 'Vacío'}
                    </span>
                  </Button>
                );
              }

              return slotsForPosition;
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowSlotDialog(false);
                setSelectedBenchPlayer(null);
              }}
              className="border-nfl-light-gray/20 text-gray-300 hover:bg-nfl-light-gray/10"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

// Lineup Slot Component
function LineupSlot({ 
  slotKey, 
  label, 
  position,
  player, 
  onRemove, 
  onDrop,
  positionColors,
  disabled = false
}: {
  slotKey: string;
  label: string;
  position: string;
  player: RosterPlayer | null;
  onRemove?: () => void;
  onDrop?: (player: RosterPlayer) => void;
  positionColors: Record<string, string>;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border-2 border-dashed transition-all",
        player 
          ? "bg-nfl-dark-gray border-nfl-light-gray/20" 
          : "bg-nfl-dark-gray/50 border-nfl-light-gray/10 hover:border-nfl-light-gray/30",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge className={cn(positionColors[position.split("/")[0]] || "bg-gray-600", "text-white")}>
            {position}
          </Badge>
          <span className="text-sm text-gray-400">{label}</span>
        </div>
        {player && onRemove && !disabled && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="text-red-400 hover:text-red-300"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        )}
      </div>

      {player ? (
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-nfl-light-gray/20">
            <AvatarImage src={player.photo} alt={player.name} />
            <AvatarFallback className="bg-nfl-dark-gray">
              <User className="h-6 w-6 text-gray-400" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h4 className="font-semibold text-white">{player.name}</h4>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{player.team}</span>
              <span>•</span>
              <span>{player.matchup}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex flex-col">
              <div className="text-xl font-bold text-white">{player.points.toFixed(1)}</div>
              <div className="text-xs text-gray-400">Proj: {player.projected_points?.toFixed(1) || '0.0'}</div>
            </div>
            {player.status && (
              <Badge 
                variant="outline" 
                className={`text-xs mt-1 ${
                  player.status === 'Active' || player.status === 'Healthy' ? 'border-green-500/50 text-green-500' :
                  player.status === 'Questionable' ? 'border-yellow-500/50 text-yellow-500' :
                  player.status === 'Doubtful' ? 'border-orange-500/50 text-orange-500' :
                  player.status === 'Out' || player.status === 'Injured Reserve' ? 'border-red-500/50 text-red-500' :
                  'border-gray-500/50 text-gray-400'
                }`}
              >
                {player.status === 'Active' || player.status === 'Healthy' ? 'Healthy' :
                 player.status === 'Questionable' ? 'Q' :
                 player.status === 'Doubtful' ? 'D' :
                 player.status === 'Out' ? 'O' :
                 player.status === 'Injured Reserve' ? 'IR' :
                 player.status === 'Unknown' ? 'Unknown' :
                 player.status.substring(0, 3)}
              </Badge>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Empty Slot</p>
        </div>
      )}
    </div>
  );
}

// Bench Player Component
function BenchPlayer({ 
  player, 
  onSelect,
  positionColors,
  disabled = false
}: {
  player: RosterPlayer;
  onSelect?: (player: RosterPlayer) => void;
  positionColors: Record<string, string>;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={!disabled && onSelect ? () => onSelect(player) : undefined}
      className={cn(
        "p-3 rounded-lg bg-nfl-dark-gray border border-nfl-light-gray/20 transition-all",
        !disabled && onSelect && "hover:border-nfl-blue/50 cursor-pointer",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-nfl-light-gray/20">
          <AvatarImage src={player.photo} alt={player.name} />
          <AvatarFallback className="bg-nfl-dark-gray text-xs">
            <User className="h-5 w-5 text-gray-400" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white text-sm truncate">{player.name}</h4>
            <Badge className={cn(positionColors[player.position], "text-white text-xs")}>
              {player.position}
            </Badge>
            {player.status && (
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  player.status === 'Active' || player.status === 'Healthy' ? 'border-green-500/50 text-green-500' :
                  player.status === 'Questionable' ? 'border-yellow-500/50 text-yellow-500' :
                  player.status === 'Doubtful' ? 'border-orange-500/50 text-orange-500' :
                  player.status === 'Out' || player.status === 'Injured Reserve' ? 'border-red-500/50 text-red-500' :
                  'border-gray-500/50 text-gray-400'
                }`}
              >
                {player.status === 'Active' || player.status === 'Healthy' ? 'Healthy' :
                 player.status === 'Questionable' ? 'Q' :
                 player.status === 'Doubtful' ? 'D' :
                 player.status === 'Out' ? 'O' :
                 player.status === 'Injured Reserve' ? 'IR' :
                 player.status === 'Unknown' ? 'Unknown' :
                 player.status.substring(0, 3)}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-400">{player.team} • {player.matchup}</p>
        </div>
        <div className="text-right">
          <div className="flex flex-col">
            <div className="font-bold text-white">{player.points.toFixed(1)}</div>
            <div className="text-xs text-gray-400">Proj: {player.projected_points?.toFixed(1) || '0.0'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}