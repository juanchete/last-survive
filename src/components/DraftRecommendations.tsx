import { Player } from "@/types";
import { getDraftRecommendations } from "@/lib/draftRecommendations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Star, Target, AlertCircle } from "lucide-react";
import PlayerCard from "./PlayerCard";

interface DraftRecommendationsProps {
  availablePlayers: Player[];
  currentRoster: Array<{ slot: string; position?: string }>;
  roundNumber?: number;
  onDraftPlayer?: (player: Player, slot: string) => void;
  isMyTurn: boolean;
  loadingPick: boolean;
  draftStatus: string;
}

export function DraftRecommendations({
  availablePlayers,
  currentRoster,
  roundNumber = 1,
  onDraftPlayer,
  isMyTurn,
  loadingPick,
  draftStatus
}: DraftRecommendationsProps) {
  const recommendations = getDraftRecommendations(
    availablePlayers,
    currentRoster,
    roundNumber,
    5 // Top 5 recommendations
  );

  if (recommendations.length === 0) {
    return (
      <Card className="bg-nfl-gray/50 border-nfl-light-gray/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Draft Recommendations
          </CardTitle>
          <CardDescription className="text-gray-400">
            No recommendations available
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Target className="h-3 w-3" />;
      case 'medium':
        return <Star className="h-3 w-3" />;
      case 'low':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Card className="bg-nfl-gray/50 border-nfl-light-gray/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-nfl-gold" />
          Recommended Picks
        </CardTitle>
        <CardDescription className="text-gray-400">
          Based on your roster needs and player performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, index) => {
          const canDraft = isMyTurn && 
                          !loadingPick && 
                          draftStatus === 'in_progress';
          
          // Determine which slot this player would fill
          let targetSlot = rec.player.position;
          if (rec.player.position === 'RB' || rec.player.position === 'WR') {
            // Check if primary positions are filled
            const rbCount = currentRoster.filter(r => r.slot === 'RB').length;
            const wrCount = currentRoster.filter(r => r.slot === 'WR').length;
            
            if (rec.player.position === 'RB' && rbCount < 2) {
              targetSlot = 'RB';
            } else if (rec.player.position === 'WR' && wrCount < 2) {
              targetSlot = 'WR';
            } else {
              targetSlot = 'FLEX';
            }
          } else if (['DP', 'LB', 'DB', 'DL'].includes(rec.player.position)) {
            targetSlot = 'DP';
          }
          
          return (
            <div 
              key={rec.player.id} 
              className="flex items-center gap-3 p-3 rounded-lg bg-nfl-dark/50 border border-nfl-light-gray/10 hover:border-nfl-gold/30 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-nfl-gold/20 text-nfl-gold font-bold text-sm">
                {index + 1}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-semibold">{rec.player.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {rec.player.position}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {rec.player.team}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs flex items-center gap-1 ${getPriorityColor(rec.priority)}`}
                  >
                    {getPriorityIcon(rec.priority)}
                    {rec.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400">{rec.reason}</span>
                  <span className="text-nfl-gold font-semibold">
                    Score: {rec.score}
                  </span>
                </div>
              </div>
              
              {onDraftPlayer && (
                <Button
                  size="sm"
                  onClick={() => onDraftPlayer(rec.player, targetSlot)}
                  disabled={!canDraft}
                  className={canDraft 
                    ? "bg-nfl-gold hover:bg-nfl-gold/80 text-black"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }
                >
                  Draft
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}