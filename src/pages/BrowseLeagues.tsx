import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { League, LeagueMember } from "@/types";

export default function BrowseLeagues() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [myLeagues, setMyLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [leagueMembers, setLeagueMembers] = useState<LeagueMember[]>([]);

  // Obtener ligas and memberships reales
  useEffect(() => {
    const fetchLeagues = async () => {
      setLoading(true);
      // Obtener todas las ligas
      const { data: allLeagues, error: leaguesError } = await supabase
        .from("leagues")
        .select("id, name, description, image_url, is_private, private_code, owner_id, entry_fee, max_members, status, prize, start_date, created_at, owner:owner_id (email, full_name)");
      if (leaguesError) {
        toast({ title: "Error", description: leaguesError.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      
      // Cast the status field to the correct type 
      const typedLeagues = allLeagues?.map(league => ({
        ...league,
        status: league.status as "active" | "upcoming" | "finished"
      })) || [];
      
      setLeagues(typedLeagues);

      // Obtener todos los miembros de todas las ligas
      const { data: allMembers, error: membersError } = await supabase
        .from("league_members")
        .select("league_id, user_id, role, joined_at, team_id");
      if (membersError) {
        toast({ title: "Error", description: membersError.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      setLeagueMembers(allMembers || []);

      // Obtener ligas where the user is member
      if (user) {
        const myLeagueIds = allMembers?.filter((m) => m.user_id === user.id).map((m) => m.league_id) || [];
        setMyLeagues(typedLeagues.filter((l) => myLeagueIds.includes(l.id)));
      } else {
        setMyLeagues([]);
      }
      setLoading(false);
    };
    fetchLeagues();
    // eslint-disable-next-line
  }, [user]);

  // Filtrar ligas según búsqueda
  const filteredAvailableLeagues = leagues.filter(
    (league) =>
      !myLeagues.some((ml) => ml.id === league.id) &&
      league.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredUserLeagues = myLeagues.filter((league) =>
    league.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenLeagueDetails = (league: League) => {
    setSelectedLeague(league);
    setIsDialogOpen(true);
  };

  // Unirse a una liga real
  const handleJoinLeague = async () => {
    if (!user) {
      toast({ title: "You must log in to join a league", variant: "destructive" });
      return;
    }
    if (selectedLeague?.is_private) {
      setIsDialogOpen(false);
      setIsRequestDialogOpen(true);
    } else {
      // Insertar en league_members
      const { error } = await supabase
        .from("league_members")
        .insert([
          {
            league_id: selectedLeague.id,
            user_id: user.id,
            role: "member",
            joined_at: new Date().toISOString(),
          }
        ]);
      if (error) {
        toast({ title: "Error joining", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "¡You have joined the league!",
          description: `Now you are a member of ${selectedLeague.name}`,
          variant: "default",
        });
        setIsDialogOpen(false);
        // Refrescar ligas
        setLeagues((prev) => prev);
        setMyLeagues((prev) => [...prev, selectedLeague]);
      }
    }
  };

  const handleSendRequest = async () => {
    if (!user || !selectedLeague) {
      toast({ title: "Error", description: "Usuario o liga no encontrados", variant: "destructive" });
      return;
    }

    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', selectedLeague.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        toast({ title: "Error", description: "Ya eres miembro de esta liga", variant: "destructive" });
        return;
      }

      // Check if already has a pending request
      const { data: existingRequest } = await supabase
        .from('league_join_requests')
        .select('*')
        .eq('league_id', selectedLeague.id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        toast({ title: "Info", description: "Ya tienes una solicitud pendiente para esta liga", variant: "default" });
        setIsRequestDialogOpen(false);
        return;
      }

      // Create join request
      const { error: requestError } = await supabase
        .from('league_join_requests')
        .insert({
          league_id: selectedLeague.id,
          user_id: user.id,
          message: requestMessage.trim() || null,
          status: 'pending'
        });

      if (requestError) {
        throw requestError;
      }

      // Send notification to league owner
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: selectedLeague.owner_id,
          league_id: selectedLeague.id,
          message: `${user.user_metadata?.full_name || user.email} ha solicitado unirse a tu liga "${selectedLeague.name}"`,
          type: "info",
        });

      if (notificationError) {
        console.error("Error sending notification:", notificationError);
        // Don't fail the request if notification fails
      }

      toast({
        title: "¡Solicitud enviada!",
        description: `Tu solicitud para unirte a "${selectedLeague.name}" ha sido enviada al administrador.`,
        variant: "default",
      });
      
      setIsRequestDialogOpen(false);
      setRequestMessage("");
      
    } catch (error: any) {
      console.error("Error sending request:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Error al enviar la solicitud", 
        variant: "destructive" 
      });
    }
  };

  // Función para contar miembros de una liga
  const getMemberCount = (leagueId: string) =>
    leagueMembers.filter((m) => m.league_id === leagueId).length;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Explore Leagues</h1>
            <p className="text-gray-400 mt-1">Find and join NFL Survivor leagues</p>
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
            <TabsTrigger value="my-leagues" className="data-[state=active]:bg-nfl-blue data-[state=active]:text-white">My Leagues ({myLeagues.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="available" className="mt-0">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAvailableLeagues.map((league) => (
                <Card key={league.id} className="bg-gradient-to-br from-nfl-gray to-nfl-gray/90 border-nfl-light-gray/20 hover:bg-nfl-gray/70 transition-colors h-full overflow-hidden">
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={league.image_url || "/default-league.png"} 
                      alt={league.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">{league.name}</h3>
                        {league.is_private && (
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
                        <span className="text-gray-300">{getMemberCount(league.id)}/{league.max_members}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-nfl-blue" />
                        <span className="text-gray-300">Starts {new Date(league.start_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-white font-medium">{league.entry_fee}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-nfl-gold" />
                        <span className="text-nfl-gold font-bold">{league.prize}</span>
                      </div>
                    </div>
                    <Badge 
                      className={`mb-4 ${
                        league.status === "active" 
                          ? "bg-green-500/20 text-green-400 border-green-500/30" 
                          : league.status === "upcoming"
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }`}
                    >
                      {league.status === "active" ? "Active" : league.status === "upcoming" ? "Upcoming" : "Finished"}
                    </Badge>
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
                <p className="text-gray-400 text-lg">No leagues found that match your search.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="my-leagues" className="mt-0">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUserLeagues.map((league) => (
                <Card key={league.id} className="bg-gradient-to-br from-nfl-gray to-nfl-gray/90 border-nfl-light-gray/20 hover:bg-nfl-gray/70 transition-colors h-full overflow-hidden">
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={league.image_url || "/default-league.png"} 
                      alt={league.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">{league.name}</h3>
                        {league.owner_id === user?.id && (
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
                        <span className="text-gray-300">{getMemberCount(league.id)}/{league.max_members}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-nfl-blue" />
                        <span className="text-gray-300">Starts {new Date(league.start_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge 
                      className={`mb-4 ${
                        league.status === "active" 
                          ? "bg-green-500/20 text-green-400 border-green-500/30" 
                          : league.status === "upcoming"
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }`}
                    >
                      {league.status === "active" ? "Active" : league.status === "upcoming" ? "Upcoming" : "Finished"}
                    </Badge>
                    <Button 
                      className="w-full bg-nfl-blue hover:bg-nfl-lightblue mt-2" 
                      onClick={() => handleOpenLeagueDetails(league)}
                    >
                      {league.status === "active" ? "Go to Dashboard" : "View Details"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredUserLeagues.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No leagues found that match your search.</p>
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
                  {selectedLeague.is_private && (
                    <Badge variant="outline" className="bg-transparent border-yellow-500/70 text-yellow-400">
                      <Lock className="w-3 h-3 mr-1" /> Private
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-gray-300">
                  Created by {selectedLeague.owner?.full_name || selectedLeague.owner?.email || "Unknown"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="relative h-40 -mx-6 mt-2">
                <img 
                  src={selectedLeague.image_url || "/default-league.png"} 
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
                    <div className="text-lg font-medium">{getMemberCount(selectedLeague.id)}/{selectedLeague.max_members}</div>
                  </div>
                  <div className="bg-nfl-dark-gray/50 p-3 rounded-lg">
                    <div className="text-sm text-gray-400">Start Date</div>
                    <div className="text-lg font-medium">{new Date(selectedLeague.start_date).toLocaleDateString()}</div>
                  </div>
                </div>
                {selectedLeague.entry_fee && (
                  <div className="flex items-center justify-between bg-nfl-dark-gray/50 p-3 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-400">Entry Fee</div>
                      <div className="text-lg font-medium">{selectedLeague.entry_fee}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Prize</div>
                      <div className="text-lg font-bold text-nfl-gold">{selectedLeague.prize}</div>
                    </div>
                  </div>
                )}
                <Badge 
                  className={`mb-4 ${
                    selectedLeague.status === "active" 
                      ? "bg-green-500/20 text-green-400 border-green-500/30" 
                      : selectedLeague.status === "upcoming"
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                  }`}
                >
                  {selectedLeague.status === "active" ? "Active" : selectedLeague.status === "upcoming" ? "Upcoming" : "Finished"}
                </Badge>
              </div>
              
              <DialogFooter>
                {/* Mostrar diferentes botones según si es la liga del usuario o no */}
                {myLeagues.some(league => league.id === selectedLeague.id) ? (
                  <Button asChild className="bg-nfl-blue hover:bg-nfl-lightblue w-full sm:w-auto">
                    <a href={`
                      /league-dashboard?league=${selectedLeague.id}`
                      }>
                      Go to Dashboard
                    </a>
                  </Button>
                ) : (
                  <Button 
                    className="bg-nfl-blue hover:bg-nfl-lightblue w-full sm:w-auto" 
                    onClick={handleJoinLeague}
                  >
                    {selectedLeague.is_private ? "Request Access" : "Join the League"}
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
            <AlertDialogTitle>Request Access to {selectedLeague?.name}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              This is a private league. Your request will be sent to the owner for approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4">
            <label htmlFor="request-message" className="text-sm font-medium text-gray-200 block mb-2">
              Message (optional)
            </label>
            <Input
              id="request-message"
              placeholder="Add a message to the owner of the league..."
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
