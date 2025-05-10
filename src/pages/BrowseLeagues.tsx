import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Search, Trophy, Users, ArrowRight, Lock, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data that would come from an API in a real application
const availableLeagues = [
  {
    id: "league-3",
    name: "NFL Fantasy Survival",
    members: 24,
    currentMembers: 18,
    maxMembers: 24,
    entryCost: "$20",
    prize: "$420",
    startDate: "Sep 15, 2025",
    description: "Join our NFL Fantasy Survival league! Last team standing wins the prize pool. Make one team selection each week, but you can't pick the same team twice!",
    isPrivate: false,
    owner: "Michael Thompson",
    image: "/lovable-uploads/be3df809-7452-4bf9-a83f-716f61c69a18.png"
  },
  {
    id: "league-4",
    name: "Nationwide Eliminator",
    members: 64,
    currentMembers: 45,
    maxMembers: 64,
    entryCost: "$50",
    prize: "$2,800",
    startDate: "Sep 20, 2025",
    description: "Our biggest league with participants from all 50 states! Higher stakes, bigger rewards, and intense competition.",
    isPrivate: false,
    owner: "Sarah Johnson",
    image: "/lovable-uploads/d73ff315-86ef-426e-890f-487fda080507.png"
  },
  {
    id: "league-5",
    name: "Weekly Knockout Challenge",
    members: 32,
    currentMembers: 28,
    maxMembers: 32,
    entryCost: "$25",
    prize: "$720",
    startDate: "Sep 25, 2025",
    description: "Each week is a new challenge! Pick winners and survive to the next round. Weekly bonuses for top performers.",
    isPrivate: false,
    owner: "James Wilson",
    image: "/lovable-uploads/733f7192-8cdb-4b98-8f55-0f737f78fdbd.jpg"
  },
  {
    id: "league-6",
    name: "Pro Picks League",
    members: 20,
    currentMembers: 12,
    maxMembers: 20,
    entryCost: "$30",
    prize: "$540",
    startDate: "Sep 10, 2025",
    description: "For serious NFL fans only! Test your football knowledge against our community of experts.",
    isPrivate: true,
    owner: "Robert Davis",
    image: "/lovable-uploads/6a1c877f-509b-4ecd-b63b-4b6d9d397550.png"
  },
  {
    id: "league-7",
    name: "Rookie Friendly Pool",
    members: 16,
    currentMembers: 9,
    maxMembers: 16,
    entryCost: "$10",
    prize: "$140",
    startDate: "Sep 30, 2025",
    description: "Perfect for beginners! Lower stakes and a friendly community to help you learn the ropes of NFL survivor pools.",
    isPrivate: false,
    owner: "Jennifer Miller",
    image: "/lovable-uploads/0c44cd25-0dfc-4563-9eb6-efdb3f54144f.jpg"
  }
];

// Mock data for user leagues
const userLeagues = [
  {
    id: "league-1",
    name: "NFL Survivor League 2025",
    members: 12,
    maxMembers: 16,
    status: "active",
    isOwner: true,
    startDate: "Sep 5, 2025",
    image: "/lovable-uploads/c98f0db9-c234-4e8c-be65-19438a4ac393.png"
  },
  {
    id: "league-2",
    name: "Friends & Family Pool",
    members: 8,
    maxMembers: 12,
    status: "upcoming",
    isOwner: false,
    startDate: "Sep 12, 2025",
    image: "/lovable-uploads/8f7246f9-e9ba-4e0d-ad20-e9cdf227d352.png"
  },
  {
    id: "league-8",
    name: "Office Rivalry",
    members: 15,
    maxMembers: 20,
    status: "active",
    isOwner: false,
    startDate: "Sep 1, 2025",
    image: "/lovable-uploads/733f7192-8cdb-4b98-8f55-0f737f78fdbd.jpg"
  },
  {
    id: "league-9",
    name: "College Buddies",
    members: 10,
    maxMembers: 10,
    status: "active",
    isOwner: true,
    startDate: "Sep 8, 2025",
    image: "/lovable-uploads/be3df809-7452-4bf9-a83f-716f61c69a18.png"
  },
  {
    id: "league-10",
    name: "Fantasy Veterans",
    members: 24,
    maxMembers: 24,
    status: "upcoming",
    isOwner: false,
    startDate: "Sep 18, 2025",
    image: "/lovable-uploads/d73ff315-86ef-426e-890f-487fda080507.png"
  }
];

