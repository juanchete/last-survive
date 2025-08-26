
import { Button } from "@/components/ui/button";
import { useLeagueStore } from "@/store/leagueStore";
import { ChevronDown, Menu, Plus, Trophy, Users, Shield } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationsDropdown } from "./NotificationsDropdown";

export function Header() {
  const currentWeek = useLeagueStore(state => state.currentWeek);
  const leagues = useLeagueStore(state => state.leagues);
  const { user, logout, loading } = useAuth();

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user || !user.email) return "U";
    return user.email.substring(0, 1).toUpperCase();
  };

  // Check if user is admin (temporary check, will be replaced when migration is applied)
  const isAdmin = user && (
    user.email?.includes('admin') || 
    user.email === 'juanlopezlmg@gmail.com' || // Cambiar por tu email
    user.email === 'admin@lastsurvive.com'
  );

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-transparent">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center">
          <Link to={ user ? "/hub" : "/"} className="flex items-center">
          Survive The Fantasy
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="hidden md:block">
          <ul className="flex items-center gap-8">
            <li className="group">
              <Link to="/how-it-works" className="text-white font-medium hover:text-nfl-blue transition flex items-center gap-1">
                How It Works
              </Link>
            </li>
            <li className="group">
              <DropdownMenu>
                <DropdownMenuTrigger className="text-white font-medium hover:text-nfl-blue transition flex items-center gap-1 focus:outline-none">
                  My Leagues <ChevronDown className="w-4 h-4 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-nfl-gray border border-nfl-light-gray/20 shadow-lg">
                  <DropdownMenuLabel className="text-white">Your Leagues</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-nfl-light-gray/20" />
                  
                  {leagues.length > 0 ? (
                    leagues.slice(0, 5).map((league) => (
                      <DropdownMenuItem key={league.id} asChild>
                        <Link 
                          to={`/league-dashboard?league=${league.id}`}
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
                      <Users className="w-4 h-4 mr-2 text-nfl-blue" />
                      <span>League Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link to="/browse-leagues" className="flex items-center cursor-pointer hover:bg-nfl-blue/10">
                      <Trophy className="w-4 h-4 mr-2 text-nfl-blue" />
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
              {/* Notifications dropdown */}
              <NotificationsDropdown />
              
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                  <Avatar className="h-9 w-9 border-2 border-nfl-blue transition-all hover:border-white">
                    <AvatarImage src="" alt={user.email || ""} />
                    <AvatarFallback className="bg-nfl-blue text-white">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-nfl-gray border border-nfl-light-gray/20 shadow-lg">
                  <DropdownMenuLabel className="text-white">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-nfl-light-gray/20" />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer hover:bg-nfl-blue/10">
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator className="bg-nfl-light-gray/20" />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="cursor-pointer hover:bg-nfl-blue/10 text-nfl-blue">
                          <Shield className="w-4 h-4 mr-2" />
                          Panel de Administración
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={logout} className="cursor-pointer hover:bg-nfl-blue/10 text-red-400">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/login" className="text-white font-medium hover:text-nfl-blue transition hidden sm:block">
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
