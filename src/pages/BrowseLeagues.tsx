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

  // Obtener ligas y membresías reales
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

      // Obtener ligas donde el usuario es miembro
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
      toast({ title: "Debes iniciar sesión para unirte a una liga", variant: "destructive" });
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
        toast({ title: "Error al unirse", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "¡Te has unido a la liga!",
          description: `Ahora eres miembro de ${selectedLeague.name}`,
          variant: "default",
        });
        setIsDialogOpen(false);
        // Refrescar ligas
        setLeagues((prev) => prev);
        setMyLeagues((prev) => [...prev, selectedLeague]);
      }
    }
  };

  const handleSendRequest = () => {
    // Aquí podrías implementar lógica para enviar una solicitud real al owner
    toast({
      title: "¡Solicitud enviada!",
      description: `Tu solicitud para unirte a ${selectedLeague?.name} ha sido enviada al owner de la liga.`,
      variant: "default",
    });
    setIsRequestDialogOpen(false);
    setRequestMessage("");
  };

  // Función para contar miembros de una liga
  const getMemberCount = (leagueId: string) =>
    leagueMembers.filter((m) => m.league_id === leagueId).length;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Explorar Ligas</h1>
            <p className="text-gray-400 mt-1">Encuentra y únete a ligas NFL Survivor</p>
          </div>
          <div className="mt-4 md:mt-0 relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Buscar ligas..." 
              className="pl-10 bg-nfl-gray/50 border-nfl-light-gray/20 text-white" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="available" className="w-full">
          <TabsList className="bg-nfl-dark-gray/50 border border-nfl-light-gray/20 mb-6">
            <TabsTrigger value="available" className="data-[state=active]:bg-nfl-blue data-[state=active]:text-white">Ligas Disponibles</TabsTrigger>
            <TabsTrigger value="my-leagues" className="data-[state=active]:bg-nfl-blue data-[state=active]:text-white">Mis Ligas ({myLeagues.length})</TabsTrigger>
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
                            <Lock className="w-3 h-3 mr-1" /> Privada
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
                        <span className="text-gray-300">Empieza {new Date(league.start_date).toLocaleDateString()}</span>
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
                      {league.status === "active" ? "Activa" : league.status === "upcoming" ? "Próxima" : "Finalizada"}
                    </Badge>
                    <Button 
                      className="w-full bg-nfl-blue hover:bg-nfl-lightblue mt-2" 
                      onClick={() => handleOpenLeagueDetails(league)}
                    >
                      Ver Detalles
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredAvailableLeagues.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No hay ligas que coincidan con tu búsqueda.</p>
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
                        <span className="text-gray-300">Empieza {new Date(league.start_date).toLocaleDateString()}</span>
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
                      {league.status === "active" ? "Activa" : league.status === "upcoming" ? "Próxima" : "Finalizada"}
                    </Badge>
                    <Button 
                      className="w-full bg-nfl-blue hover:bg-nfl-lightblue mt-2" 
                      onClick={() => handleOpenLeagueDetails(league)}
                    >
                      {league.status === "active" ? "Ir al Dashboard" : "Ver Detalles"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredUserLeagues.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No hay ligas que coincidan con tu búsqueda.</p>
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
                      <Lock className="w-3 h-3 mr-1" /> Privada
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-gray-300">
                  Creada por {selectedLeague.owner?.full_name || selectedLeague.owner?.email || "Desconocido"}
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
                    <div className="text-sm text-gray-400">Miembros</div>
                    <div className="text-lg font-medium">{getMemberCount(selectedLeague.id)}/{selectedLeague.max_members}</div>
                  </div>
                  <div className="bg-nfl-dark-gray/50 p-3 rounded-lg">
                    <div className="text-sm text-gray-400">Fecha de inicio</div>
                    <div className="text-lg font-medium">{new Date(selectedLeague.start_date).toLocaleDateString()}</div>
                  </div>
                </div>
                {selectedLeague.entry_fee && (
                  <div className="flex items-center justify-between bg-nfl-dark-gray/50 p-3 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-400">Costo de entrada</div>
                      <div className="text-lg font-medium">{selectedLeague.entry_fee}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Premio</div>
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
                  {selectedLeague.status === "active" ? "Activa" : selectedLeague.status === "upcoming" ? "Próxima" : "Finalizada"}
                </Badge>
              </div>
              
              <DialogFooter>
                {/* Mostrar diferentes botones según si es la liga del usuario o no */}
                {myLeagues.some(league => league.id === selectedLeague.id) ? (
                  <Button asChild className="bg-nfl-blue hover:bg-nfl-lightblue w-full sm:w-auto">
                    <a href={`/dashboard?league=${selectedLeague.id}`}>
                      Ir al Dashboard
                    </a>
                  </Button>
                ) : (
                  <Button 
                    className="bg-nfl-blue hover:bg-nfl-lightblue w-full sm:w-auto" 
                    onClick={handleJoinLeague}
                  >
                    {selectedLeague.is_private ? "Solicitar acceso" : "Unirse a la liga"}
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
            <AlertDialogTitle>Solicitar acceso a {selectedLeague?.name}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Esta es una liga privada. Tu solicitud será enviada al owner para su aprobación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4">
            <label htmlFor="request-message" className="text-sm font-medium text-gray-200 block mb-2">
              Mensaje (opcional)
            </label>
            <Input
              id="request-message"
              placeholder="Agrega un mensaje para el owner de la liga..."
              className="bg-nfl-dark-gray border-nfl-light-gray/30 text-white"
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-nfl-dark-gray/50">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-nfl-blue hover:bg-nfl-lightblue text-white"
              onClick={handleSendRequest}
            >
              Enviar Solicitud
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
