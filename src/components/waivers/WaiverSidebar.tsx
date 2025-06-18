
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Clock } from "lucide-react";
import type { Player } from "@/types";

interface WaiverSidebarProps {
  waiverPriority: Array<{ fantasy_team_id: string; priority: number }>;
  loadingPriority: boolean;
  myWaiverRequests: Array<{ 
    id: string; 
    player_id?: number; 
    drop_player_id?: number; 
    status: string 
  }>;
  loadingRequests: boolean;
  waiverPlayers: Player[];
  activeRosterPlayers: Player[];
  userTeam?: { id: string };
}

export function WaiverSidebar({ 
  waiverPriority, 
  loadingPriority, 
  myWaiverRequests, 
  loadingRequests, 
  waiverPlayers, 
  activeRosterPlayers, 
  userTeam 
}: WaiverSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Waiver Priority */}
      <Card className="bg-gradient-to-br from-nfl-gray to-nfl-dark-gray border-nfl-light-gray/20 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Waiver Priority
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPriority ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="animate-spin w-4 h-4" /> Loading...
            </div>
          ) : (
            <div className="space-y-3">
              {waiverPriority.map((wp, idx) => (
                <div key={wp.fantasy_team_id} className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                  userTeam?.id === wp.fantasy_team_id 
                    ? "bg-nfl-blue/20 border border-nfl-blue/40 shadow-md" 
                    : "bg-nfl-dark-gray/30 hover:bg-nfl-dark-gray/50"
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    userTeam?.id === wp.fantasy_team_id ? "bg-nfl-blue text-white" : "bg-gray-600 text-gray-300"
                  }`}>
                    {idx + 1}
                  </div>
                  <span className={`text-sm font-medium ${
                    userTeam?.id === wp.fantasy_team_id ? "text-nfl-blue" : "text-gray-300"
                  }`}>
                    Team {wp.fantasy_team_id?.slice(0, 8)}
                    {userTeam?.id === wp.fantasy_team_id && (
                      <span className="ml-2 text-xs bg-nfl-blue/20 text-nfl-blue px-2 py-1 rounded-full">You</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Requests */}
      <Card className="bg-gradient-to-br from-nfl-gray to-nfl-dark-gray border-nfl-light-gray/20 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            My Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="animate-spin w-4 h-4" /> Loading...
            </div>
          ) : (
            <div className="space-y-3">
              {myWaiverRequests.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-gray-400 text-sm">No requests this week</p>
                  <p className="text-gray-500 text-xs mt-1">Request players above to see them here</p>
                </div>
              ) : (
                myWaiverRequests.map(req => {
                  const requestedPlayer = waiverPlayers.find(p => p.id === req.player_id?.toString());
                  return (
                    <div key={req.id} className="bg-nfl-dark-gray/50 p-4 rounded-lg border border-nfl-light-gray/10 hover:border-nfl-light-gray/20 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {requestedPlayer?.photo && (
                            <img 
                              src={requestedPlayer.photo} 
                              alt={requestedPlayer.name} 
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          )}
                          <span className="font-medium text-white text-sm">
                            {requestedPlayer?.name || `Player ${req.player_id}`}
                          </span>
                        </div>
                        <Badge className={
                          req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50' :
                          req.status === 'approved' ? 'bg-green-500/20 text-green-300 border-green-400/50' :
                          'bg-red-500/20 text-red-300 border-red-400/50'
                        }>
                          {req.status === 'pending' ? 'Pending' :
                           req.status === 'approved' ? 'Approved' : 'Rejected'}
                        </Badge>
                      </div>
                      {req.drop_player_id && (
                        <p className="text-xs text-gray-400">
                          Drop: {activeRosterPlayers.find(p => p.id === req.drop_player_id?.toString())?.name || `Player ${req.drop_player_id}`}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
