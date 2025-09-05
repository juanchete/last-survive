import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { useLocation } from "react-router-dom";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { RefreshCw, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeStats } from "@/hooks/useRealtimeStats";

interface PlayerStats {
  player_id: number;
  player_name: string;
  position: string;
  slot: string;
  fantasy_points: number;
  opponent: string;
  game_time: string;
  is_playing: boolean;
  projected_points: number;
}

// Component to display a team's roster with real player data
function TeamRosterDisplay({ 
  team, 
  isUserTeam, 
  currentWeek,
  index,
  projections,
  totalTeams
}: { 
  team: any; 
  isUserTeam: boolean; 
  currentWeek: number;
  index: number;
  projections?: any[];
  totalTeams: number;
}) {
  const { data: roster = [], isLoading } = useRosterWithPlayerDetails(
    team.id,
    currentWeek
  );

  const getTeamPPG = (team: any) => {
    const weeks = currentWeek || 1;
    return (team.points / weeks).toFixed(1);
  };

  const ppg = getTeamPPG(team);
  const projection = projections?.find(p => p.teamId === team.id)?.projectedPoints || 0;

  // Define the slot order
  const slotOrder = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'DP'];
  
  // Convert roster data to PlayerStats format - show ALL players
  const players: PlayerStats[] = roster
    .map((player) => ({
      player_id: parseInt(player.id),
      player_name: player.name || "Unknown Player",
      position: player.position || "POS",
      slot: player.slot || player.position || "POS", // Use slot from roster data
      fantasy_points: player.stats?.fantasy_points || 0,
      opponent: "vs OPP", // This would need to come from schedule data
      game_time: "TBD",
      is_playing: true,
      projected_points: 0, // This would need projection data
    }))
    .sort((a, b) => {
      // Sort by slot order
      const aIndex = slotOrder.indexOf(a.slot);
      const bIndex = slotOrder.indexOf(b.slot);
      
      // If both slots are in the order array, sort by their index
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one is in the order array, it comes first
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // If neither is in the order array, sort alphabetically
      return a.slot.localeCompare(b.slot);
    });

  return (
    <div
      className={`
        bg-nfl-gray border rounded-lg overflow-hidden
        ${isUserTeam 
          ? 'border-nfl-blue ring-2 ring-nfl-blue/30' 
          : 'border-nfl-light-gray/20'
        }
        ${index < 3 ? 'lg:col-span-1' : 'lg:col-span-1'}
      `}
    >
      {/* Team Header */}
      <div className="p-4 border-b border-nfl-light-gray/20">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-yellow-400">
              #{team.rank}
            </span>
            <div>
              <h3 className="font-bold text-white">
                {team.name}
              </h3>
              <p className="text-sm text-gray-400">{team.owner}</p>
            </div>
          </div>
          {isUserTeam && (
            <Badge 
              variant="outline" 
              className="text-xs border-nfl-blue text-nfl-blue bg-nfl-blue/10"
            >
              YOU
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-nfl-green">
              {team.points.toFixed(1)} PTS
            </span>
            <span className="text-sm text-gray-400">
              Proj: {projection.toFixed(1)}
            </span>
          </div>
          <Badge 
            variant="default"
            className={`${
              team.rank <= totalTeams - Math.floor(totalTeams / 4)
                ? 'bg-nfl-green/20 text-nfl-green border-nfl-green/30'
                : 'bg-red-500/20 text-red-500 border-red-500/30'
            }`}
          >
            {team.rank <= totalTeams - Math.floor(totalTeams / 4) ? 'SAFE' : 'DANGER'}
          </Badge>
        </div>
      </div>

      {/* Players List */}
      <div className="p-2 space-y-2">
        {isLoading ? (
          // Loading skeleton for players
          Array(10).fill(0).map((_, i) => (
            <div key={i} className="p-3 rounded-lg bg-nfl-dark-gray/50 animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-3/4"></div>
            </div>
          ))
        ) : players.length === 0 ? (
          <div className="p-3 text-center text-gray-400 text-sm">
            No players in roster
          </div>
        ) : (
          players.map((player) => (
            <div
              key={player.player_id}
              className={`
                p-3 rounded-lg border
                ${player.is_playing 
                  ? 'bg-nfl-dark-gray border-nfl-light-gray/20' 
                  : 'bg-nfl-dark-gray/50 border-nfl-light-gray/10'
                }
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className="text-xs border-gray-600 text-gray-300 min-w-[45px] text-center"
                  >
                    {player.slot}
                  </Badge>
                  <span className="text-sm font-medium text-white">
                    {player.player_name}
                  </span>
                </div>
                <span className="text-xl font-bold text-white">
                  {player.fantasy_points.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {player.position} • {player.opponent}
                </span>
                <span>
                  Proj: {player.projected_points.toFixed(1)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function TeamBattle() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "";
  const { user } = useAuth();
  const [autoScroll, setAutoScroll] = useState(false);
  
  // Determine if we're in game week (Thu night - Mon) or non-game week (Tue - Thu day)
  const isGameWeek = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hour = now.getHours();
    
    // Game week: Thursday night (4 @ 20:00) through Monday (1)
    // Non-game week: Tuesday (2), Wednesday (3), Thursday day (4 before 20:00)
    
    if (day === 0 || day === 1 || day === 5 || day === 6) {
      // Sunday, Monday, Friday, Saturday - always game week
      return true;
    } else if (day === 2 || day === 3) {
      // Tuesday, Wednesday - always non-game week
      return false;
    } else if (day === 4) {
      // Thursday - game week starts at 8 PM (20:00)
      return hour >= 20;
    }
    return false;
  };
  
  const sortingMode = isGameWeek() ? 'actual' : 'projected';

  // Hooks for real data
  const { data: teams = [], isLoading: loadingTeams } = useFantasyTeams(leagueId);
  const { data: userTeam } = useUserFantasyTeam(leagueId);
  
  // Auto-start real-time stats sync during game time
  const { status: syncStatus, forceSync } = useRealtimeStats(true);

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

  // Get projected points for each team
  const { data: projections } = useQuery({
    queryKey: ["teamProjections", leagueId, currentWeek?.number],
    queryFn: async () => {
      if (!currentWeek?.number) return [];
      
      // Get all rosters for this week
      const { data: rosters, error: rostersError } = await supabase
        .from("team_rosters")
        .select(`
          fantasy_team_id,
          player_id,
          slot
        `)
        .eq("week", currentWeek.number);
      
      if (rostersError) return [];
      
      // Get player projections for this week
      const playerIds = rosters?.map(r => r.player_id) || [];
      const { data: stats, error: statsError } = await supabase
        .from("player_stats")
        .select("player_id, projected_points")
        .in("player_id", playerIds)
        .eq("week", currentWeek.number)
        .eq("season", new Date().getFullYear());
      
      if (statsError) return [];
      
      // Calculate projected points per team
      const statsMap = new Map(stats?.map(s => [s.player_id, s.projected_points || 0]) || []);
      const teamProjections = new Map();
      
      rosters?.forEach(roster => {
        const currentProjection = teamProjections.get(roster.fantasy_team_id) || 0;
        const playerProjection = statsMap.get(roster.player_id) || 0;
        teamProjections.set(roster.fantasy_team_id, currentProjection + playerProjection);
      });
      
      return Array.from(teamProjections.entries()).map(([teamId, projectedPoints]) => ({
        teamId,
        projectedPoints
      }));
    },
    enabled: !!leagueId && !!currentWeek?.number,
  });
  
  // Sort teams based on current mode (projected vs actual points)
  const sortedTeams = [...teams].sort((a, b) => {
    if (sortingMode === 'projected') {
      // Sort by projected points for non-game week
      const aProjection = projections?.find(p => p.teamId === a.id)?.projectedPoints || 0;
      const bProjection = projections?.find(p => p.teamId === b.id)?.projectedPoints || 0;
      return bProjection - aProjection; // Highest first
    } else {
      // Sort by actual points for game week
      return b.points - a.points; // Highest first
    }
  });
  
  // Update rankings based on sorted order
  sortedTeams.forEach((team, index) => {
    team.rank = index + 1;
  });

  return (
    <Layout>
      <div className="min-h-screen bg-nfl-dark-gray">
        {/* League Header */}
        <LeagueHeader leagueId={leagueId} />


        {/* League Navigation Tabs */}
        <LeagueTabs leagueId={leagueId} activeTab="team-battle" />

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white">
                League Battle View
              </h2>
              <span className="text-gray-400">
                ({teams.filter(t => !t.eliminated).length} teams remaining - Sorting by {sortingMode === 'projected' ? 'Projected' : 'Actual'} Points)
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* Real-time sync status */}
              <div className="flex items-center gap-2">
                <RefreshCw 
                  className={`w-4 h-4 ${syncStatus.isRunning ? 'text-green-500 animate-spin' : 'text-gray-400'}`} 
                />
                <span className="text-xs text-gray-400">
                  {syncStatus.isRunning ? 'Live Sync' : 'Sync Off'}
                  {syncStatus.isGameTime && syncStatus.isRunning && ' 🔴'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Auto-Scroll</span>
                <Switch
                  checked={autoScroll}
                  onCheckedChange={setAutoScroll}
                />
              </div>
            </div>
          </div>
          
          {/* Team Battle Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {loadingTeams ? (
              // Loading skeleton
              Array(10).fill(0).map((_, idx) => (
                <div key={idx} className="bg-nfl-gray border border-nfl-light-gray/20 rounded-lg p-4 animate-pulse">
                  <div className="h-6 bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="space-y-2">
                    {Array(10).fill(0).map((_, i) => (
                      <div key={i} className="h-12 bg-gray-700 rounded"></div>
                    ))}
                  </div>
                </div>
              ))
            ) : sortedTeams.length === 0 ? (
              <div className="col-span-5 text-center py-8 text-gray-400">
                No teams found
              </div>
            ) : (
              sortedTeams.map((team, index) => {
                const isUserTeam = team.owner_id === user?.id;
                
                return (
                  <TeamRosterDisplay
                    key={team.id}
                    team={team}
                    isUserTeam={isUserTeam}
                    currentWeek={currentWeek?.number || 1}
                    index={index}
                    projections={projections}
                    totalTeams={teams.length}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}