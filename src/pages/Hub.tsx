
import { Layout } from "@/components/Layout";
import { useLeagueStore } from "@/store/leagueStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Plus, Trophy, Users, ArrowRight } from "lucide-react";

export default function Hub() {
  // Fetch data from our store (in a real app, this would come from API)
  const { teams } = useLeagueStore();

  // Mock data for user's leagues and available leagues
  // In a real application, this would come from an API
  const userLeagues = [
    {
      id: "league-1",
      name: "NFL Survivor League 2025",
      members: 12,
      status: "active",
      isOwner: true,
      startDate: "Sep 5, 2025",
      image: "/lovable-uploads/c98f0db9-c234-4e8c-be65-19438a4ac393.png"
    },
    {
      id: "league-2",
      name: "Friends & Family Pool",
      members: 8,
      status: "upcoming",
      isOwner: false,
      startDate: "Sep 12, 2025",
      image: "/lovable-uploads/8f7246f9-e9ba-4e0d-ad20-e9cdf227d352.png"
    }
  ];
  
  const availableLeagues = [
    {
      id: "league-3",
      name: "NFL Fantasy Survival",
      members: 24,
      entryCost: "$20",
      prize: "$420",
      startDate: "Sep 15, 2025",
      image: "/lovable-uploads/be3df809-7452-4bf9-a83f-716f61c69a18.png"
    },
    {
      id: "league-4",
      name: "Nationwide Eliminator",
      members: 64,
      entryCost: "$50",
      prize: "$2,800",
      startDate: "Sep 20, 2025",
      image: "/lovable-uploads/d73ff315-86ef-426e-890f-487fda080507.png"
    },
    {
      id: "league-5",
      name: "Weekly Knockout Challenge",
      members: 32,
      entryCost: "$25",
      prize: "$720",
      startDate: "Sep 25, 2025",
      image: "/lovable-uploads/733f7192-8cdb-4b98-8f55-0f737f78fdbd.jpg"
    }
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Welcome, John</h1>
          <p className="text-gray-400 mt-1">Manage your leagues or join new ones</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - Your Leagues */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white/90">Your Leagues</h2>
                <Button asChild variant="outline" className="border-nfl-blue text-nfl-blue hover:bg-nfl-blue/10">
                  <Link to="/create-league" className="flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Create League
                  </Link>
                </Button>
              </div>
              
              {/* User's Leagues */}
              <div className="space-y-4">
                {userLeagues.map((league) => (
                  <Card key={league.id} className="bg-gradient-to-br from-nfl-gray to-nfl-gray/90 border-nfl-light-gray/20 hover:bg-nfl-gray/70 transition-colors">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row items-start">
                        <div className="h-32 sm:w-36 sm:h-auto overflow-hidden rounded-tl-lg sm:rounded-l-lg">
                          <img 
                            src={league.image} 
                            alt={league.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white">{league.name}</h3>
                                {league.isOwner && (
                                  <Badge variant="outline" className="bg-nfl-dark-gray/50 text-nfl-gold border-nfl-gold">
                                    Owner
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-300">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-nfl-blue" />
                                  <span>{league.members} members</span>
                                </div>
                                <div>Starts {league.startDate}</div>
                              </div>
                              <Badge 
                                className={`mt-3 ${
                                  league.status === "active" 
                                    ? "bg-green-500/20 text-green-400 border-green-500/30" 
                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                }`}
                              >
                                {league.status === "active" ? "Active" : "Upcoming"}
                              </Badge>
                            </div>
                            <div className="w-full sm:w-auto mt-3 sm:mt-0">
                              <Button asChild className="w-full sm:w-auto bg-nfl-blue hover:bg-nfl-lightblue">
                                <Link to={`/dashboard?league=${league.id}`}>
                                  {league.status === "active" ? "View Dashboard" : "View League"}
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Available Leagues to Join */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white/90">Available Leagues</h2>
                <Button asChild variant="link" className="text-nfl-blue p-0">
                  <Link to="/browse-leagues" className="flex items-center gap-1">
                    Browse All <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {availableLeagues.map((league) => (
                  <Card key={league.id} className="bg-gradient-to-br from-nfl-gray to-nfl-gray/90 border-nfl-light-gray/20 hover:bg-nfl-gray/70 transition-colors h-full">
                    <CardContent className="p-0">
                      <div className="relative h-36 overflow-hidden rounded-t-lg">
                        <img 
                          src={league.image} 
                          alt={league.name} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                          <h3 className="text-lg font-bold text-white">{league.name}</h3>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex flex-wrap justify-between mb-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="w-3.5 h-3.5 text-nfl-blue" />
                            <span className="text-gray-300">{league.members} members</span>
                          </div>
                          <div className="text-sm text-gray-300">Starts {league.startDate}</div>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 text-sm">Entry:</span>
                            <span className="text-white font-medium">{league.entryCost}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5 text-nfl-gold" />
                            <span className="text-nfl-gold font-bold">{league.prize}</span>
                          </div>
                        </div>
                        <Button asChild className="w-full bg-nfl-blue hover:bg-nfl-lightblue">
                          <Link to={`/join-league/${league.id}`}>
                            Join League
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-nfl-dark-gray to-nfl-dark-gray/90 border-nfl-light-gray/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full bg-nfl-blue hover:bg-nfl-lightblue">
                  <Link to="/create-league">
                    <Plus className="mr-2 h-4 w-4" /> Create New League
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="w-full bg-nfl-dark-gray hover:bg-nfl-dark-gray/80">
                  <Link to="/browse-leagues">
                    <Users className="mr-2 h-4 w-4" /> Browse Leagues
                  </Link>
                </Button>
              </CardContent>
            </Card>
            
            {/* League Statistics */}
            <Card className="bg-gradient-to-br from-nfl-dark-gray to-nfl-dark-gray/90 border-nfl-light-gray/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Your Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Active Leagues</span>
                    <span className="font-bold text-white">2</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Teams Created</span>
                    <span className="font-bold text-white">1</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Best Ranking</span>
                    <span className="font-bold text-nfl-gold">#3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Total Winnings</span>
                    <span className="font-bold text-nfl-gold">$240</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-nfl-light-gray/20">
                  <Button asChild variant="link" className="w-full text-nfl-blue p-0 justify-start">
                    <Link to="/profile/stats" className="flex items-center">
                      View Full Statistics
                      <ArrowRight className="ml-1 w-3 h-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Schedule */}
            <Card className="bg-gradient-to-br from-nfl-dark-gray to-nfl-dark-gray/90 border-nfl-light-gray/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">This Week's Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {[1, 2, 3, 4, 5].map((game) => (
                    <div 
                      key={game}
                      className="flex items-center justify-between p-3 rounded-md border border-nfl-light-gray/10 bg-nfl-gray/30 hover:bg-nfl-gray/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-nfl-blue/20 rounded-full flex items-center justify-center text-xs font-bold text-nfl-blue">
                          {game}
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">KC vs SF</div>
                          <div className="text-xs text-gray-400">Sun, 4:25 PM</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-transparent text-nfl-blue border-nfl-blue">
                        Upcoming
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-nfl-light-gray/20">
                  <Button asChild variant="link" className="w-full text-nfl-blue p-0 justify-start">
                    <Link to="/schedule" className="flex items-center">
                      View Full Schedule
                      <ArrowRight className="ml-1 w-3 h-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