export default function BrowseLeagues() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  
  // Filter leagues based on search term
  const filteredAvailableLeagues = availableLeagues.filter(league => 
    league.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredUserLeagues = userLeagues.filter(league => 
    league.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenLeagueDetails = (league: any) => {
    setSelectedLeague(league);
    setIsDialogOpen(true);
  };

  const handleJoinLeague = () => {
    if (selectedLeague?.isPrivate) {
      setIsDialogOpen(false);
      setIsRequestDialogOpen(true);
    } else {
      // In a real application, this would make an API call to join the league
      toast({
        title: "Success!",
        description: `You've joined ${selectedLeague?.name}`,
        variant: "default",
      });
      setIsDialogOpen(false);
    }
  };

  const handleSendRequest = () => {
    // In a real application, this would send the request to the league owner
    toast({
      title: "Request sent!",
      description: `Your request to join ${selectedLeague?.name} has been sent to the league owner.`,
      variant: "default",
    });
    setIsRequestDialogOpen(false);
    setRequestMessage("");
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Browse Leagues</h1>
            <p className="text-gray-400 mt-1">Find and join NFL survivor leagues</p>
          </div>
          <div className="mt-4 md:mt-0 relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Search leagues..." 
              className="pl-10 bg-nfl-gray/50 border-nfl-light-gray/20 text-white" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="available" className="w-full">
          <TabsList className="bg-nfl-dark-gray/50 border border-nfl-light-gray/20 mb-6">
            <TabsTrigger value="available" className="data-[state=active]:bg-nfl-blue data-[state=active]:text-white">Available Leagues</TabsTrigger>
            <TabsTrigger value="my-leagues" className="data-[state=active]:bg-nfl-blue data-[state=active]:text-white">My Leagues ({userLeagues.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="available" className="mt-0">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAvailableLeagues.map((league) => (
                <Card key={league.id} className="bg-gradient-to-br from-nfl-gray to-nfl-gray/90 border-nfl-light-gray/20 hover:bg-nfl-gray/70 transition-colors h-full overflow-hidden">
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={league.image} 
                      alt={league.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">{league.name}</h3>
                        {league.isPrivate && (
                          <Badge variant="outline" className="bg-transparent border-yellow-500/70 text-yellow-400">
                            <Lock className="w-3 h-3 mr-1" /> Private
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-nfl-blue" />
                        <span className="text-gray-300">{league.currentMembers}/{league.maxMembers}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-nfl-blue" />
                        <span className="text-gray-300">Starts {league.startDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-white font-medium">{league.entryCost}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-nfl-gold" />
                        <span className="text-nfl-gold font-bold">{league.prize}</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-nfl-blue hover:bg-nfl-lightblue mt-2" 
                      onClick={() => handleOpenLeagueDetails(league)}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredAvailableLeagues.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No leagues match your search criteria.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="my-leagues" className="mt-0">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUserLeagues.map((league) => (
                <Card key={league.id} className="bg-gradient-to-br from-nfl-gray to-nfl-gray/90 border-nfl-light-gray/20 hover:bg-nfl-gray/70 transition-colors h-full overflow-hidden">
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={league.image} 
                      alt={league.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">{league.name}</h3>
                        {league.isOwner && (
                          <Badge className="bg-nfl-dark-gray/50 text-nfl-gold border-nfl-gold">
                            Owner
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-nfl-blue" />
                        <span className="text-gray-300">{league.members}/{league.maxMembers}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-nfl-blue" />
                        <span className="text-gray-300">Starts {league.startDate}</span>
                      </div>
                    </div>
                    <Badge 
                      className={`mb-4 ${
                        league.status === "active" 
                          ? "bg-green-500/20 text-green-400 border-green-500/30" 
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }`}
                    >
                      {league.status === "active" ? "Active" : "Upcoming"}
                    </Badge>
                    <Button 
                      className="w-full bg-nfl-blue hover:bg-nfl-lightblue mt-2" 
                      onClick={() => handleOpenLeagueDetails(league)}
                    >
                      {league.status === "active" ? "View Dashboard" : "View Details"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredUserLeagues.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No leagues match your search criteria.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* League Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-nfl-gray border-nfl-light-gray/30 text-white max-w-xl">
          {selectedLeague && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-2xl font-bold">{selectedLeague.name}</DialogTitle>
                  {selectedLeague.isPrivate && (
                    <Badge variant="outline" className="bg-transparent border-yellow-500/70 text-yellow-400">
                      <Lock className="w-3 h-3 mr-1" /> Private
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-gray-300">
                  Created by {selectedLeague.owner || "Unknown"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="relative h-40 -mx-6 mt-2">
                <img 
                  src={selectedLeague.image} 
                  alt={selectedLeague.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-nfl-gray"></div>
              </div>
              
              <div className="space-y-4 mt-2">
                <p className="text-gray-300">{selectedLeague.description}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-nfl-dark-gray/50 p-3 rounded-lg">
                    <div className="text-sm text-gray-400">Members</div>
                    <div className="text-lg font-medium">{selectedLeague.currentMembers || selectedLeague.members}/{selectedLeague.maxMembers}</div>
                  </div>
                  
                  <div className="bg-nfl-dark-gray/50 p-3 rounded-lg">
                    <div className="text-sm text-gray-400">Start Date</div>
                    <div className="text-lg font-medium">{selectedLeague.startDate}</div>
                  </div>
                </div>
                
                {selectedLeague.entryCost && (
                  <div className="flex items-center justify-between bg-nfl-dark-gray/50 p-3 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-400">Entry Fee</div>
                      <div className="text-lg font-medium">{selectedLeague.entryCost}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Prize Pool</div>
                      <div className="text-lg font-bold text-nfl-gold">{selectedLeague.prize}</div>
                    </div>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                {/* Show different buttons based on if it's the user's league or not */}
                {userLeagues.some(league => league.id === selectedLeague.id) ? (
                  <Button asChild className="bg-nfl-blue hover:bg-nfl-lightblue w-full sm:w-auto">
                    <a href={`/dashboard?league=${selectedLeague.id}`}>
                      Go to Dashboard
                    </a>
                  </Button>
                ) : (
                  <Button 
                    className="bg-nfl-blue hover:bg-nfl-lightblue w-full sm:w-auto" 
                    onClick={handleJoinLeague}
                  >
                    {selectedLeague.isPrivate ? "Request to Join" : "Join League"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Request to Join Private League Dialog */}
      <AlertDialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <AlertDialogContent className="bg-nfl-gray border-nfl-light-gray/30 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Request to join {selectedLeague?.name}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              This is a private league. Your request will be sent to the league owner for approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4">
            <label htmlFor="request-message" className="text-sm font-medium text-gray-200 block mb-2">
              Message (optional)
            </label>
            <Input
              id="request-message"
              placeholder="Add a message to the league owner..."
              className="bg-nfl-dark-gray border-nfl-light-gray/30 text-white"
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-nfl-dark-gray/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-nfl-blue hover:bg-nfl-lightblue text-white"
              onClick={handleSendRequest}
            >
              Send Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
