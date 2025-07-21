import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, AlertCircle, XCircle, MinusCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player } from "@/types";

interface WaiverPlayerCardProps {
  player: Player;
  isSelected: boolean;
  onSelect: (playerId: string) => void;
  matchup?: string;
  status?: "healthy" | "questionable" | "doubtful" | "out" | "bye";
}

export function WaiverPlayerCard({ 
  player, 
  isSelected, 
  onSelect,
  matchup,
  status = "healthy"
}: WaiverPlayerCardProps) {
  const positionColors = {
    QB: "bg-nfl-blue",
    RB: "bg-nfl-green",
    WR: "bg-nfl-yellow",
    TE: "bg-nfl-accent",
    K: "bg-nfl-lightblue",
    DEF: "bg-nfl-red"
  };

  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      label: "Healthy"
    },
    questionable: {
      icon: AlertCircle,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      label: "Q"
    },
    doubtful: {
      icon: AlertCircle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      label: "D"
    },
    out: {
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      label: "OUT"
    },
    bye: {
      icon: MinusCircle,
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
      label: "BYE"
    }
  };

  const StatusIcon = statusConfig[status].icon;

  return (
    <Card 
      className={cn(
        "p-3 cursor-pointer transition-all duration-200 border-2",
        isSelected 
          ? "bg-nfl-blue/10 border-nfl-blue ring-2 ring-nfl-blue/30" 
          : "bg-nfl-gray border-nfl-light-gray/20 hover:border-nfl-light-gray/40 hover:bg-nfl-light-gray/10"
      )}
      onClick={() => onSelect(player.id)}
    >
      <div className="flex items-center gap-3">
        {/* Player Photo */}
        <Avatar className="h-16 w-16 border-2 border-nfl-light-gray/20">
          <AvatarImage src={player.photo} alt={player.name} />
          <AvatarFallback className="bg-nfl-dark-gray">
            <User className="h-8 w-8 text-gray-400" />
          </AvatarFallback>
        </Avatar>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white truncate">{player.name}</h4>
            <Badge className={`${positionColors[player.position]} text-white text-xs`}>
              {player.position}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400">{player.team}</span>
            {matchup && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">{matchup}</span>
              </>
            )}
          </div>
        </div>

        {/* Stats and Status */}
        <div className="flex items-center gap-3">
          {/* Points */}
          <div className="text-right">
            <div className="text-xl font-bold text-white">{player.points.toFixed(1)}</div>
            <div className="text-xs text-gray-400">PTS</div>
          </div>

          {/* Status Indicator */}
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full",
            statusConfig[status].bgColor
          )}>
            <StatusIcon className={cn("h-5 w-5", statusConfig[status].color)} />
          </div>
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="mt-2 pt-2 border-t border-nfl-light-gray/20">
          <div className="flex items-center justify-center gap-2 text-sm text-nfl-blue">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Selected</span>
          </div>
        </div>
      )}
    </Card>
  );
}