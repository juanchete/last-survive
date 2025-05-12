import { useLocation, Link } from "react-router-dom";
import { useLeagueStore } from "@/store/leagueStore";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartBar, ListChecks, Trophy, Users } from "lucide-react";
import { useDraftState } from "@/hooks/useDraftState";

interface LeagueNavProps {
  leagueId: string;
}

export function LeagueNav({ leagueId }: LeagueNavProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { data: draftState } = useDraftState(leagueId);
  
  // Determine which tab is active based on current path
  const getActiveTab = () => {
    if (pathname.includes("/dashboard")) return "dashboard";
    if (pathname.includes("/standings")) return "standings";
    if (pathname.includes("/draft")) return "draft";
    if (pathname.includes("/waivers")) return "waivers";
    if (pathname.includes("/picks")) return "picks";
    return "dashboard"; // Default
  };
  
  return (
    <div className="container mx-auto px-6 mb-6">
      <Tabs value={getActiveTab()} className="w-full">
        <TabsList className="bg-nfl-gray border border-nfl-light-gray/20 w-full flex justify-start overflow-x-auto">
          <TabsTrigger value="dashboard" asChild className="data-[state=active]:bg-nfl-blue data-[state=active]:text-white">
            <Link to={`/dashboard?league=${leagueId}`} className="flex items-center gap-1.5">
              <ChartBar className="w-4 h-4" />
              Dashboard
            </Link>
          </TabsTrigger>
          <TabsTrigger value="standings" asChild className="data-[state=active]:bg-nfl-blue data-[state=active]:text-white">
            <Link to={`/standings?league=${leagueId}`} className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              Standings
            </Link>
          </TabsTrigger>
          {/* Show only Draft if the draft has not finished */}
          {draftState?.draft_status !== "completed" && (
            <TabsTrigger value="draft" asChild className="data-[state=active]:bg-nfl-blue data-[state=active]:text-white">
              <Link to={`/draft?league=${leagueId}`} className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Draft
              </Link>
            </TabsTrigger>
          )}
          {/* Show only Waivers if the draft is finished */}
          {draftState?.draft_status === "completed" && (
            <TabsTrigger value="waivers" asChild className="data-[state=active]:bg-nfl-blue data-[state=active]:text-white">
              <Link to={`/waivers?league=${leagueId}`} className="flex items-center gap-1.5">
                <ListChecks className="w-4 h-4" />
                Waivers
              </Link>
            </TabsTrigger>
          )}
          <TabsTrigger value="picks" asChild className="data-[state=active]:bg-nfl-blue data-[state=active]:text-white">
            <Link to={`/picks?league=${leagueId}`} className="flex items-center gap-1.5">
              <ListChecks className="w-4 h-4" />
              My Picks
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
