import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Team {
  id: string;
  name: string;
  owner?: string;
}

interface DraftOrderCarouselProps {
  teams: Team[];
  draftOrder: string[];
  currentPick: number;
  userTeamId?: string;
  currentRound: number;
  connectedTeams?: Set<string>; // New prop for tracking connected teams
}

export function DraftOrderCarousel({
  teams,
  draftOrder,
  currentPick,
  userTeamId,
  currentRound,
  connectedTeams = new Set()
}: DraftOrderCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentPickRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current pick
  useEffect(() => {
    if (currentPickRef.current && scrollContainerRef.current) {
      currentPickRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [currentPick]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  if (!draftOrder || draftOrder.length === 0) {
    return (
      <div className="bg-nfl-gray border-b border-nfl-light-gray/20 py-4">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-400">
            Waiting for draft order to be determined...
          </div>
        </div>
      </div>
    );
  }

  // Generate full draft order for multiple rounds (snake draft)
  const fullDraftOrder = [];
  const maxRounds = 10; // Total roster spots (10 players per team)
  
  for (let round = 0; round < maxRounds; round++) {
    const isEvenRound = round % 2 === 0;
    const roundOrder = isEvenRound ? [...draftOrder] : [...draftOrder].reverse();
    
    roundOrder.forEach((teamId, index) => {
      const pickNumber = round * draftOrder.length + index;
      fullDraftOrder.push({
        teamId,
        pickNumber,
        round: round + 1,
        pickInRound: index + 1
      });
    });
  }

  return (
    <div className="bg-nfl-gray border-b border-nfl-light-gray/20 py-4">
      <div className="container mx-auto px-4">
        <div className="relative">
          {/* Scroll buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-nfl-dark-gray/80 hover:bg-nfl-dark-gray"
            onClick={scrollLeft}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-nfl-dark-gray/80 hover:bg-nfl-dark-gray"
            onClick={scrollRight}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>

          {/* Draft order carousel */}
          <div 
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide px-12"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-3 py-2">
              {fullDraftOrder.slice(0, 30).map((pick, index) => {
                const team = teams.find(t => t.id === pick.teamId);
                const isCurrent = index === currentPick;
                const isPast = index < currentPick;
                const isMyTeam = pick.teamId === userTeamId;
                const isConnected = connectedTeams.has(pick.teamId);
                
                return (
                  <div
                    key={`${pick.teamId}-${index}`}
                    ref={isCurrent ? currentPickRef : null}
                    className={cn(
                      "flex flex-col items-center gap-2 min-w-[80px] transition-all relative",
                      isCurrent && "scale-110"
                    )}
                  >
                    {/* Round and Pick Number */}
                    <div className="text-xs text-gray-400">
                      R{pick.round}.{pick.pickInRound}
                    </div>
                    
                    {/* Team Avatar with Online Status */}
                    <div className="relative">
                      <div
                        className={cn(
                          "w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm transition-all",
                          isCurrent && "ring-4 ring-nfl-blue ring-offset-2 ring-offset-nfl-gray",
                          isPast && "opacity-50",
                          isMyTeam && !isCurrent && "ring-2 ring-nfl-green",
                          !isCurrent && !isMyTeam && "bg-nfl-dark-gray border border-nfl-light-gray/20",
                          isCurrent && "bg-nfl-blue text-white shadow-lg shadow-nfl-blue/30"
                        )}
                      >
                        {team?.name?.substring(0, 2).toUpperCase() || "??"}
                      </div>
                      
                      {/* Online Status Indicator */}
                      {!isPast && (
                        <div className={cn(
                          "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                          isConnected ? "bg-green-500" : "bg-gray-600"
                        )}>
                          {isConnected ? (
                            <Wifi className="w-3 h-3 text-white" />
                          ) : (
                            <WifiOff className="w-3 h-3 text-white" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Team Name */}
                    <div className={cn(
                      "text-xs text-center max-w-[80px] truncate",
                      isCurrent ? "text-nfl-blue font-bold" : "text-gray-400",
                      isMyTeam && !isCurrent && "text-nfl-green"
                    )}>
                      {team?.name || "Unknown"}
                    </div>
                    
                    {/* Current Pick Indicator */}
                    {isCurrent && (
                      <div className="absolute -bottom-2 bg-nfl-blue text-white text-xs px-2 py-1 rounded">
                        ON CLOCK
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}