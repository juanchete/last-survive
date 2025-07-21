import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Tipo para liga
interface League {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  max_members?: number | null;
  status?: string;
}

const Hub = () => {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeagues = async () => {
      setLoading(true);
      if (!user) {
        setLeagues([]);
        setLoading(false);
        return;
      }
      // Obtener las ligas where the user is a member
      const { data: memberRows, error: memberError } = await supabase
        .from("league_members")
        .select("league_id")
        .eq("user_id", user.id);
      if (memberError) {
        setLeagues([]);
        setLoading(false);
        return;
      }
      const leagueIds = memberRows?.map((m) => m.league_id) || [];
      if (leagueIds.length === 0) {
        setLeagues([]);
        setLoading(false);
        return;
      }
      // Obtener los datos de las ligas
      const { data: leaguesData, error: leaguesError } = await supabase
        .from("leagues")
        .select("id, name, description, image_url, max_members, status")
        .in("id", leagueIds);
      if (leaguesError || !Array.isArray(leaguesData)) {
        setLeagues([]);
        setLoading(false);
        return;
      }
      setLeagues(leaguesData);
      setLoading(false);
    };
    fetchLeagues();
  }, [user]);

  return (
    <>
      <Header />
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Leagues</h1>
          <Link to="/create-league">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create League
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-16">Loading leagues...</div>
        ) : leagues.length === 0 ? (
          <div className="text-center py-16 bg-muted/50 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">You have no leagues</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first league or explore existing leagues to join
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/create-league">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create a League
                </Button>
              </Link>
              <Link to="/browse-leagues">
                <Button variant="outline">Explore Leagues</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leagues.map((league) => (
              <div 
                key={league.id} 
                className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              >
                <div 
                  className="h-36 bg-gradient-to-r from-primary/20 to-primary/5 flex items-center justify-center"
                >
                  {league.image_url ? (
                    <img 
                      src={league.image_url} 
                      alt={league.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="text-4xl font-bold text-primary/20">
                      {league.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-xl mb-2">{league.name}</h3>
                  <p className="text-muted-foreground line-clamp-2 mb-4">
                    {league.description || "No description"}
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {league.max_members ? `${league.max_members} max members` : ""}
                    </div>
                    <Link to={`/league-dashboard?league=${league.id}`}>
                      <Button variant="outline" size="sm">
                        View League
                      </Button>
                    </Link>
                  </div>
                  {league.status && (
                    <div className="mt-2 text-xs text-gray-500">Status: {league.status === "active" ? "Active" : league.status === "upcoming" ? "Upcoming" : "Finished"}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Hub;
