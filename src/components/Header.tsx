
import { Button } from "@/components/ui/button";
import { useLeagueStore } from "@/store/leagueStore";
import { ChevronDown, Menu } from "lucide-react";
import { Link } from "react-router-dom";

export function Header() {
  const currentWeek = useLeagueStore(state => state.currentWeek);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-transparent">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <img 
              src="/lovable-uploads/c98f0db9-c234-4e8c-be65-19438a4ac393.png"
              alt="Survive Week Logo"
              className="w-14 h-14 object-contain"
              style={{ minWidth: "56px" }}
            />
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="hidden md:block">
          <ul className="flex items-center gap-8">
            <li className="group">
              <Link to="/how-it-works" className="text-white font-medium hover:text-nfl-gold transition flex items-center gap-1">
                How It Works
              </Link>
            </li>
            <li className="group">
              <Link to="/standings" className="text-white font-medium hover:text-[#FFD700] transition flex items-center gap-1">
                Leaderboard 
              </Link>
            </li>
            <li className="group">
              <Link to="/hub" className="text-white font-medium hover:text-[#FFD700] transition flex items-center gap-1">
                My Leagues <ChevronDown className="w-4 h-4 opacity-70" />
              </Link>
            </li>
          </ul>
        </nav>

        {/* Action Section */}
        <div className="flex items-center gap-6">
          <button className="text-white md:hidden">
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/login" className="text-white font-medium hover:text-nfl-gold transition hidden sm:block">
            Login
          </Link>
          <Link to="/signup">
            <Button className="bg-white text-black hover:bg-gray-100 rounded-full font-medium px-6 py-2 transition-all duration-300 hover:shadow-md">
              Start now
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
