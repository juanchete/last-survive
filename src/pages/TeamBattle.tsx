import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useFantasyTeams } from "@/hooks/useFantasyTeams";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { useLocation } from "react-router-dom";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PlayerStats {
  player_id: number;
  player_name: string;
  position: string;
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
  index 
}: { 
  team: any; 
  isUserTeam: boolean; 
  currentWeek: number;
  index: number;
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

  // Convert roster data to PlayerStats format
  const players: PlayerStats[] = roster.slice(0, 4).map((player) => ({
    player_id: parseInt(player.id),
    player_name: player.name || "Unknown Player",
    position: player.position || "POS",
    fantasy_points: player.stats?.fantasy_points || 0,
    opponent: "vs OPP", // This would need to come from schedule data
    game_time: "TBD",
    is_playing: true,
    projected_points: 0, // This would need projection data
  }));

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
          <span className="text-2xl font-bold text-nfl-green">
            {ppg} PPG
          </span>
          <Badge 
            variant="default"
            className="bg-nfl-green/20 text-nfl-green border-nfl-green/30"
          >
            SAFE
          </Badge>
        </div>
      </div>

      {/* Players List */}
      <div className="p-2 space-y-2">
        {isLoading ? (
          // Loading skeleton for players
          Array(4).fill(0).map((_, i) => (
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
                    className="text-xs border-gray-600 text-gray-300"
                  >
                    {player.position}
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
                  {player.position} • {player.opponent} {player.game_time}
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

  // Hooks for real data
  const { data: teams = [], isLoading: loadingTeams } = useFantasyTeams(leagueId);
  const { data: userTeam } = useUserFantasyTeam(leagueId);

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

  // Sort teams by ranking and get top 5 (or all if less than 5)
  const sortedTeams = [...teams].sort((a, b) => a.rank - b.rank).slice(0, 5);

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
                ({teams.filter(t => !t.eliminated).length} teams remaining)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Auto-Scroll</span>
              <Switch
                checked={autoScroll}
                onCheckedChange={setAutoScroll}
              />
            </div>
          </div>
          
          {/* Team Battle Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {loadingTeams ? (
              // Loading skeleton
              Array(5).fill(0).map((_, idx) => (
                <div key={idx} className="bg-nfl-gray border border-nfl-light-gray/20 rounded-lg p-4 animate-pulse">
                  <div className="h-6 bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="space-y-2">
                    {Array(4).fill(0).map((_, i) => (
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