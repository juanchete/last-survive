import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface LeagueHeaderProps {
  leagueId: string;
}

export function LeagueHeader({ leagueId }: LeagueHeaderProps) {
  const { user } = useAuth();
  
  // Fetch league data
  const { data: league, isLoading } = useQuery({
    queryKey: ["league", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select(`
          *,
          users (
            full_name
          )
        `)
        .eq("id", leagueId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!leagueId,
  });

  // Fetch teams count
  const { data: teamsData } = useQuery({
    queryKey: ["leagueTeamsCount", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fantasy_teams")
        .select("id, eliminated")
        .eq("league_id", leagueId);

      if (error) throw error;
      return data;
    },
    enabled: !!leagueId,
  });

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

  if (isLoading || !league) {
    return (
      <div className="bg-nfl-dark-gray text-white py-8 border-b border-nfl-light-gray/20">
        <div className="container mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-6 bg-gray-700 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  const remainingTeams = teamsData?.filter((team) => !team.eliminated).length || 0;
  const totalTeams = teamsData?.length || 0;

  return (
    <div className="bg-nfl-dark-gray text-white py-8 border-b border-nfl-light-gray/20">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-start">
          {/* Left side - League info */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{league.name}</h1>
              {league.is_private && (
                <Badge className="bg-yellow-600 text-black hover:bg-yellow-700">
                  PRIVATE
                </Badge>
              )}
            </div>
            <p className="text-gray-400 mb-4">{league.season || new Date().getFullYear()} NFL Season</p>
            
            <div className="flex gap-8 text-sm">
              <div>
                <span className="text-gray-400">Prize Pool</span>
                <p className="text-2xl font-bold text-yellow-400">
                  ${(league.entry_fee * totalTeams).toFixed(0)}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Entry Fee</span>
                <p className="text-2xl font-bold">${league.entry_fee}</p>
              </div>
              <div>
                <span className="text-gray-400">Commissioner</span>
                <p className="text-lg">{league.users?.full_name || "Unknown"}</p>
              </div>
            </div>
          </div>

          {/* Right side - Week and teams info */}
          <div className="text-right">
            <div className="mb-4">
              <p className="text-gray-400 text-sm">Week</p>
              <p className="text-3xl font-bold">{currentWeek?.number || 1} / 18</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Teams Remaining</p>
              <p className="text-2xl font-bold mb-4">{remainingTeams} / {totalTeams}</p>
              {/* League Settings button - only show for league owner */}
              {user?.id === league.owner_id && (
                <Button 
                  asChild
                  variant="outline" 
                  className="border-nfl-blue text-nfl-blue hover:bg-nfl-blue hover:text-white transition-all duration-200"
                  size="sm"
                >
                  <Link to={`/league/${leagueId}/manage`}>
                    <Settings className="w-4 h-4 mr-2" />
                    League Settings
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}