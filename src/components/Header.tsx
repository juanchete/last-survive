
import { Button } from "@/components/ui/button";
import { useLeagueStore } from "@/store/leagueStore";
import { Award, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

export function Header() {
  const currentWeek = useLeagueStore(state => state.currentWeek);

  return (
    <header className="bg-nfl-darker border-b border-nfl-light-gray sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            {/* Updated Award icon to new electric blue */}
            <Award className="w-8 h-8" style={{ color: "#1EAEDB" }} />
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#8B5CF6] via-[#1EAEDB] to-[#D946EF]">
              Survivor Fantasy
            </h1>
          </Link>
          <div className="hidden md:block ml-6 h-6 w-[1px] bg-nfl-light-gray/20"></div>
          <div className="hidden md:flex items-center gap-1 ml-6">
            <span className="text-nfl-lightblue font-bold">WEEK</span>
            <span className="text-white font-bold text-lg">{currentWeek}</span>
          </div>
        </div>
        
        <nav>
          <ul className="flex items-center gap-6">
            <li>
              <Link to="/dashboard" className="text-gray-300 hover:text-white transition duration-200">
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/standings" className="text-gray-300 hover:text-white transition duration-200">
                Standings
              </Link>
            </li>
            <li>
              <Link to="/draft" className="text-gray-300 hover:text-white transition duration-200">
                Draft
              </Link>
            </li>
            <li>
              <Button variant="default" className="bg-[#1EAEDB] hover:bg-[#0FA0CE] flex gap-2 items-center">
                <Trophy className="w-4 h-4" />
                <span>My Team</span>
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
