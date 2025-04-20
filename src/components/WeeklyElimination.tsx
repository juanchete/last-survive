
import { Button } from "@/components/ui/button";
import { useLeagueStore } from "@/store/leagueStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function WeeklyElimination() {
  const { currentWeek, weeks, nflTeams } = useLeagueStore();
  const currentWeekData = weeks.find(w => w.number === currentWeek);
  
  // Find the next team to be eliminated (just for display)
  const nextToEliminate = nflTeams.find(team => 
    !team.eliminated && team.id === "5" // Just a placeholder for demo
  );
  
  return (
    <Card className="bg-nfl-gray border-nfl-light-gray/20">
      <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-nfl-blue" />
          <span>Weekly Elimination</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-nfl-lightblue font-bold">WEEK {currentWeek}</h3>
          <Badge variant="outline" className="bg-transparent">
            {currentWeekData?.status.toUpperCase()}
          </Badge>
        </div>
        
        {currentWeekData?.eliminatedTeam ? (
          <div className="bg-nfl-dark-gray rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Flag className="w-5 h-5 text-nfl-red" />
              <h4 className="font-medium">Eliminated This Week</h4>
            </div>
            
            <div className="flex items-center gap-3 mt-3">
              <div className="w-10 h-10 bg-nfl-gray rounded-full flex items-center justify-center">
                {/* Team logo would go here */}
                <span className="font-bold text-sm">{currentWeekData.eliminatedTeam.abbreviation}</span>
              </div>
              <div>
                <div className="font-bold">{currentWeekData.eliminatedTeam.name}</div>
                <div className="text-sm text-gray-400">
                  Players now available for draft
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-nfl-dark-gray rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Flag className="w-5 h-5 text-nfl-yellow" />
              <h4 className="font-medium">Next Team at Risk</h4>
            </div>
            
            {nextToEliminate && (
              <div className="flex items-center gap-3 mt-3">
                <div className="w-10 h-10 bg-nfl-gray rounded-full flex items-center justify-center">
                  {/* Team logo would go here */}
                  <span className="font-bold text-sm">{nextToEliminate.abbreviation}</span>
                </div>
                <div>
                  <div className="font-bold">{nextToEliminate.name}</div>
                  <div className="text-sm text-gray-400">
                    Elimination scheduled for week end
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Elimination History</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {weeks
              .filter(week => week.number < currentWeek && week.eliminatedTeam)
              .map(week => (
                <div key={week.number} className="flex items-center justify-between bg-nfl-dark-gray rounded py-2 px-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-transparent">
                      Week {week.number}
                    </Badge>
                    <span>{week.eliminatedTeam?.name}</span>
                  </div>
                </div>
              ))}
              
            {!weeks.some(week => week.number < currentWeek && week.eliminatedTeam) && (
              <div className="text-center py-2 text-gray-400">
                No teams eliminated yet
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
