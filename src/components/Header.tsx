
import { Button } from "@/components/ui/button";
import { useLeagueStore } from "@/store/leagueStore";
import { ChevronDown, Menu, Plus, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const currentWeek = useLeagueStore(state => state.currentWeek);
  const leagues = useLeagueStore(state => state.leagues);
  const { user, logout, loading } = useAuth();

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
              <DropdownMenu>
                <DropdownMenuTrigger className="text-white font-medium hover:text-[#FFD700] transition flex items-center gap-1 focus:outline-none">
                  My Leagues <ChevronDown className="w-4 h-4 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-nfl-gray border border-nfl-light-gray/20 shadow-lg">
                  <DropdownMenuLabel className="text-white">Your Leagues</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-nfl-light-gray/20" />
                  
                  {leagues.length > 0 ? (
                    leagues.slice(0, 5).map((league) => (
                      <DropdownMenuItem key={league.id} asChild>
                        <Link 
                          to={`/dashboard?league=${league.id}`}
                          className="flex items-center cursor-pointer hover:bg-nfl-blue/10"
                        >
                          <Trophy className="w-4 h-4 mr-2 text-nfl-blue" />
                          <span className="truncate">{league.name}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled className="text-gray-400">
                      No leagues joined yet
                    </DropdownMenuItem>
                  )}
                  
                  {leagues.length > 5 && (
                    <DropdownMenuItem asChild>
                      <Link to="/hub" className="text-nfl-blue">
                        View all leagues
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator className="bg-nfl-light-gray/20" />
                  
                  <DropdownMenuItem asChild>
                    <Link to="/hub" className="flex items-center cursor-pointer hover:bg-nfl-blue/10">
                      <Users className="w-4 h-4 mr-2 text-nfl-gold" />
                      <span>League Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link to="/browse-leagues" className="flex items-center cursor-pointer hover:bg-nfl-blue/10">
                      <Trophy className="w-4 h-4 mr-2 text-nfl-gold" />
                      <span>Browse Leagues</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link to="/create-league" className="flex items-center cursor-pointer hover:bg-nfl-blue/10">
                      <Plus className="w-4 h-4 mr-2 text-nfl-green" />
                      <span>Create New League</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          </ul>
        </nav>

        {/* Action Section */}
        <div className="flex items-center gap-6">
          <button className="text-white md:hidden">
            <Menu className="w-6 h-6" />
          </button>
          {loading ? null : user ? (
            <>
              <span className="text-white font-medium hidden sm:block">{user.email}</span>
              <Button
                variant="outline"
                className="border-white text-white hover:bg-nfl-blue/10"
                onClick={logout}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-white font-medium hover:text-nfl-gold transition hidden sm:block">
                Login
              </Link>
              <Link to="/signup">
                <Button className="bg-white text-black hover:bg-gray-100 rounded-full font-medium px-6 py-2 transition-all duration-300 hover:shadow-md">
                  Start now
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
