import { Badge } from "@/components/ui/badge";
import { Clock, Zap, Calendar } from "lucide-react";
import { useWaiverStatus } from "@/hooks/useWaiverStatus";
import { cn } from "@/lib/utils";

interface WaiverStatusBadgeProps {
  leagueId: string;
  className?: string;
  showDetails?: boolean;
}

export function WaiverStatusBadge({ leagueId, className, showDetails = false }: WaiverStatusBadgeProps) {
  const { data: status, isLoading } = useWaiverStatus(leagueId);

  if (isLoading) {
    return (
      <Badge variant="outline" className={cn("animate-pulse", className)}>
        <Clock className="w-3 h-3 mr-1" />
        Loading...
      </Badge>
    );
  }

  if (!status) return null;

  const isWaiverPeriod = status.is_waiver_period;
  const isFreeAgency = status.is_free_agency;
  
  // Format day names
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const waiverDay = dayNames[status.waiver_day];
  const freeAgencyDay = dayNames[status.free_agency_day];

  if (isWaiverPeriod) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <Badge variant="default" className="bg-orange-500/20 text-orange-500 border-orange-500/30">
          <Clock className="w-3 h-3 mr-1" />
          Waiver Period Active
        </Badge>
        {showDetails && (
          <div className="text-xs text-muted-foreground">
            <p>Waivers process: {waiverDay} at {status.waiver_hour}:00</p>
            <p>Free Agency starts: {freeAgencyDay} at {status.free_agency_hour}:00</p>
            {status.userRequests?.length > 0 && (
              <p className="text-orange-400 mt-1">
                You have {status.userRequests.length} pending waiver request(s)
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (isFreeAgency) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
          <Zap className="w-3 h-3 mr-1" />
          Free Agency Open
        </Badge>
        {showDetails && (
          <div className="text-xs text-muted-foreground">
            <p>First come, first served</p>
            <p>Next waiver period: {waiverDay} at {status.waiver_hour}:00</p>
          </div>
        )}
      </div>
    );
  }

  // Shouldn't happen, but fallback
  return (
    <Badge variant="outline" className={className}>
      <Calendar className="w-3 h-3 mr-1" />
      Roster Locked
    </Badge>
  );
}

import { useAuth } from "@/hooks/useAuth";
import { useWaiverPriority } from "@/hooks/useWaiverStatus";

export function WaiverPriorityList({ leagueId, week }: { leagueId: string; week: number }) {
  const { data: priorities, isLoading } = useWaiverPriority(leagueId, week);
  const { user } = useAuth();

  if (isLoading) return <div className="animate-pulse">Loading priorities...</div>;
  if (!priorities || priorities.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">Waiver Priority Order</h4>
      <div className="space-y-1">
        {priorities.map((item, index) => {
          const isCurrentUser = item.fantasy_teams?.user_id === user?.id;
          return (
            <div
              key={item.fantasy_team_id}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg text-sm",
                isCurrentUser ? "bg-nfl-blue/10 border border-nfl-blue/30" : "bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="min-w-[2rem] justify-center">
                  {index + 1}
                </Badge>
                <span className={cn("font-medium", isCurrentUser && "text-nfl-blue")}>
                  {item.fantasy_teams?.name}
                </span>
                {isCurrentUser && (
                  <Badge variant="outline" className="text-xs border-nfl-blue text-nfl-blue">
                    YOU
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {item.fantasy_teams?.points || 0} pts
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}