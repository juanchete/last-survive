import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TeamBattlePlayerCardProps {
  player: {
    player_id: number;
    player_name: string;
    position: string;
    slot: string;
    fantasy_points: number;
    opponent?: string;
    game_time?: string;
    is_playing: boolean;
    projected_points: number;
    team?: string;
    team_logo?: string;
    opponent_logo?: string;
    stats?: {
      receptions?: number;
      receiving_yards?: number;
      receiving_td?: number;
      passing_yards?: number;
      passing_td?: number;
      rushing_yards?: number;
      rushing_td?: number;
      // Defense stats
      sacks?: number;
      interceptions?: number;
      fumbles_recovered?: number;
      defensive_touchdowns?: number;
      points_allowed?: number;
      safeties?: number;
    };
  };
  isDrafted?: boolean;
}

export function TeamBattlePlayerCard({ player, isDrafted = true }: TeamBattlePlayerCardProps) {
  const positionColors: Record<string, string> = {
    QB: "bg-blue-600",
    RB: "bg-green-600",
    WR: "bg-purple-600",
    TE: "bg-orange-600",
    FLEX: "bg-yellow-600",
    K: "bg-cyan-600",
    DEF: "bg-red-600",
    DP: "bg-pink-600"
  };

  const getPositionInitials = (position: string) => {
    return position.slice(0, 2).toUpperCase();
  };

  const formatStats = () => {
    if (!player.stats) return null;
    
    const stats = [];
    
    // Defense stats
    if (player.position === 'DEF' || player.slot === 'DEF') {
      if (player.stats.sacks !== undefined) {
        stats.push(`${player.stats.sacks} sacks`);
      }
      if (player.stats.interceptions !== undefined) {
        stats.push(`${player.stats.interceptions} INT`);
      }
      if (player.stats.fumbles_recovered !== undefined) {
        stats.push(`${player.stats.fumbles_recovered} FR`);
      }
      if (player.stats.defensive_touchdowns !== undefined && player.stats.defensive_touchdowns > 0) {
        stats.push(`${player.stats.defensive_touchdowns} TD`);
      }
      if (player.stats.points_allowed !== undefined) {
        stats.push(`${player.stats.points_allowed} PA`);
      }
    } else {
      // Offensive stats
      if (player.stats.receptions !== undefined && player.stats.receiving_yards !== undefined) {
        stats.push(`${player.stats.receptions} rec, ${player.stats.receiving_yards} yds`);
      }
      if (player.stats.passing_yards !== undefined) {
        stats.push(`${player.stats.passing_yards} pass yds`);
      }
      if (player.stats.rushing_yards !== undefined) {
        stats.push(`${player.stats.rushing_yards} rush yds`);
      }
    }
    
    return stats.join(" • ");
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border transition-all",
        player.is_playing 
          ? "bg-nfl-dark-gray/80 border-nfl-light-gray/20" 
          : "bg-nfl-dark-gray/50 border-nfl-light-gray/10 opacity-75",
        isDrafted && "border-green-500/30 bg-green-900/10"
      )}
    >
      {/* Position Badge */}
      <div className="flex-shrink-0">
        <div 
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold",
            positionColors[player.slot] || "bg-gray-600"
          )}
        >
          {getPositionInitials(player.slot)}
        </div>
      </div>

      {/* Player Info - Fixed width to ensure uniformity */}
      <div className="flex-1 min-w-[140px] max-w-[180px]">
        <div className="flex items-start flex-col gap-1">
          <div className="flex items-center gap-2 w-full">
            <span className="text-sm font-semibold text-white truncate flex-1" title={player.player_name}>
              {player.player_name}
            </span>
            {isDrafted && (
              <Badge 
                variant="outline" 
                className="text-[10px] px-1 py-0 h-4 border-green-500/50 text-green-400 flex-shrink-0"
              >
                Drafted
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-medium text-gray-300">{player.position}</span>
            {player.team_logo && (
              <img 
                src={player.team_logo} 
                alt={player.team || ''} 
                className="h-4 w-4 object-contain"
              />
            )}
            <span>{player.team || 'FA'}</span>
          </div>
          {/* Show stats if available */}
          {formatStats() && (
            <div className="text-xs text-gray-400 mt-1 truncate">
              {formatStats()}
            </div>
          )}
        </div>
      </div>

      {/* Opponent Info */}
      <div className="flex items-center gap-1 flex-shrink-0 min-w-[70px] justify-end">
        {player.opponent ? (
          <>
            <span className="text-xs text-gray-400">vs</span>
            {player.opponent_logo && (
              <img 
                src={player.opponent_logo} 
                alt={player.opponent} 
                className="h-4 w-4 object-contain"
              />
            )}
            <span className="text-xs text-gray-300">{player.opponent}</span>
          </>
        ) : (
          <span className="text-xs text-gray-300">BYE</span>
        )}
      </div>

      {/* Points */}
      <div className="text-right flex-shrink-0 min-w-[60px]">
        <div className="text-xl font-bold text-white">
          {player.fantasy_points.toFixed(1)}
        </div>
        <div className="text-xs text-gray-400">
          Proj: {player.projected_points.toFixed(1)}
        </div>
      </div>
    </div>
  );
}