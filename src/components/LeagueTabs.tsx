import { Link, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutGrid, 
  Trophy, 
  Swords, 
  ArrowLeftRight, 
  FileText, 
  MessageSquare,
  Settings,
  Users,
  UserPlus
} from "lucide-react";

interface LeagueTabsProps {
  leagueId: string;
  activeTab: string;
}

export function LeagueTabs({ leagueId, activeTab }: LeagueTabsProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutGrid, path: `/league-dashboard?league=${leagueId}` },
    { id: "standings", label: "Standings", icon: Trophy, path: `/standings?league=${leagueId}` },
    { id: "team", label: "Team", icon: Users, path: `/team?league=${leagueId}` },
    { id: "draft", label: "Draft", icon: UserPlus, path: `/league/${leagueId}/draft` },
    { id: "team-battle", label: "Team Battle", icon: Swords, path: `/team-battle?league=${leagueId}` },
    { id: "trades", label: "Trades", icon: ArrowLeftRight, path: `/trades?league=${leagueId}` },
    { id: "waivers", label: "Waivers", icon: FileText, path: `/waivers?league=${leagueId}` },
  ];

  return (
    <div className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
      <div className="container mx-auto px-4">
        <Tabs value={activeTab} className="w-full">
          <TabsList className="bg-transparent border-0 h-auto p-0 w-full justify-start space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTab;
              
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={`
                    data-[state=active]:bg-nfl-blue 
                    data-[state=active]:text-white 
                    hover:bg-nfl-light-gray/20
                    rounded-none
                    border-b-2
                    ${isActive ? 'border-nfl-blue' : 'border-transparent'}
                    px-4
                    py-3
                    transition-all
                    cursor-pointer
                  `}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(tab.path);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}