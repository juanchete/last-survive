import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useLocation, useNavigate } from "react-router-dom";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { User, Save, AlertTriangle, CheckCircle, XCircle, Clock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player } from "@/types";
import { useQueryClient } from "@tanstack/react-query";

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
  slot?: string;
  is_active: boolean;
  photo?: string;
  status?: "healthy" | "questionable" | "doubtful" | "out";
  matchup?: string;
}

export default function Team() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "";
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: currentWeekData } = useCurrentWeek(leagueId);
  const currentWeek = currentWeekData?.number || 1;
  const { data: userTeam } = useUserFantasyTeam(leagueId);
  const { data: rosterData = [], isLoading } = useRosterWithPlayerDetails(
    userTeam?.id || "", 
    currentWeek
  );

  // State for lineup management
  const [lineup, setLineup] = useState<Record<string, RosterPlayer | null>>({});
  const [bench, setBench] = useState<RosterPlayer[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check if roster needs initialization for current week
  useEffect(() => {
    const checkAndInitializeRoster = async () => {
      if (userTeam?.id && currentWeek && rosterData.length === 0 && !isLoading) {
        // No roster data for current week, try to initialize
        try {
          const { data, error } = await supabase.rpc('admin_initialize_rosters', {
            p_league_id: leagueId,
            p_week: currentWeek
          });
          
          if (data?.success) {
            // Invalidate the query to refetch the newly created roster
            await queryClient.invalidateQueries({
              queryKey: ["rosterWithDetails", userTeam.id, currentWeek]
            });
            
            toast({
              title: "Roster Initialized",
              description: `Your roster has been set up for week ${currentWeek}`,
            });
          }
        } catch (error) {
          console.error("Error initializing roster:", error);
        }
      }
    };
    
    checkAndInitializeRoster();
  }, [userTeam?.id, currentWeek, rosterData.length, isLoading, leagueId, queryClient]);

  // Convert roster data to our format
  useEffect(() => {
    if (rosterData.length > 0) {
      const players: RosterPlayer[] = rosterData.map(item => ({
        id: item.id, // This is the roster entry ID
        player_id: item.player_id, // Use the actual player_id from the roster data
        name: item.name || "Unknown Player",
        position: item.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "DP",
        team: item.team || "FA",
        points: item.points || 0,
        slot: item.slot,
        is_active: item.is_active,
        photo: item.photo,
        status: "healthy" as const, // Mock status for now
        matchup: `vs ${["KC", "BUF", "SF", "DAL", "GB"][Math.floor(Math.random() * 5)]}`
      }));

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
  }, [rosterData]);


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
    const newLineup = { ...lineup };
    const newBench = [...bench];

    newLineup[slotKey] = null;
    newBench.push(player);

    setLineup(newLineup);
    setBench(newBench);
    setHasChanges(true);
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

        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Manage Your Roster</h2>
              <p className="text-gray-400 mt-1">
                Week {currentWeek} • Set your starting lineup
              </p>
            </div>
            {hasChanges && (
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
                      <p className="text-gray-400 mb-4">
                        No roster found for week {currentWeek}
                      </p>
                      <Button
                        onClick={async () => {
                          try {
                            const { data, error } = await supabase.rpc('admin_initialize_rosters', {
                              p_league_id: leagueId,
                              p_week: currentWeek
                            });
                            
                            if (data?.success) {
                              await queryClient.invalidateQueries({
                                queryKey: ["rosterWithDetails", userTeam?.id, currentWeek]
                              });
                              
                              toast({
                                title: "Roster Initialized",
                                description: `Your roster has been set up for week ${currentWeek}`,
                              });
                            } else {
                              toast({
                                title: "Initialization Failed",
                                description: data?.message || "Could not initialize roster",
                                variant: "destructive",
                              });
                            }
                          } catch (error) {
                            console.error("Error initializing roster:", error);
                            toast({
                              title: "Error",
                              description: "Failed to initialize roster",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="bg-nfl-blue hover:bg-nfl-blue/90"
                      >
                        Initialize Roster for Week {currentWeek}
                      </Button>
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
                            onRemove={() => player && moveToBench(player, slotKey)}
                            onDrop={(p) => moveToLineup(p, slotKey)}
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
          </div>
        </div>
      </div>
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
  positionColors 
}: {
  slotKey: string;
  label: string;
  position: string;
  player: RosterPlayer | null;
  onRemove: () => void;
  onDrop: (player: RosterPlayer) => void;
  positionColors: Record<string, string>;
}) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border-2 border-dashed transition-all",
        player 
          ? "bg-nfl-dark-gray border-nfl-light-gray/20" 
          : "bg-nfl-dark-gray/50 border-nfl-light-gray/10 hover:border-nfl-light-gray/30"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge className={cn(positionColors[position.split("/")[0]] || "bg-gray-600", "text-white")}>
            {position}
          </Badge>
          <span className="text-sm text-gray-400">{label}</span>
        </div>
        {player && (
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
            <div className="text-xl font-bold text-white">{player.points.toFixed(1)}</div>
            <div className="text-xs text-gray-400">PTS</div>
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
  positionColors 
}: {
  player: RosterPlayer;
  onSelect: (player: RosterPlayer) => void;
  positionColors: Record<string, string>;
}) {
  return (
    <div
      onClick={() => onSelect(player)}
      className="p-3 rounded-lg bg-nfl-dark-gray border border-nfl-light-gray/20 hover:border-nfl-blue/50 cursor-pointer transition-all"
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
          </div>
          <p className="text-xs text-gray-400">{player.team} • {player.matchup}</p>
        </div>
        <div className="text-right">
          <div className="font-bold text-white">{player.points.toFixed(1)}</div>
          <div className="text-xs text-gray-400">PTS</div>
        </div>
      </div>
    </div>
  );
}