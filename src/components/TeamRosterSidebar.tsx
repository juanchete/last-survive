import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DraftTimer } from "@/components/DraftTimer";
import { Users, Trophy, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface RosterPlayer {
  id: string;
  player_id: string;
  slot: string;
  name: string;
  position: string;
  team: string;
}

interface TeamRosterSidebarProps {
  roster: RosterPlayer[];
  slotLimits: Record<string, number>;
  slotCounts: Record<string, number>;
  userTeam: any;
  isMyTurn: boolean;
  isActive: boolean;
  onTimeExpired: () => void;
  onToggleAutoTimed?: (enabled: boolean) => void;
  timerDuration?: number;
  turnDeadline?: string | null;
  turnStartedAt?: string | null;
}

export function TeamRosterSidebar({
  roster,
  slotLimits,
  slotCounts,
  userTeam,
  isMyTurn,
  isActive,
  onTimeExpired,
  onToggleAutoTimed,
  timerDuration = 60,
  turnDeadline,
  turnStartedAt
}: TeamRosterSidebarProps) {
  const positionColors = {
    QB: "bg-nfl-blue",
    RB: "bg-nfl-green",
    WR: "bg-nfl-yellow",
    TE: "bg-nfl-accent",
    K: "bg-nfl-lightblue",
    DEF: "bg-nfl-red",
    DP: "bg-purple-600"
  };

  const positionOrder = ["QB", "RB", "WR", "TE", "FLEX", "K", "DEF", "DP"];

  return (
    <div className="space-y-6">
      {/* Draft Timer */}
      <DraftTimer
        isMyTurn={isMyTurn}
        isActive={isActive}
        onTimeExpired={onTimeExpired}
        onToggleAutoTimed={onToggleAutoTimed}
        timerDuration={timerDuration}
        turnDeadline={turnDeadline}
        turnStartedAt={turnStartedAt}
      />

      {/* Team Info Card */}
      {userTeam && (
        <Card className="bg-nfl-gray border-nfl-light-gray/20">
          <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20 pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-nfl-blue" />
              {userTeam.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Owner</span>
                <span className="text-white font-medium">{userTeam.owner || "You"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Drafted</span>
                <span className="text-white font-medium">{roster.length}/9</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Needs</span>
                <div className="flex gap-1">
                  {positionOrder.filter(pos => {
                    const count = slotCounts[pos] || 0;
                    const limit = slotLimits[pos];
                    return count < limit;
                  }).slice(0, 3).map(pos => (
                    <Badge key={pos} className="text-xs bg-nfl-dark-gray">
                      {pos === "FLEX" ? "RB/WR" : pos}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roster Card */}
      <Card className="bg-nfl-gray border-nfl-light-gray/20">
        <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20 pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-nfl-green" />
              <span>My Roster</span>
            </div>
            <Badge variant="secondary" className="bg-nfl-blue text-white">
              {roster.length}/9
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            {roster.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                No players drafted yet
              </div>
            ) : (
              <div className="divide-y divide-nfl-light-gray/10">
                {positionOrder.map(position => {
                  const playersInPosition = roster.filter(p => p.slot === position);
                  const limit = slotLimits[position];
                  
                  // Don't show positions with 0 limit
                  if (limit === 0) return null;
                  
                  return (
                    <div key={position} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-400 uppercase">
                          {position === "FLEX" ? "FLEX (RB/WR)" : position}
                        </span>
                        <span className="text-xs text-gray-500">
                          {playersInPosition.length}/{limit}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {playersInPosition.map((player) => (
                          <div key={player.id} className="flex items-center gap-2">
                            <Badge className={cn(
                              "text-xs text-white",
                              positionColors[player.position as keyof typeof positionColors] || "bg-gray-600"
                            )}>
                              {player.position}
                            </Badge>
                            <div className="flex-1">
                              <div className="text-sm text-white truncate">
                                {player.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                {player.team}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Show empty slots */}
                        {Array.from({ length: limit - playersInPosition.length }).map((_, idx) => (
                          <div key={`empty-${position}-${idx}`} className="flex items-center gap-2 opacity-50">
                            <div className="w-8 h-5 rounded bg-nfl-dark-gray/50"></div>
                            <span className="text-sm text-gray-500 italic">Empty</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Draft Rules */}
      <Card className="bg-nfl-gray border-nfl-light-gray/20">
        <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-nfl-blue" />
            <span>Roster Requirements</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="space-y-1 text-xs text-gray-400">
            <p>• 1 QB, 2 RB, 2 WR, 1 TE</p>
            <p>• 1 FLEX (RB/WR), 1 K, 1 DEF</p>
            <p>• 1 DP (Defensive Player)</p>
            <p>• Total: 9 players (sin banca)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}