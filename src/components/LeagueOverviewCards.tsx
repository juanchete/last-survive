import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Shield, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LeagueTeam } from "@/hooks/useLeagueDashboardData";

interface LeagueOverviewCardsProps {
  leagueId: string;
  teams: LeagueTeam[] | undefined;
  isLoading: boolean;
}

export function LeagueOverviewCards({ leagueId, teams, isLoading }: LeagueOverviewCardsProps) {
  const { user } = useAuth();

  if (isLoading || !teams) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-nfl-gray border-nfl-light-gray/20">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Get top performer
  const topPerformer = teams[0]; // Already sorted by rank

  // Calculate survival rate
  const activeTeams = teams.filter(team => !team.eliminated).length;
  const survivalRate = teams.length > 0 ? Math.round((activeTeams / teams.length) * 100) : 0;

  // Get user's team position
  const userTeam = teams.find(team => team.owner_id === user?.id);
  const userPosition = userTeam ? userTeam.rank : null;
  const userStatus = userTeam && !userTeam.eliminated ? "SAFE" : userTeam ? "ELIMINATED" : "NO TEAM";

  // Calculate PPG (Points Per Game) - assuming 1 game played per week
  const currentWeek = 1; // This should come from the actual week data
  const topPerformerPPG = topPerformer && currentWeek > 0 
    ? (topPerformer.points / currentWeek).toFixed(1) 
    : "0.0";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Top Performer Card */}
      <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="text-gray-400 font-medium">Top Performer</h3>
          </div>
          {topPerformer ? (
            <>
              <p className="text-2xl font-bold text-white mb-1">{topPerformer.name}</p>
              <p className="text-gray-400 text-sm mb-3">{topPerformer.owner}</p>
              <p className="text-3xl font-bold text-nfl-green">{topPerformerPPG} PPG</p>
            </>
          ) : (
            <p className="text-gray-500">No teams yet</p>
          )}
        </CardContent>
      </Card>

      {/* Survival Rate Card */}
      <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-nfl-green" />
            <h3 className="text-gray-400 font-medium">Survival Rate</h3>
          </div>
          <p className="text-4xl font-bold text-white mb-1">{survivalRate}%</p>
          <p className="text-gray-400 text-sm">This Week</p>
          <p className="text-xs text-gray-500 mt-3">Based on current rank</p>
        </CardContent>
      </Card>

      {/* Your Position Card */}
      <Card className="bg-nfl-gray border-nfl-light-gray/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-nfl-blue" />
            <h3 className="text-gray-400 font-medium">Your Position</h3>
          </div>
          {userTeam ? (
            <>
              <p className="text-4xl font-bold text-white mb-1">{userPosition}</p>
              <p className={`text-sm font-medium ${
                userStatus === "SAFE" ? "text-nfl-green" : 
                userStatus === "ELIMINATED" ? "text-nfl-red" : 
                "text-gray-400"
              }`}>
                {userStatus}
              </p>
              <p className="text-xs text-gray-500 mt-3">2 top performers</p>
            </>
          ) : (
            <p className="text-gray-500">Join league to compete</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}