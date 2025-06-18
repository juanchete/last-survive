
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, CheckCircle } from "lucide-react";
import type { Player } from "@/types";

interface WaiverPlayersTableProps {
  filteredPlayers: Player[];
  loadingPlayers: boolean;
  myWaiverRequests: Array<{ player_id?: number; id: string }>;
  onOpenWaiverModal: (player: Player) => void;
}

export function WaiverPlayersTable({ 
  filteredPlayers, 
  loadingPlayers, 
  myWaiverRequests, 
  onOpenWaiverModal 
}: WaiverPlayersTableProps) {
  const getPositionBadgeColor = (position: string) => {
    const colors = {
      QB: "bg-blue-500/20 text-blue-300 border-blue-400/50",
      RB: "bg-green-500/20 text-green-300 border-green-400/50",
      WR: "bg-purple-500/20 text-purple-300 border-purple-400/50",
      TE: "bg-orange-500/20 text-orange-300 border-orange-400/50",
      K: "bg-yellow-500/20 text-yellow-300 border-yellow-400/50",
      DEF: "bg-red-500/20 text-red-300 border-red-400/50",
    };
    return colors[position as keyof typeof colors] || "bg-gray-500/20 text-gray-300 border-gray-400/50";
  };

  if (loadingPlayers) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin w-8 h-8 text-nfl-blue mx-auto" />
          <p className="text-gray-400 text-lg">Loading available players...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-nfl-dark-gray/50 rounded-xl overflow-hidden border border-nfl-light-gray/10 shadow-inner">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-nfl-light-gray/20 hover:bg-transparent">
            <TableHead className="text-nfl-blue font-bold text-sm uppercase tracking-wide">Player</TableHead>
            <TableHead className="text-nfl-blue font-bold text-center text-sm uppercase tracking-wide">Position</TableHead>
            <TableHead className="text-nfl-blue font-bold text-center text-sm uppercase tracking-wide">Team</TableHead>
            <TableHead className="text-nfl-blue font-bold text-center text-sm uppercase tracking-wide">Points</TableHead>
            <TableHead className="text-nfl-blue font-bold text-center text-sm uppercase tracking-wide">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPlayers.map((player) => (
            <TableRow key={player.id} className="border-b border-nfl-light-gray/5 hover:bg-nfl-blue/5 transition-colors duration-200 group">
              <TableCell className="py-4">
                <div className="flex items-center gap-3">
                  {player.photo && (
                    <img 
                      src={player.photo} 
                      alt={player.name} 
                      className="w-10 h-10 rounded-full object-cover border-2 border-nfl-light-gray/20 group-hover:border-nfl-blue/30 transition-colors"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-white group-hover:text-nfl-blue transition-colors">{player.name}</p>
                    <p className="text-sm text-gray-400">{player.team}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge className={`px-3 py-1 rounded-full text-xs font-medium border ${getPositionBadgeColor(player.position)}`}>
                  {player.position}
                </Badge>
              </TableCell>
              <TableCell className="text-center text-white font-medium">{player.team}</TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-white font-bold">{player.points}</span>
                  <span className="text-gray-400 text-sm">pts</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-nfl-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md transition-all duration-200 hover:scale-105" 
                  onClick={() => onOpenWaiverModal(player)}
                  disabled={myWaiverRequests.some(req => req.player_id?.toString() === player.id)}
                >
                  {myWaiverRequests.some(req => req.player_id?.toString() === player.id) ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Requested
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3 mr-1" />
                      Request
                    </>
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
