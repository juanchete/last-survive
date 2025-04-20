
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FantasyTeam } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Trophy, User } from "lucide-react";

interface TeamCardProps {
  team: FantasyTeam;
  isUser?: boolean;
}

export function TeamCard({ team, isUser = false }: TeamCardProps) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-amber-600";
    return "text-white";
  };

  return (
    <Card className={`overflow-hidden bg-nfl-gray border ${isUser ? "border-nfl-blue" : "border-nfl-light-gray/20"}`}>
      <CardHeader className={`pb-2 ${isUser ? "bg-nfl-blue/10" : "bg-nfl-dark-gray"}`}>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getRankColor(team.rank)} bg-nfl-darker`}>
              {team.rank <= 3 ? <Trophy className="w-4 h-4" /> : team.rank}
            </div>
            <span>{team.name}</span>
            {isUser && (
              <Badge className="ml-2 bg-nfl-blue">
                You
              </Badge>
            )}
          </CardTitle>
          <div>
            <Badge variant="outline" className="bg-transparent flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{team.owner}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="mb-4 text-center">
          <span className="text-gray-400 text-sm">Total Points</span>
          <div className="text-3xl font-bold text-nfl-blue">{team.points}</div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Roster ({team.players.length})</h4>
          <div className="space-y-2">
            {team.players.map((player) => (
              <div key={player.id} className="flex justify-between items-center bg-nfl-dark-gray rounded p-2">
                <div className="flex items-center gap-2">
                  <Badge className="w-8 text-center" variant="secondary">{player.position}</Badge>
                  <span className="font-medium">{player.name}</span>
                </div>
                <span className="text-sm">{player.points} pts</span>
              </div>
            ))}
            
            {team.players.length === 0 && (
              <div className="text-center py-2 text-gray-400">
                No players drafted yet
              </div>
            )}
          </div>
        </div>
        
        {team.eliminated && (
          <Badge variant="destructive" className="mt-4 w-full justify-center">
            Eliminated
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
