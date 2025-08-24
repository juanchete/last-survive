import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { useLocation } from "react-router-dom";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Users, Check, X, Clock, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RosterPlayer {
  player_id: number;
  player_name: string;
  position: string;
  slot?: string;
  fantasy_points: number;
  team_abbreviation: string;
  overall_rating: number;
}

export default function Trades() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "";
  
  const { data: userTeam } = useUserFantasyTeam(leagueId);
  const { data: teams = [] } = useFantasyTeams(leagueId);
  
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedMyPlayers, setSelectedMyPlayers] = useState<number[]>([]);
  const [selectedTheirPlayers, setSelectedTheirPlayers] = useState<number[]>([]);

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

  // Get user team roster using the safe hook
  const { data: myRosterData = [], isLoading: loadingMyRoster } = useRosterWithPlayerDetails(
    userTeam?.id || "",
    currentWeek?.number || 1
  );
  
  // Define the slot order for consistent display
  const slotOrder = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'DP'];
  
  // Transform the roster data to match the expected format
  const myRoster: RosterPlayer[] = myRosterData
    .map((player) => ({
      player_id: parseInt(player.id),
      player_name: player.name || "Unknown Player",
      position: player.position || "POS",
      slot: player.slot || player.position,
      fantasy_points: player.stats?.fantasy_points || player.points || 0,
      team_abbreviation: player.team || "FA",
      overall_rating: Math.floor(Math.random() * 20) + 80, // Mock OVR
    }))
    .sort((a, b) => {
      const aIndex = slotOrder.indexOf(a.slot || a.position);
      const bIndex = slotOrder.indexOf(b.slot || b.position);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return (a.slot || a.position).localeCompare(b.slot || b.position);
    });

  // Get selected team roster using the safe hook
  const { data: theirRosterData = [], isLoading: loadingTheirRoster } = useRosterWithPlayerDetails(
    selectedTeamId || "",
    currentWeek?.number || 1
  );
  
  // Transform the roster data to match the expected format
  const theirRoster: RosterPlayer[] = theirRosterData
    .map((player) => ({
      player_id: parseInt(player.id),
      player_name: player.name || "Unknown Player",
      position: player.position || "POS",
      slot: player.slot || player.position,
      fantasy_points: player.stats?.fantasy_points || player.points || 0,
      team_abbreviation: player.team || "FA",
      overall_rating: Math.floor(Math.random() * 20) + 80, // Mock OVR
    }))
    .sort((a, b) => {
      const aIndex = slotOrder.indexOf(a.slot || a.position);
      const bIndex = slotOrder.indexOf(b.slot || b.position);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return (a.slot || a.position).localeCompare(b.slot || b.position);
    });

  const togglePlayerSelection = (playerId: number, isMyTeam: boolean) => {
    if (isMyTeam) {
      setSelectedMyPlayers(prev => 
        prev.includes(playerId) 
          ? prev.filter(id => id !== playerId)
          : [...prev, playerId].slice(0, 3) // Max 3 players
      );
    } else {
      setSelectedTheirPlayers(prev => 
        prev.includes(playerId) 
          ? prev.filter(id => id !== playerId)
          : [...prev, playerId].slice(0, 3) // Max 3 players
      );
    }
  };

  const queryClient = useQueryClient();

  const proposeTrade = async () => {
    if (selectedMyPlayers.length === 0 || selectedTheirPlayers.length === 0) {
      toast({
        title: "Invalid Trade",
        description: "You must select at least one player from each team",
        variant: "destructive",
      });
      return;
    }

    if (!userTeam?.id || !selectedTeamId) {
      toast({
        title: "Error",
        description: "Team information is missing",
        variant: "destructive",
      });
      return;
    }

    // Position validation: trades must be between compatible positions
    // Helper function to check if positions are compatible
    const arePositionsCompatible = (mySlot: string, theirSlot: string, myPos: string, theirPos: string) => {
      // Direct position match
      if (myPos === theirPos) return true;
      
      // FLEX can be traded for RB or WR
      if (mySlot === 'FLEX' && (theirPos === 'RB' || theirPos === 'WR')) return true;
      if (theirSlot === 'FLEX' && (myPos === 'RB' || myPos === 'WR')) return true;
      
      // Both FLEX positions can be traded
      if (mySlot === 'FLEX' && theirSlot === 'FLEX') return true;
      
      return false;
    };

    // Get positions/slots of my players
    const myPlayerInfo = selectedMyPlayers.map(playerId => {
      const player = myRoster.find(p => p.player_id === playerId);
      return {
        position: player?.position || '',
        slot: player?.slot || player?.position || ''
      };
    });

    // Get positions/slots of their players
    const theirPlayerInfo = selectedTheirPlayers.map(playerId => {
      const player = theirRoster.find(p => p.player_id === playerId);
      return {
        position: player?.position || '',
        slot: player?.slot || player?.position || ''
      };
    });

    // Check if we have same number of players
    if (selectedMyPlayers.length !== selectedTheirPlayers.length) {
      toast({
        title: "Position Mismatch",
        description: `Trades must involve the same number of players. You selected ${selectedMyPlayers.length}, they selected ${selectedTheirPlayers.length}`,
        variant: "destructive",
      });
      return;
    }

    // For single player trades, check compatibility
    if (selectedMyPlayers.length === 1 && selectedTheirPlayers.length === 1) {
      const myInfo = myPlayerInfo[0];
      const theirInfo = theirPlayerInfo[0];
      
      if (!arePositionsCompatible(myInfo.slot, theirInfo.slot, myInfo.position, theirInfo.position)) {
        const myPlayer = myRoster.find(p => p.player_id === selectedMyPlayers[0]);
        const theirPlayer = theirRoster.find(p => p.player_id === selectedTheirPlayers[0]);
        
        // Provide specific message for FLEX
        if (myInfo.slot === 'FLEX' || theirInfo.slot === 'FLEX') {
          toast({
            title: "Position Mismatch",
            description: `Cannot trade ${myPlayer?.player_name} (${myInfo.slot === 'FLEX' ? 'FLEX' : myInfo.position}) for ${theirPlayer?.player_name} (${theirInfo.slot === 'FLEX' ? 'FLEX' : theirInfo.position}). FLEX can only be traded for RB, WR, or another FLEX.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Position Mismatch",
            description: `Cannot trade ${myPlayer?.player_name} (${myInfo.position}) for ${theirPlayer?.player_name} (${theirInfo.position}). Players must be of compatible positions.`,
            variant: "destructive",
          });
        }
        return;
      }
    } else {
      // For multiple players, we need more complex matching
      // Sort positions to check if they match
      const myPositions = myPlayerInfo.map(p => p.position).sort();
      const theirPositions = theirPlayerInfo.map(p => p.position).sort();
      
      // Simple check for multiple players (can be enhanced)
      const positionsMatch = myPositions.every((pos, index) => {
        const mySlot = myPlayerInfo.find(p => p.position === pos)?.slot || pos;
        const theirPos = theirPositions[index];
        const theirSlot = theirPlayerInfo.find(p => p.position === theirPos)?.slot || theirPos;
        return arePositionsCompatible(mySlot, theirSlot, pos, theirPos);
      });

      if (!positionsMatch) {
        toast({
          title: "Position Mismatch",
          description: `Position requirements don't match. You're offering: ${myPositions.join(', ')}, They're offering: ${theirPositions.join(', ')}`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      // First validate the trade proposal
      const { data: validationResult, error: validationError } = await supabase
        .rpc("validate_trade_proposal", {
          current_week: currentWeek?.number || 1,
          league_id: leagueId,
          proposer_team_id: userTeam.id,
          target_team_id: selectedTeamId,
          proposer_player_ids: selectedMyPlayers,
          target_player_ids: selectedTheirPlayers,
        });

      if (validationError) {
        throw validationError;
      }

      if (!validationResult?.valid) {
        toast({
          title: "Invalid Trade",
          description: validationResult?.message || "This trade cannot be completed",
          variant: "destructive",
        });
        return;
      }

      // Create the trade record
      const { data: trade, error: tradeError } = await supabase
        .from("trades")
        .insert({
          league_id: leagueId,
          proposer_team_id: userTeam.id,
          target_team_id: selectedTeamId,
          status: "pending",
          season: new Date().getFullYear(),
          week: currentWeek?.number || 1,
          notes: "",
        })
        .select()
        .single();

      if (tradeError) {
        throw tradeError;
      }

      // Create trade items for proposer's players
      const proposerItems = selectedMyPlayers.map(playerId => ({
        trade_id: trade.id,
        player_id: playerId,
        team_id: userTeam.id,
      }));

      // Create trade items for target's players
      const targetItems = selectedTheirPlayers.map(playerId => ({
        trade_id: trade.id,
        player_id: playerId,
        team_id: selectedTeamId,
      }));

      const { error: itemsError } = await supabase
        .from("trade_items")
        .insert([...proposerItems, ...targetItems]);

      if (itemsError) {
        throw itemsError;
      }

      toast({
        title: "Trade Proposed",
        description: "Your trade proposal has been sent successfully",
      });

      // Invalidate trades query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["trades", leagueId, userTeam?.id] });

      // Reset selections
      setSelectedMyPlayers([]);
      setSelectedTheirPlayers([]);
      setSelectedTeamId("");

    } catch (error) {
      console.error("Error proposing trade:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to propose trade",
        variant: "destructive",
      });
    }
  };

  const otherTeams = teams.filter(team => team.id !== userTeam?.id);

  // Fetch existing trades
  const { data: trades = [], isLoading: tradesLoading } = useQuery({
    queryKey: ["trades", leagueId, userTeam?.id],
    queryFn: async () => {
      if (!userTeam?.id) return [];
      
      const { data, error } = await supabase
        .from("trades")
        .select(`
          id,
          status,
          created_at,
          proposer_team_id,
          target_team_id,
          proposer_team:fantasy_teams!proposer_team_id(id, name, owner: users(full_name)),
          target_team:fantasy_teams!target_team_id(id, name, owner: users(full_name)),
          trade_items(
            id,
            player_id,
            team_id,
            players(id, name, position)
          )
        `)
        .eq("league_id", leagueId)
        .or(`proposer_team_id.eq.${userTeam.id},target_team_id.eq.${userTeam.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!leagueId && !!userTeam?.id,
  });

  // Accept trade mutation
  const acceptTradeMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      const { data, error } = await supabase
        .from("trades")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", tradeId)
        .select()
        .single();

      if (error) throw error;

      // Execute the trade
      const { error: executeError } = await supabase
        .rpc("execute_trade", { trade_id: tradeId });

      if (executeError) throw executeError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["rosterWithDetails"] });
      toast({
        title: "Trade Accepted",
        description: "The trade has been accepted and executed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept trade",
        variant: "destructive",
      });
    },
  });

  // Reject trade mutation
  const rejectTradeMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      const { data, error } = await supabase
        .from("trades")
        .update({ status: "rejected", responded_at: new Date().toISOString() })
        .eq("id", tradeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      toast({
        title: "Trade Rejected",
        description: "The trade has been rejected",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject trade",
        variant: "destructive",
      });
    },
  });

  // Cancel trade mutation
  const cancelTradeMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      const { data, error } = await supabase
        .from("trades")
        .update({ status: "cancelled" })
        .eq("id", tradeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      toast({
        title: "Trade Cancelled",
        description: "The trade has been cancelled",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel trade",
        variant: "destructive",
      });
    },
  });

  const pendingTrades = trades.filter(t => t.status === "pending");
  const completedTrades = trades.filter(t => t.status === "accepted" || t.status === "rejected" || t.status === "cancelled" || t.status === "vetoed");

  // Set up real-time subscription for trades
  useEffect(() => {
    if (!leagueId || !userTeam?.id) return;

    const channel = supabase
      .channel(`trades-${leagueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `league_id=eq.${leagueId}`,
        },
        (payload) => {
          // Invalidate and refetch trades when changes occur
          queryClient.invalidateQueries({ queryKey: ["trades", leagueId] });
          
          // Show notification for new trades
          if (payload.eventType === 'INSERT' && payload.new) {
            const newTrade = payload.new as { target_team_id: string };
            if (newTrade.target_team_id === userTeam.id) {
              toast({
                title: "New Trade Proposal",
                description: "You have received a new trade proposal",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId, userTeam?.id, queryClient]);

  return (
    <Layout>
      <div className="min-h-screen bg-nfl-dark-gray">
        {/* League Header */}
        <LeagueHeader leagueId={leagueId} />


        {/* League Navigation Tabs */}
        <LeagueTabs leagueId={leagueId} activeTab="trades" />

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-6">
            <ArrowRightLeft className="w-6 h-6 text-nfl-blue" />
            <h2 className="text-2xl font-bold text-white">Trade Center</h2>
          </div>
          
          <Tabs defaultValue="propose" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="propose">Propose Trade</TabsTrigger>
              <TabsTrigger value="pending">
                Pending
                {pendingTrades.length > 0 && (
                  <Badge className="ml-2" variant="secondary">
                    {pendingTrades.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="propose" className="mt-6">
              {/* Trade Interface */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Team */}
            <Card className="bg-nfl-gray border-nfl-blue/50">
              <CardHeader className="border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="w-5 h-5" />
                  My Team
                </CardTitle>
                <p className="text-sm text-gray-400 mt-1">{userTeam?.name}</p>
              </CardHeader>
              <CardContent className="p-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-400">
                    {selectedMyPlayers.length}/3 selected
                  </p>
                  {selectedTheirPlayers.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                      <p className="text-xs text-yellow-300">
                        ⚠️ Match positions: {(() => {
                          const theirPositions = selectedTheirPlayers.map(playerId => {
                            const player = theirRoster.find(p => p.player_id === playerId);
                            return player?.position || '';
                          }).reduce((acc, pos) => {
                            acc[pos] = (acc[pos] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                          
                          return Object.entries(theirPositions)
                            .map(([pos, count]) => count > 1 ? `${count} ${pos}s` : `1 ${pos}`)
                            .join(', ');
                        })()}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {loadingMyRoster ? (
                    <div className="text-center py-8 text-gray-400">
                      Loading roster...
                    </div>
                  ) : myRoster.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No players in roster
                    </div>
                  ) : (
                    <>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Roster</h3>
                      {myRoster.map((player) => {
                        // Check if this player's position matches what the other team selected
                        const requiredPositions = selectedTheirPlayers.map(playerId => {
                          const p = theirRoster.find(r => r.player_id === playerId);
                          return p?.position || '';
                        });
                        
                        // Get the display slot (use slot if available, otherwise position)
                        const displaySlot = player.slot || player.position;
                        
                        // Check if position is valid for trade
                        const isValidPosition = selectedTheirPlayers.length === 0 || 
                          requiredPositions.some(reqPos => {
                            // Direct match
                            if (reqPos === player.position) return true;
                            // FLEX can be traded for RB or WR
                            if (displaySlot === 'FLEX' && (reqPos === 'RB' || reqPos === 'WR')) return true;
                            // RB or WR can trade for FLEX
                            if ((player.position === 'RB' || player.position === 'WR') && 
                                theirRoster.find(r => selectedTheirPlayers.includes(r.player_id))?.slot === 'FLEX') return true;
                            return false;
                          });
                        
                        return (
                          <div
                            key={player.player_id}
                            className={`
                              p-3 rounded-lg border cursor-pointer transition-all
                              ${selectedMyPlayers.includes(player.player_id)
                                ? 'bg-nfl-blue/20 border-nfl-blue'
                                : !isValidPosition
                                ? 'opacity-50 bg-nfl-dark-gray border-nfl-light-gray/10'
                                : 'bg-nfl-dark-gray border-nfl-light-gray/20 hover:border-nfl-light-gray/40'
                              }
                            `}
                            onClick={() => {
                              if (isValidPosition || selectedTheirPlayers.length === 0 || selectedMyPlayers.includes(player.player_id)) {
                                togglePlayerSelection(player.player_id, true);
                              } else {
                                toast({
                                  title: "Position Mismatch",
                                  description: `You need to select a ${requiredPositions.join(' or ')} to match their selection`,
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedMyPlayers.includes(player.player_id)}
                                onCheckedChange={() => togglePlayerSelection(player.player_id, true)}
                                onClick={(e) => e.stopPropagation()}
                                disabled={!isValidPosition && selectedTheirPlayers.length > 0 && !selectedMyPlayers.includes(player.player_id)}
                              />
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  !isValidPosition && selectedTheirPlayers.length > 0
                                    ? 'border-gray-600 text-gray-500'
                                    : selectedTheirPlayers.length > 0 && isValidPosition
                                    ? 'border-green-500/50 text-green-400'
                                    : displaySlot === 'FLEX'
                                    ? 'border-purple-500/50 text-purple-400'
                                    : ''
                                }`}
                              >
                                {displaySlot}
                              </Badge>
                              {displaySlot === 'FLEX' && (
                                <span className="text-xs text-gray-500">({player.position})</span>
                              )}
                              <div>
                                <p className="font-medium text-white">
                                  {player.player_name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {player.team_abbreviation}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-white">
                                {player.fantasy_points.toFixed(1)}
                              </p>
                              <p className="text-xs text-gray-400">
                                {player.overall_rating} OVR
                              </p>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Trade With */}
            <Card className="bg-nfl-gray border-nfl-red/50">
              <CardHeader className="border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="w-5 h-5" />
                  Trade With
                </CardTitle>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {otherTeams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.owner})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-4">
                {selectedTeamId ? (
                  <>
                    <div className="mb-4">
                      <p className="text-sm text-gray-400">
                        {selectedTheirPlayers.length}/3 selected
                      </p>
                      {selectedMyPlayers.length > 0 && (
                        <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                          <p className="text-xs text-yellow-300">
                            ⚠️ Match positions: {(() => {
                              const myPositions = selectedMyPlayers.map(playerId => {
                                const player = myRoster.find(p => p.player_id === playerId);
                                return player?.position || '';
                              }).reduce((acc, pos) => {
                                acc[pos] = (acc[pos] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>);
                              
                              return Object.entries(myPositions)
                                .map(([pos, count]) => count > 1 ? `${count} ${pos}s` : `1 ${pos}`)
                                .join(', ');
                            })()}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {loadingTheirRoster ? (
                        <div className="text-center py-8 text-gray-400">
                          Loading roster...
                        </div>
                      ) : theirRoster.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          No players in roster
                        </div>
                      ) : (
                        <>
                          <h3 className="text-sm font-medium text-gray-400 mb-2">Roster</h3>
                          {theirRoster.map((player) => {
                            // Check if this player's position matches what my team selected
                            const requiredPositions = selectedMyPlayers.map(playerId => {
                              const p = myRoster.find(r => r.player_id === playerId);
                              return p?.position || '';
                            });
                            
                            // Get the display slot (use slot if available, otherwise position)
                            const displaySlot = player.slot || player.position;
                            
                            // Check if position is valid for trade
                            const isValidPosition = selectedMyPlayers.length === 0 || 
                              requiredPositions.some(reqPos => {
                                // Direct match
                                if (reqPos === player.position) return true;
                                // FLEX can be traded for RB or WR
                                if (displaySlot === 'FLEX' && (reqPos === 'RB' || reqPos === 'WR')) return true;
                                // RB or WR can trade for FLEX
                                if ((player.position === 'RB' || player.position === 'WR') && 
                                    myRoster.find(r => selectedMyPlayers.includes(r.player_id))?.slot === 'FLEX') return true;
                                return false;
                              });
                            
                            return (
                              <div
                                key={player.player_id}
                                className={`
                                  p-3 rounded-lg border cursor-pointer transition-all
                                  ${selectedTheirPlayers.includes(player.player_id)
                                    ? 'bg-nfl-red/20 border-nfl-red'
                                    : !isValidPosition
                                    ? 'opacity-50 bg-nfl-dark-gray border-nfl-light-gray/10'
                                    : 'bg-nfl-dark-gray border-nfl-light-gray/20 hover:border-nfl-light-gray/40'
                                  }
                                `}
                                onClick={() => {
                                  if (isValidPosition || selectedMyPlayers.length === 0 || selectedTheirPlayers.includes(player.player_id)) {
                                    togglePlayerSelection(player.player_id, false);
                                  } else {
                                    toast({
                                      title: "Position Mismatch",
                                      description: `You need to select a ${requiredPositions.join(' or ')} to match your selection`,
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={selectedTheirPlayers.includes(player.player_id)}
                                    onCheckedChange={() => togglePlayerSelection(player.player_id, false)}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={!isValidPosition && selectedMyPlayers.length > 0 && !selectedTheirPlayers.includes(player.player_id)}
                                  />
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      !isValidPosition && selectedMyPlayers.length > 0
                                        ? 'border-gray-600 text-gray-500'
                                        : selectedMyPlayers.length > 0 && isValidPosition
                                        ? 'border-green-500/50 text-green-400'
                                        : displaySlot === 'FLEX'
                                        ? 'border-purple-500/50 text-purple-400'
                                        : ''
                                    }`}
                                  >
                                    {displaySlot}
                                  </Badge>
                                  {displaySlot === 'FLEX' && (
                                    <span className="text-xs text-gray-500">({player.position})</span>
                                  )}
                                  <div>
                                    <p className="font-medium text-white">
                                      {player.player_name}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {player.team_abbreviation}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-white">
                                    {player.fantasy_points.toFixed(1)}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {player.overall_rating} OVR
                                  </p>
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    Select a team to view their roster
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Trade Actions */}
          {selectedMyPlayers.length > 0 && selectedTheirPlayers.length > 0 && (
            <div className="mt-6 flex flex-col items-center gap-2">
              {(() => {
                // Check if positions match
                const myPositions = selectedMyPlayers.map(playerId => {
                  const player = myRoster.find(p => p.player_id === playerId);
                  return player?.position || '';
                }).sort();
                
                const theirPositions = selectedTheirPlayers.map(playerId => {
                  const player = theirRoster.find(p => p.player_id === playerId);
                  return player?.position || '';
                }).sort();
                
                const positionsMatch = selectedMyPlayers.length === selectedTheirPlayers.length &&
                  myPositions.length === theirPositions.length &&
                  myPositions.every((pos, index) => pos === theirPositions[index]);
                
                if (!positionsMatch) {
                  return (
                    <div className="text-center">
                      <p className="text-sm text-red-400 mb-2">
                        ⚠️ Position mismatch - trades must be between same positions
                      </p>
                      <p className="text-xs text-gray-400">
                        You're offering: {myPositions.join(', ')} | They're offering: {theirPositions.join(', ')}
                      </p>
                    </div>
                  );
                }
                
                return null;
              })()}
              <Button
                size="lg"
                className="bg-nfl-green hover:bg-nfl-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={proposeTrade}
                disabled={(() => {
                  // Check if positions match
                  const myPositions = selectedMyPlayers.map(playerId => {
                    const player = myRoster.find(p => p.player_id === playerId);
                    return player?.position || '';
                  }).sort();
                  
                  const theirPositions = selectedTheirPlayers.map(playerId => {
                    const player = theirRoster.find(p => p.player_id === playerId);
                    return player?.position || '';
                  }).sort();
                  
                  const positionsMatch = selectedMyPlayers.length === selectedTheirPlayers.length &&
                    myPositions.length === theirPositions.length &&
                    myPositions.every((pos, index) => pos === theirPositions[index]);
                  
                  return !positionsMatch;
                })()}
              >
                <Check className="w-5 h-5 mr-2" />
                Propose Trade
              </Button>
            </div>
          )}
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              {tradesLoading ? (
                <div className="text-center py-8 text-gray-400">
                  Loading trades...
                </div>
              ) : pendingTrades.length === 0 ? (
                <Card className="bg-nfl-gray border-nfl-light-gray/20">
                  <CardContent className="text-center py-12">
                    <p className="text-gray-400">No pending trades</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingTrades.map((trade) => {
                    const isProposer = trade.proposer_team_id === userTeam?.id;
                    const proposerPlayers = trade.trade_items?.filter(item => item.team_id === trade.proposer_team_id) || [];
                    const targetPlayers = trade.trade_items?.filter(item => item.team_id === trade.target_team_id) || [];
                    
                    return (
                      <Card key={trade.id} className="bg-nfl-gray border-nfl-light-gray/20">
                        <CardHeader className="border-b border-nfl-light-gray/20">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-white flex items-center gap-2">
                              <Clock className="w-5 h-5 text-yellow-500" />
                              {isProposer ? "Trade Sent" : "Trade Received"}
                            </CardTitle>
                            <Badge variant="secondary">Pending</Badge>
                          </div>
                          <p className="text-sm text-gray-400 mt-1">
                            {new Date(trade.created_at).toLocaleDateString()}
                          </p>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2">
                                {trade.proposer_team?.name} gives:
                              </h4>
                              <div className="space-y-1">
                                {proposerPlayers.map((item) => (
                                  <div key={item.id} className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {item.players?.position}
                                    </Badge>
                                    <span className="text-sm text-white">
                                      {item.players?.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2">
                                {trade.target_team?.name} gives:
                              </h4>
                              <div className="space-y-1">
                                {targetPlayers.map((item) => (
                                  <div key={item.id} className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {item.players?.position}
                                    </Badge>
                                    <span className="text-sm text-white">
                                      {item.players?.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex gap-2 justify-end">
                            {isProposer ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelTradeMutation.mutate(trade.id)}
                                disabled={cancelTradeMutation.isPending}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => rejectTradeMutation.mutate(trade.id)}
                                  disabled={rejectTradeMutation.isPending || acceptTradeMutation.isPending}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => acceptTradeMutation.mutate(trade.id)}
                                  disabled={acceptTradeMutation.isPending || rejectTradeMutation.isPending}
                                  className="bg-nfl-green hover:bg-nfl-green/90"
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Accept
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              {tradesLoading ? (
                <div className="text-center py-8 text-gray-400">
                  Loading trades...
                </div>
              ) : completedTrades.length === 0 ? (
                <Card className="bg-nfl-gray border-nfl-light-gray/20">
                  <CardContent className="text-center py-12">
                    <p className="text-gray-400">No trade history</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {completedTrades.map((trade) => {
                    const proposerPlayers = trade.trade_items?.filter(item => item.team_id === trade.proposer_team_id) || [];
                    const targetPlayers = trade.trade_items?.filter(item => item.team_id === trade.target_team_id) || [];
                    
                    return (
                      <Card key={trade.id} className="bg-nfl-gray border-nfl-light-gray/20">
                        <CardHeader className="border-b border-nfl-light-gray/20">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-white">
                              {trade.proposer_team?.name} ⇄ {trade.target_team?.name}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              {trade.status === "accepted" && (
                                <Badge className="bg-green-500/20 text-green-500 border-green-500/50">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                              {trade.status === "rejected" && (
                                <Badge className="bg-red-500/20 text-red-500 border-red-500/50">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Rejected
                                </Badge>
                              )}
                              {trade.status === "cancelled" && (
                                <Badge variant="secondary">
                                  Cancelled
                                </Badge>
                              )}
                              {trade.status === "vetoed" && (
                                <Badge className="bg-red-500/20 text-red-500 border-red-500/50">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Vetoed
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-400 mt-1">
                            {new Date(trade.created_at).toLocaleDateString()}
                          </p>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2">
                                {trade.proposer_team?.name} traded:
                              </h4>
                              <div className="space-y-1">
                                {proposerPlayers.map((item) => (
                                  <div key={item.id} className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {item.players?.position}
                                    </Badge>
                                    <span className="text-sm text-gray-400">
                                      {item.players?.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2">
                                {trade.target_team?.name} traded:
                              </h4>
                              <div className="space-y-1">
                                {targetPlayers.map((item) => (
                                  <div key={item.id} className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {item.players?.position}
                                    </Badge>
                                    <span className="text-sm text-gray-400">
                                      {item.players?.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}