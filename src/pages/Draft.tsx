
import { Layout } from "@/components/Layout";
import { useState } from "react";
import { useLeagueStore } from "@/store/leagueStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlayerCard } from "@/components/PlayerCard";
import { WeeklyElimination } from "@/components/WeeklyElimination";
import { Search, Award } from "lucide-react";
import { Player } from "@/types";

export default function Draft() {
  const { availablePlayers, teams, draftPlayer } = useLeagueStore();
  
  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('points');
  
  // User's team (first team for demo)
  const userTeam = teams[0];
  
  // Filter and sort players
  const filteredPlayers = availablePlayers.filter(player => {
    // Only show available players
    if (!player.available) return false;
    
    // Apply position filter
    if (positionFilter !== 'all' && player.position !== positionFilter) return false;
    
    // Apply search filter
    if (searchTerm && !player.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !player.team.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  // Sort players
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (sortBy === 'points') return b.points - a.points;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'position') return a.position.localeCompare(b.position);
    return 0;
  });
  
  // Handle drafting a player
  const handleDraft = (playerId: string) => {
    draftPlayer(playerId, userTeam.id);
  };
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Draft Players</h1>
              <Badge className="bg-nfl-blue">
                {userTeam.players.length} Players on Roster
              </Badge>
            </div>
            
            {/* Filters */}
            <Card className="mb-6 bg-nfl-gray border-nfl-light-gray/20">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="search" className="text-sm text-gray-400 mb-1 block">Search Players</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input 
                        id="search"
                        placeholder="Search by name or team..." 
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="position" className="text-sm text-gray-400 mb-1 block">Position</label>
                    <Select value={positionFilter} onValueChange={setPositionFilter}>
                      <SelectTrigger id="position">
                        <SelectValue placeholder="All Positions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        <SelectItem value="QB">Quarterback (QB)</SelectItem>
                        <SelectItem value="RB">Running Back (RB)</SelectItem>
                        <SelectItem value="WR">Wide Receiver (WR)</SelectItem>
                        <SelectItem value="TE">Tight End (TE)</SelectItem>
                        <SelectItem value="K">Kicker (K)</SelectItem>
                        <SelectItem value="DEF">Defense (DEF)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label htmlFor="sort" className="text-sm text-gray-400 mb-1 block">Sort By</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sort">
                        <SelectValue placeholder="Points (High to Low)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="points">Points (High to Low)</SelectItem>
                        <SelectItem value="name">Name (A-Z)</SelectItem>
                        <SelectItem value="position">Position</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Available Players Grid */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Available Players</h2>
                <Badge variant="outline" className="bg-transparent">
                  {filteredPlayers.length} Players
                </Badge>
              </div>
              
              {filteredPlayers.length > 0 ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {sortedPlayers.map(player => (
                    <PlayerCard 
                      key={player.id} 
                      player={player} 
                      onDraft={handleDraft}
                      showDraftButton={true}
                    />
                  ))}
                </div>
              ) : (
                <Card className="bg-nfl-gray border-nfl-light-gray/20 p-8 text-center">
                  <div className="text-gray-400 mb-2">No players match your search criteria</div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setPositionFilter('all');
                    }}
                  >
                    Reset Filters
                  </Button>
                </Card>
              )}
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:w-80 space-y-8">
            <WeeklyElimination />
            
            {/* Draft Rules */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader className="bg-nfl-dark-gray border-b border-nfl-light-gray/20">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-nfl-blue" />
                  <span>Draft Rules</span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-4">
                <div className="space-y-4 text-sm text-gray-300">
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> You can draft any available player not on an eliminated team.
                  </p>
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> Each week, one NFL team is eliminated, making their players available.
                  </p>
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> Your goal is to accumulate the most points by the end of the season.
                  </p>
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> You can replace underperforming players with newly available ones.
                  </p>
                  <p>
                    <span className="text-nfl-blue font-bold">•</span> If your team has the lowest points at the end of a week, you're eliminated.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
