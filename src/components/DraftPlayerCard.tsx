import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Shield, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player } from "@/types";

interface DraftPlayerCardProps {
  player: Player & {
    matchup?: string;
    status?: "healthy" | "questionable" | "doubtful" | "out" | "bye";
  };
  onDraft?: (playerId: string) => void;
  canDraft?: boolean;
  slot?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function DraftPlayerCard({ 
  player, 
  onDraft, 
  canDraft = false, 
  slot,
  disabled = false,
  disabledReason
}: DraftPlayerCardProps) {
  const positionColors = {
    QB: "bg-nfl-blue",
    RB: "bg-nfl-green", 
    WR: "bg-nfl-yellow",
    TE: "bg-nfl-accent",
    K: "bg-nfl-lightblue",
    DEF: "bg-nfl-red",
    DP: "bg-purple-600"
  };

  const getStatusIcon = () => {
    switch (player.status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "questionable":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "doubtful":
      case "out":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "bye":
        return <Clock className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusBg = () => {
    switch (player.status) {
      case "healthy":
        return "";
      case "questionable":
        return "bg-yellow-500/10";
      case "doubtful":
      case "out":
        return "bg-red-500/10";
      case "bye":
        return "bg-gray-500/10";
      default:
        return "";
    }
  };

  return (
    <Card className={cn(
      "overflow-hidden bg-nfl-gray border-nfl-light-gray/20 transition-all duration-200",
      canDraft && !disabled && "hover:border-nfl-blue/50",
      disabled && "opacity-60"
    )}>
      <CardContent className="p-0">
        <div className={cn("flex flex-col", getStatusBg())}>
          {/* Header with position, team, and points */}
          <div className="bg-nfl-dark-gray p-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge className={cn(positionColors[player.position], "text-white")}>
                {player.position}
              </Badge>
              <span className="text-sm text-gray-400">{player.team}</span>
              {getStatusIcon()}
            </div>
            <div className="text-nfl-blue font-bold">{player.points} PPJ</div>
          </div>
          
          {/* Player info */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-12 w-12 border-2 border-nfl-light-gray/20">
                <AvatarImage src={player.photo} alt={player.name} />
                <AvatarFallback className="bg-nfl-dark-gray">
                  <User className="h-6 w-6 text-gray-400" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{player.name}</h3>
                {player.matchup && (
                  <p className="text-sm text-gray-400">{player.matchup}</p>
                )}
              </div>
            </div>
            
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              {player.stats?.passingYards && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Pass Yards</span>
                  <span className="font-medium">{player.stats.passingYards}</span>
                </div>
              )}
              
              {player.stats?.passingTD && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Pass TD</span>
                  <span className="font-medium">{player.stats.passingTD}</span>
                </div>
              )}
              
              {player.stats?.rushingYards && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Rush Yards</span>
                  <span className="font-medium">{player.stats.rushingYards}</span>
                </div>
              )}
              
              {player.stats?.rushingTD && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Rush TD</span>
                  <span className="font-medium">{player.stats.rushingTD}</span>
                </div>
              )}
              
              {player.stats?.receivingYards && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Rec Yards</span>
                  <span className="font-medium">{player.stats.receivingYards}</span>
                </div>
              )}
              
              {player.stats?.receivingTD && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Rec TD</span>
                  <span className="font-medium">{player.stats.receivingTD}</span>
                </div>
              )}
              
              {player.stats?.fieldGoals && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Field Goals</span>
                  <span className="font-medium">{player.stats.fieldGoals}</span>
                </div>
              )}
              
              {player.stats?.tackles && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Tackles</span>
                  <span className="font-medium">{player.stats.tackles}</span>
                </div>
              )}
              
              {player.stats?.sacks && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Sacks</span>
                  <span className="font-medium">{player.stats.sacks}</span>
                </div>
              )}
              
              {player.stats?.interceptions && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Interceptions</span>
                  <span className="font-medium">{player.stats.interceptions}</span>
                </div>
              )}
            </div>
            
            {/* Draft button or disabled reason */}
            {canDraft && !disabled ? (
              <Button 
                className="w-full bg-nfl-blue hover:bg-nfl-lightblue" 
                onClick={() => onDraft && onDraft(player.id)}
              >
                Draft to {slot}
              </Button>
            ) : disabledReason ? (
              <div className="text-xs text-red-400 text-center p-2 bg-red-500/10 rounded">
                {disabledReason}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}