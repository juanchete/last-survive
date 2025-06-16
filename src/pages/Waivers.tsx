import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { LeagueNav } from "@/components/LeagueNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWaiverPlayers } from "@/hooks/useWaiverPlayers";
import { useWaiverPriority } from "@/hooks/useWaiverPriority";
import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";
import { useMyWaiverRequests } from "@/hooks/useMyWaiverRequests";
import { useRosterWithPlayerDetails } from "@/hooks/useRosterWithPlayerDetails";
import { useRosterLimits } from "@/hooks/useRosterLimits";
import { requestWaiver } from "@/lib/draft";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Clock, AlertTriangle, CheckCircle, Users, Search, Plus } from "lucide-react";
import { useLocation } from "react-router-dom";
import type { Player } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

const Waivers = () => {
  // Obtener el leagueId desde la URL
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "default";
  const currentWeek = 1; // Reemplaza por tu lógica real

  // Data hooks
  const { data: userTeam } = useUserFantasyTeam(leagueId);
  const { data: waiverPlayers = [], isLoading: loadingPlayers } = useWaiverPlayers(leagueId, currentWeek);
  const { data: waiverPriority = [], isLoading: loadingPriority } = useWaiverPriority(leagueId, currentWeek);
  const { data: myWaiverRequests = [], isLoading: loadingRequests, refetch } = useMyWaiverRequests(leagueId, currentWeek, userTeam?.id || "");
  const { data: currentRoster = [], isLoading: loadingRoster } = useRosterWithPlayerDetails(userTeam?.id || "", currentWeek);

  // Form state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [selectedDropPlayerId, setSelectedDropPlayerId] = useState<string>("");
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");

  // Get player position for roster limits
  const selectedPlayer = waiverPlayers.find(p => p.id === selectedPlayerId);
  const { data: rosterLimits } = useRosterLimits(
    userTeam?.id || "",
    currentWeek,
    selectedPlayer?.position || ""
  );

  // Filter players based on search and position
  const filteredPlayers = waiverPlayers.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.team.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = positionFilter === "ALL" || player.position === positionFilter;
    return matchesSearch && matchesPosition;
  });

  const handleRequest = async () => {
    if (!selectedPlayerId || !userTeam) return;

    // Validation
    if (rosterLimits?.needs_drop && !selectedDropPlayerId) {
      toast({
        title: "Jugador requerido para soltar",
        description: "Tu roster está lleno. Debes seleccionar un jugador para soltar.",
        variant: "destructive",
      });
      return;
    }

    setLoadingRequest(true);
    try {
      await requestWaiver({
        leagueId,
        week: currentWeek,
        fantasyTeamId: userTeam.id,
        playerId: Number(selectedPlayerId),
        dropPlayerId: selectedDropPlayerId ? Number(selectedDropPlayerId) : undefined,
      });
      
      toast({ 
        title: "Solicitud enviada", 
        description: selectedDropPlayerId 
          ? "Tu waiver con drop fue registrada." 
          : "Tu waiver fue registrada." 
      });
      
      setSelectedPlayerId("");
      setSelectedDropPlayerId("");
      refetch();
    } catch (e: unknown) {
      let message = "Unknown error";
      if (e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string") {
        message = (e as { message: string }).message;
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoadingRequest(false);
    }
  };

  const alreadyRequested = myWaiverRequests.some(req => req.player_id?.toString() === selectedPlayerId);

  // Filter active roster players for drop selection
  const activeRosterPlayers = currentRoster.filter(player => player.available !== undefined);

  const getPositionBadgeColor = (position: string) => {
    const colors = {
      QB: "bg-blue-100 text-blue-800 border-blue-300",
      RB: "bg-green-100 text-green-800 border-green-300",
      WR: "bg-purple-100 text-purple-800 border-purple-300",
      TE: "bg-orange-100 text-orange-800 border-orange-300",
      K: "bg-yellow-100 text-yellow-800 border-yellow-300",
      DEF: "bg-red-100 text-red-800 border-red-300",
    };
    return colors[position as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  // Estado para modal de trade
  const [tradeModalOpen, setTradeModalOpen] = useState(false);

  // Estado para modal de waiver
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);
  const [waiverPlayer, setWaiverPlayer] = useState<Player | null>(null);
  const [waiverDropPlayerId, setWaiverDropPlayerId] = useState<string>("");
  const [waiverLoading, setWaiverLoading] = useState(false);

  // Handler para abrir el modal de waiver
  const handleOpenWaiverModal = (player: Player) => {
    setWaiverPlayer(player);
    setWaiverDropPlayerId("");
    setWaiverModalOpen(true);
  };

  // Handler para enviar la solicitud de waiver
  const handleConfirmWaiver = async () => {
    if (!waiverPlayer || !userTeam) return;
    if (rosterLimits?.needs_drop && !waiverDropPlayerId) return;
    setWaiverLoading(true);
    try {
      await requestWaiver({
        leagueId,
        week: currentWeek,
        fantasyTeamId: userTeam.id,
        playerId: Number(waiverPlayer.id),
        dropPlayerId: waiverDropPlayerId ? Number(waiverDropPlayerId) : undefined,
      });
      toast({ title: "Solicitud enviada", description: "Tu waiver fue registrada." });
      setWaiverModalOpen(false);
      setWaiverPlayer(null);
      setWaiverDropPlayerId("");
      refetch();
    } catch (e: unknown) {
      let message = "Unknown error";
      if (e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string") {
        message = (e as { message: string }).message;
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setWaiverLoading(false);
    }
  };

  return (
    <Layout>
      <LeagueNav leagueId={leagueId} />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-nfl-blue" />
            <h1 className="text-3xl font-bold text-white">Waivers - Week {currentWeek}</h1>
          </div>
          <Badge variant="outline" className="bg-nfl-blue/20 text-nfl-blue border-nfl-blue/30">
            <Clock className="w-4 h-4 mr-2" />
            Tuesday 11:00 PM Deadline
          </Badge>
        </div>

        {/* Botón para abrir modal de trade */}
        <div className="mb-6 flex justify-end">
          <Dialog open={tradeModalOpen} onOpenChange={setTradeModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-nfl-blue hover:bg-nfl-lightblue" onClick={() => setTradeModalOpen(true)}>
                Propose Trade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Propose Trade</DialogTitle>
              </DialogHeader>
              {/* Aquí irá el formulario de selección de equipo y jugadores */}
              <div className="py-4">
                <p className="text-gray-400 mb-2">Select the team you want to trade with and the players involved.</p>
                {/* TODO: Formulario de selección de equipo y jugadores */}
                <div className="bg-nfl-dark-gray rounded-lg p-4 text-center text-gray-500">
                  (Coming Soon: Trade Form)
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button disabled>Propose Trade</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main content - Available Players */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search and Filters */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white">Available Players</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by name or team..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-nfl-dark-gray border-nfl-light-gray/30 text-white"
                    />
                  </div>
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-32 bg-nfl-dark-gray border-nfl-light-gray/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-nfl-dark-gray border-nfl-light-gray/30">
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="QB">QB</SelectItem>
                      <SelectItem value="RB">RB</SelectItem>
                      <SelectItem value="WR">WR</SelectItem>
                      <SelectItem value="TE">TE</SelectItem>
                      <SelectItem value="K">K</SelectItem>
                      <SelectItem value="DEF">DEF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Players Table */}
                {loadingPlayers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
                    <span className="ml-2 text-gray-400">Loading players...</span>
                  </div>
                ) : (
                  <div className="bg-nfl-dark-gray rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-nfl-light-gray/20 hover:bg-transparent">
                          <TableHead className="text-nfl-blue font-bold w-12"></TableHead>
                          <TableHead className="text-nfl-blue font-bold">Player</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center">Position</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center">Team</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center">Points</TableHead>
                          <TableHead className="text-nfl-blue font-bold text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlayers.map((player) => (
                          <TableRow key={player.id} className="border-b border-nfl-light-gray/10 hover:bg-nfl-gray/30">
                            <TableCell></TableCell>
                            <TableCell className="font-semibold text-white">{player.name}</TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2 py-1 rounded text-xs border ${getPositionBadgeColor(player.position)}`}>{player.position}</span>
                            </TableCell>
                            <TableCell className="text-center">{player.team}</TableCell>
                            <TableCell className="text-center">{player.points}</TableCell>
                            <TableCell className="text-center">
                              <Button size="sm" className="bg-nfl-blue hover:bg-nfl-lightblue" onClick={() => handleOpenWaiverModal(player)}>
                                Request
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Waiver Request Form */}
            {selectedPlayerId && (
              <Card className="bg-nfl-gray border-nfl-light-gray/20">
                <CardHeader>
                  <CardTitle className="text-white">Request Waiver</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Selected Player Info */}
                  <div className="bg-nfl-dark-gray p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">Selected Player:</h4>
                    <div className="flex items-center gap-3">
                      {selectedPlayer?.photo && (
                        <img 
                          src={selectedPlayer.photo} 
                          alt={selectedPlayer.name} 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <p className="font-bold text-white">{selectedPlayer?.name}</p>
                        <p className="text-sm text-gray-400">
                          {selectedPlayer?.position} - {selectedPlayer?.team} | {selectedPlayer?.points} pts
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Roster Status Alert */}
                  {rosterLimits && (
                    <Alert className={rosterLimits.needs_drop ? "border-orange-500 bg-orange-50" : "border-green-500 bg-green-50"}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="text-sm">
                          <strong>Roster Status:</strong> {rosterLimits.current_roster_count}/{rosterLimits.max_roster_size} players
                          {rosterLimits.needs_drop && (
                            <span className="text-orange-700 block mt-1">
                              ⚠️ Roster full - You must select a player to drop
                            </span>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Drop Player Selection */}
                  {rosterLimits?.needs_drop && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-orange-700">
                        Player to drop (required):
                      </label>
                      <Select value={selectedDropPlayerId} onValueChange={setSelectedDropPlayerId}>
                        <SelectTrigger className="bg-nfl-dark-gray border-orange-300 text-white">
                          <SelectValue placeholder="Select player to drop" />
                        </SelectTrigger>
                        <SelectContent className="bg-nfl-dark-gray border-nfl-light-gray/30">
                          {activeRosterPlayers.map(player => (
                            <SelectItem key={player.id} value={player.id}>
                              {player.name} ({player.position} - {player.team}) | {player.points} pts
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRequest}
                      disabled={
                        !selectedPlayerId || 
                        alreadyRequested || 
                        loadingRequest ||
                        (rosterLimits?.needs_drop && !selectedDropPlayerId)
                      }
                      className="bg-nfl-blue hover:bg-nfl-lightblue"
                    >
                      {loadingRequest ? (
                        <>
                          <Loader2 className="animate-spin w-4 h-4 mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Submit Waiver
                          {selectedDropPlayerId && " (with Drop)"}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedPlayerId("");
                        setSelectedDropPlayerId("");
                      }}
                      className="border-nfl-light-gray/30 text-gray-300 hover:bg-nfl-light-gray/10"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Waiver Priority */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white">Waiver Priority</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPriority ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="animate-spin w-4 h-4" /> Loading...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {waiverPriority.map((wp, idx) => (
                      <div key={wp.fantasy_team_id} className="flex items-center gap-3 p-2 rounded">
                        <Badge 
                          variant={userTeam?.id === wp.fantasy_team_id ? "default" : "outline"}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            userTeam?.id === wp.fantasy_team_id ? "bg-nfl-blue text-white" : "bg-gray-100"
                          }`}
                        >
                          {idx + 1}
                        </Badge>
                        <span className={`text-sm ${
                          userTeam?.id === wp.fantasy_team_id ? "font-bold text-nfl-blue" : "text-gray-300"
                        }`}>
                          Team {wp.fantasy_team_id?.slice(0, 8)}
                          {userTeam?.id === wp.fantasy_team_id && " (You)"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Requests */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white">My Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRequests ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="animate-spin w-4 h-4" /> Loading...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myWaiverRequests.length === 0 && (
                      <div className="text-gray-400 text-center py-4 text-sm">
                        No requests this week.
                      </div>
                    )}
                    {myWaiverRequests.map(req => (
                      <div key={req.id} className="bg-nfl-dark-gray p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-white text-sm">
                            {waiverPlayers.find(p => p.id === req.player_id?.toString())?.name || `Player ${req.player_id}`}
                          </span>
                          <Badge className={
                            req.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                            req.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                            'bg-red-100 text-red-800 border-red-300'
                          }>
                            {req.status === 'pending' ? 'Pending' :
                             req.status === 'approved' ? 'Approved' : 'Rejected'}
                          </Badge>
                        </div>
                        {req.drop_player_id && (
                          <span className="text-xs text-gray-400">
                            Drop: {activeRosterPlayers.find(p => p.id === req.drop_player_id?.toString())?.name || `Player ${req.drop_player_id}`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal de solicitud de waiver */}
        <Dialog open={waiverModalOpen} onOpenChange={setWaiverModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Waiver</DialogTitle>
            </DialogHeader>
            {waiverPlayer && (
              <div className="py-2">
                <div className="mb-2 text-gray-300">
                  <span className="font-bold">{waiverPlayer.name}</span> ({waiverPlayer.position} - {waiverPlayer.team})
                </div>
                {rosterLimits?.needs_drop ? (
                  <div className="mb-4">
                    <p className="text-gray-400 mb-2">Your roster is full. Select a player to drop:</p>
                    <select
                      className="w-full p-2 rounded bg-nfl-dark-gray text-white border border-nfl-light-gray/30"
                      value={waiverDropPlayerId}
                      onChange={e => setWaiverDropPlayerId(e.target.value)}
                    >
                      <option value="">Select player to drop</option>
                      {currentRoster
                        .filter(p => p.position === waiverPlayer.position && p.available)
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                        ))}
                    </select>
                  </div>
                ) : null}
                <div className="flex justify-end gap-2 mt-4">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={handleConfirmWaiver}
                    disabled={waiverLoading || (rosterLimits?.needs_drop && !waiverDropPlayerId)}
                    className="bg-nfl-blue hover:bg-nfl-lightblue"
                  >
                    {waiverLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                    Confirm Request
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Waivers;
