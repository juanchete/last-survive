
import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useLeagueStore } from "@/store/leagueStore";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function BreadcrumbNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league");
  
  const leagues = useLeagueStore(state => state.leagues);
  const [currentLeague, setCurrentLeague] = useState<any>(null);
  
  useEffect(() => {
    if (leagueId && leagues.length > 0) {
      const league = leagues.find(l => l.id === leagueId);
      setCurrentLeague(league);
    } else {
      setCurrentLeague(null);
    }
  }, [leagueId, leagues]);
  
  // Define breadcrumb items based on current pathname
  const getBreadcrumbItems = () => {
    const items = [];
    
    // Always start with Home
    items.push({
      label: "Home",
      path: "/",
      icon: <Home className="w-3.5 h-3.5 mr-1" />,
      isCurrent: pathname === "/"
    });
    
    if (pathname.includes("/hub")) {
      items.push({
        label: "League Hub",
        path: "/hub",
        isCurrent: pathname === "/hub"
      });
    }
    
    if (pathname.includes("/browse-leagues")) {
      items.push({
        label: "Browse Leagues",
        path: "/browse-leagues",
        isCurrent: pathname === "/browse-leagues"
      });
    }
    
    if (pathname.includes("/create-league")) {
      items.push({
        label: "Create League",
        path: "/create-league",
        isCurrent: pathname === "/create-league"
      });
    }
    
    // If we have a league context, add it
    if (currentLeague) {
      items.push({
        label: currentLeague.name,
        path: `/dashboard?league=${leagueId}`,
        isCurrent: false
      });
      
      // Add the specific league section
      if (pathname.includes("/dashboard")) {
        items.push({
          label: "Dashboard",
          path: `/dashboard?league=${leagueId}`,
          isCurrent: true
        });
      } else if (pathname.includes("/standings")) {
        items.push({
          label: "Standings",
          path: `/standings?league=${leagueId}`,
          isCurrent: true
        });
      } else if (pathname.includes("/draft")) {
        items.push({
          label: "Draft",
          path: `/draft?league=${leagueId}`,
          isCurrent: true
        });
      }
    }
    
    // Add other sections as needed
    if (pathname === "/how-it-works") {
      items.push({
        label: "How It Works",
        path: "/how-it-works",
        isCurrent: true
      });
    }
    
    return items;
  };
  
  const items = getBreadcrumbItems();
  
  // Don't show breadcrumbs on homepage
  if (pathname === "/") {
    return null;
  }
  
  return (
    <div className="container mx-auto px-6 py-3">
      <Breadcrumb>
        <BreadcrumbList>
          {items.map((item, index) => (
            <BreadcrumbItem key={item.path}>
              {!item.isCurrent ? (
                <>
                  <BreadcrumbLink asChild>
                    <Link 
                      to={item.path} 
                      className="flex items-center text-gray-400 hover:text-white"
                    >
                      {item.icon && item.icon}
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                  {index < items.length - 1 && <BreadcrumbSeparator />}
                </>
              ) : (
                <BreadcrumbPage className="flex items-center text-white font-medium">
                  {item.icon && item.icon}
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
