import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLeagueStore } from "@/store/leagueStore";
import { Button } from "@/components/ui/button";
import { useWaiverPlayers } from "@/hooks/useWaiverPlayers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Player } from "@/types";

const Waivers = () => {
  const leagueId = useLeagueStore((state) => state.selectedLeagueId);
  const currentWeek = useLeagueStore((state) => state.currentWeek);
  const [waiverOrder, setWaiverOrder] = useState<
    { team_id: string; priority: number; team_name: string }[]
  >([]);
  const [selectedPlayers, setSelectedPlayers] = useState<{
    [teamId: string]: string | null;
  }>({});
  const { data: waiverPlayers, isLoading } = useWaiverPlayers(
    leagueId || "",
    currentWeek
  );

  useEffect(() => {
    const fetchWaiverOrder = async () => {
      if (!leagueId) return;
      const { data, error } = await supabase
        .from("waiver_order")
        .select("*")
        .eq("league_id", leagueId)
        .order("priority", { ascending: true });
      if (error) {
        toast({
          title: "Error fetching waiver order",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      setWaiverOrder(data);
      // Initialize selectedPlayers state
      const initialSelectedPlayers: { [teamId: string]: string | null } = {};
      data.forEach((team) => {
        initialSelectedPlayers[team.team_id] = null;
      });
      setSelectedPlayers(initialSelectedPlayers);
    };

    fetchWaiverOrder();
  }, [leagueId]);

  const handlePlayerSelect = (teamId: string, playerId: string) => {
    setSelectedPlayers((prevSelectedPlayers) => ({
      ...prevSelectedPlayers,
      [teamId]: playerId,
    }));
  };

  const handleSubmitWaivers = async () => {
    if (!leagueId) {
      toast({
        title: "No league selected",
        description: "Please select a league to submit waivers.",
        variant: "destructive",
      });
      return;
    }

    const waiverRequests = waiverOrder.map((team) => {
      const playerId = selectedPlayers[team.team_id];
      return {
        league_id: leagueId,
        team_id: team.team_id,
        player_id: playerId,
        week: currentWeek,
        priority: team.priority,
      };
    });

    // Filter out null player_id values
    const validWaiverRequests = waiverRequests.filter(
      (req) => req.player_id !== null && req.player_id !== undefined
    );

    if (validWaiverRequests.length === 0) {
      toast({
        title: "No players selected",
        description: "Please select at least one player to submit waivers.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("waiver_requests").insert(validWaiverRequests);

    if (error) {
      toast({
        title: "Error submitting waivers",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Waivers submitted",
      description: "Your waiver requests have been submitted.",
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Waivers - Week {currentWeek}</h1>

        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="pb-0">
            <CardTitle className="text-2xl font-semibold text-center">
              Waiver Order
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Table>
              <TableCaption>Waiver order for the current week.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Select Player</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waiverOrder.map((waiver) => (
                  <TableRow key={waiver.team_id}>
                    <TableCell className="font-medium">{waiver.priority}</TableCell>
                    <TableCell>{waiver.team_name}</TableCell>
                    <TableCell>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedPlayers[waiver.team_id] || ""}
                        onChange={(e) =>
                          handlePlayerSelect(waiver.team_id, e.target.value)
                        }
                      >
                        <option value="">Select a player</option>
                        {waiverPlayers?.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name} ({player.position} - {player.team})
                          </option>
                        ))}
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button
              className="mt-4 bg-nfl-blue hover:bg-nfl-blue/90"
              onClick={handleSubmitWaivers}
              disabled={isLoading}
            >
              Submit Waiver Requests
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Waivers;
