
import { Button } from "@/components/ui/button";
import { useLeagueStore } from "@/store/leagueStore";
import { Award, ChevronDown, Menu } from "lucide-react";
import { Link } from "react-router-dom";

export function Header() {
  const currentWeek = useLeagueStore(state => state.currentWeek);

  return (
    <header className="bg-black sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <Award className="w-10 h-10 text-nfl-gold" />
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="hidden md:block">
          <ul className="flex items-center gap-8">
            <li className="group">
              <Link to="/dashboard" className="text-white font-medium hover:text-nfl-gold transition flex items-center gap-1">
                Products <ChevronDown className="w-4 h-4 opacity-70" />
              </Link>
            </li>
            <li className="group">
              <Link to="/standings" className="text-white font-medium hover:text-[#FFD700] transition flex items-center gap-1">
                Features <ChevronDown className="w-4 h-4 opacity-70" />
              </Link>
            </li>
            <li className="group">
              <Link to="/draft" className="text-white font-medium hover:text-[#FFD700] transition flex items-center gap-1">
                Plans <ChevronDown className="w-4 h-4 opacity-70" />
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="text-white font-medium hover:text-[#FFD700] transition">
                About
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
          <Button className="bg-white text-black hover:bg-gray-100 rounded-full font-medium px-6 py-2 transition-all duration-300 hover:shadow-md">
            Start now
          </Button>
        </div>
      </div>
    </header>
  );
}
