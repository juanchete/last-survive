import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface DraftPicksHistoryProps {
  leagueId: string;
  currentPick: number;
  teams: Array<{ id: string; name: string; }>;
  messages?: Array<{ type: string; playerName?: string; userName?: string; timestamp: string; }>; // Receive realtime messages
}

export function DraftPicksHistory({ leagueId, currentPick, teams, messages = [] }: DraftPicksHistoryProps) {
  // Fetch recent draft picks
  const { data: recentPicks = [], refetch } = useQuery({
    queryKey: ["recentDraftPicks", leagueId],
    queryFn: async () => {
      console.log('[DraftPicksHistory] Fetching picks for league:', leagueId);
      
      const { data, error } = await supabase
        .from("team_rosters")
        .select(`
          id,
          fantasy_team_id,
          player_id,
          slot,
          players!inner(
            id,
            name,
            position,
            nfl_teams(abbreviation)
          ),
          fantasy_teams!inner(
            id,
            name,
            league_id
          )
        `)
        .eq("week", 1) // Draft picks are for week 1
        .eq("fantasy_teams.league_id", leagueId) // Filter by league
        .order("id", { ascending: false }) // Order by ID since no created_at
        .limit(20);
      
      if (error) {
        console.error('[DraftPicksHistory] Error fetching picks:', error);
        throw error;
      }
      
      console.log('[DraftPicksHistory] Found picks:', data?.length || 0);
      
      return data?.map((pick, index) => ({
        ...pick,
        pickNumber: currentPick - index - 1,
        teamName: pick.fantasy_teams?.name || 'Unknown Team' // Get team name directly from the joined data
      })) || [];
    },
    refetchInterval: 3000, // Poll every 3 seconds during draft
    enabled: !!leagueId
  });

  // Refetch when new picks are made via realtime
  useEffect(() => {
    const pickMessages = messages.filter(m => m.type === 'pick_made');
    if (pickMessages.length > 0) {
      refetch();
    }
  }, [messages, refetch]);

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      QB: "bg-red-500",
      RB: "bg-blue-500",
      WR: "bg-green-500",
      TE: "bg-yellow-500",
      K: "bg-purple-500",
      DEF: "bg-orange-500",
      DP: "bg-pink-500",
      LB: "bg-indigo-500",
      DB: "bg-teal-500",
      DL: "bg-cyan-500"
    };
    return colors[position] || "bg-gray-500";
  };

  const calculateRound = (pickNum: number, totalTeams: number) => {
    if (pickNum < 0 || totalTeams === 0) return { round: 1, pick: 1 };
    const round = Math.floor(pickNum / totalTeams) + 1;
    const pick = (pickNum % totalTeams) + 1;
    return { round, pick };
  };

  return (
    <Card className="bg-nfl-gray border-nfl-light-gray/20 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-nfl-blue" />
          Recent Picks
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="space-y-2 p-4">
            {recentPicks.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No picks yet</p>
                <p className="text-xs mt-1">Draft picks will appear here</p>
              </div>
            ) : (
              recentPicks.map((pick, index) => {
                const { round, pick: pickInRound } = calculateRound(
                  pick.pickNumber,
                  teams.length
                );
                
                return (
                  <div
                    key={pick.id}
                    className="bg-nfl-dark-gray rounded-lg p-3 border border-nfl-light-gray/10 hover:border-nfl-light-gray/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            className={`${getPositionColor(pick.players.position)} text-white text-xs px-1.5 py-0`}
                          >
                            {pick.players.position}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            R{round}.{pickInRound}
                          </span>
                        </div>
                        <div className="font-semibold text-sm text-white">
                          {pick.players.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {pick.players.nfl_teams?.abbreviation || "FA"} • {pick.teamName}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}