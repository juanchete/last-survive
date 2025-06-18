
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, CheckCircle, AlertTriangle } from "lucide-react";
import type { Player } from "@/types";

interface WaiverModalsProps {
  // Waiver modal props
  waiverModalOpen: boolean;
  setWaiverModalOpen: (open: boolean) => void;
  waiverPlayer: Player | null;
  waiverDropPlayerId: string;
  setWaiverDropPlayerId: (id: string) => void;
  waiverLoading: boolean;
  rosterLimits?: { needs_drop: boolean };
  currentRoster: Player[];
  onConfirmWaiver: () => void;
  
  // Trade modal props
  tradeModalOpen: boolean;
  setTradeModalOpen: (open: boolean) => void;
  tradeStep: "select" | "confirm";
  setTradeStep: (step: "select" | "confirm") => void;
  tradeTargetTeamId: string;
  setTradeTargetTeamId: (id: string) => void;
  tradeMyPlayerIds: string[];
  setTradeMyPlayerIds: (ids: string[]) => void;
  tradeTargetPlayerIds: string[];
  setTradeTargetPlayerIds: (ids: string[]) => void;
  tradeLoading: boolean;
  activeTeams: Array<{ id: string; name: string }>;
  myActivePlayers: Player[];
  targetActivePlayers: Player[];
  onSendTrade: () => void;
}

export function WaiverModals({
  waiverModalOpen,
  setWaiverModalOpen,
  waiverPlayer,
  waiverDropPlayerId,
  setWaiverDropPlayerId,
  waiverLoading,
  rosterLimits,
  currentRoster,
  onConfirmWaiver,
  tradeModalOpen,
  setTradeModalOpen,
  tradeStep,
  setTradeStep,
  tradeTargetTeamId,
  setTradeTargetTeamId,
  tradeMyPlayerIds,
  setTradeMyPlayerIds,
  tradeTargetPlayerIds,
  setTradeTargetPlayerIds,
  tradeLoading,
  activeTeams,
  myActivePlayers,
  targetActivePlayers,
  onSendTrade,
}: WaiverModalsProps) {
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

  // Get selected players for trade logic
  const mySelectedPlayers = myActivePlayers.filter((p) => tradeMyPlayerIds.includes(p.id));
  const selectedPosition = mySelectedPlayers.length > 0 ? mySelectedPlayers[0].position : null;
  const mySelectablePlayers = selectedPosition
    ? myActivePlayers.filter((p) => p.position === selectedPosition || tradeMyPlayerIds.includes(p.id))
    : myActivePlayers;
  const targetPlayersSamePosition = selectedPosition
    ? targetActivePlayers.filter((p) => p.position === selectedPosition)
    : [];
  const canGoToConfirm =
    !!tradeTargetTeamId &&
    tradeMyPlayerIds.length > 0 &&
    tradeTargetPlayerIds.length === tradeMyPlayerIds.length &&
    selectedPosition !== null;

  return (
    <>
      {/* Waiver Modal */}
      <Dialog open={waiverModalOpen} onOpenChange={setWaiverModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-nfl-blue" />
              Request Waiver
            </DialogTitle>
          </DialogHeader>
          {waiverPlayer && (
            <div className="py-4 space-y-6">
              {/* Player Info Card */}
              <div className="bg-gradient-to-r from-nfl-blue/10 to-blue-600/10 p-4 rounded-xl border border-nfl-blue/20">
                <div className="flex items-center gap-4">
                  {waiverPlayer.photo && (
                    <img 
                      src={waiverPlayer.photo} 
                      alt={waiverPlayer.name} 
                      className="w-16 h-16 rounded-full object-cover border-2 border-nfl-blue/30"
                    />
                  )}
                  <div>
                    <h3 className="font-bold text-white text-lg">{waiverPlayer.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`${getPositionBadgeColor(waiverPlayer.position)} text-xs`}>
                        {waiverPlayer.position}
                      </Badge>
                      <span className="text-gray-400 text-sm">{waiverPlayer.team}</span>
                      <span className="text-nfl-blue font-medium text-sm">{waiverPlayer.points} pts</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster Status */}
              {rosterLimits?.needs_drop && (
                <Alert className="border-orange-400/50 bg-orange-500/10">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  <AlertDescription className="text-orange-200">
                    <strong>Roster Full:</strong> You must select a player to drop to make room.
                  </AlertDescription>
                </Alert>
              )}

              {/* Drop Player Selection */}
              {rosterLimits?.needs_drop && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-white">
                    Select player to drop:
                  </label>
                  <Select value={waiverDropPlayerId} onValueChange={setWaiverDropPlayerId}>
                    <SelectTrigger className="bg-nfl-dark-gray border-nfl-light-gray/30 text-white">
                      <SelectValue placeholder="Choose a player to drop" />
                    </SelectTrigger>
                    <SelectContent className="bg-nfl-dark-gray border-nfl-light-gray/30">
                      {currentRoster
                        .filter(p => p.position === waiverPlayer.position && p.available)
                        .map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center gap-2">
                              <span>{p.name}</span>
                              <Badge className={`${getPositionBadgeColor(p.position)} text-xs`}>
                                {p.position}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <DialogClose asChild>
                  <Button variant="outline" className="border-nfl-light-gray/30 text-gray-300 hover:bg-nfl-light-gray/10">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={onConfirmWaiver}
                  disabled={waiverLoading || (rosterLimits?.needs_drop && !waiverDropPlayerId)}
                  className="bg-gradient-to-r from-nfl-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
                >
                  {waiverLoading ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Trade Modal */}
      <Dialog open={tradeModalOpen} onOpenChange={(open) => {
        setTradeModalOpen(open);
        if (!open) {
          setTradeStep("select");
          setTradeTargetTeamId("");
          setTradeMyPlayerIds([]);
          setTradeTargetPlayerIds([]);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Propose Trade</DialogTitle>
          </DialogHeader>
          {tradeStep === "select" ? (
            <div className="py-2 space-y-4">
              {/* Team selection */}
              <div>
                <label className="block text-gray-300 mb-1">Select team to trade with:</label>
                <select
                  className="w-full p-2 rounded bg-nfl-dark-gray text-white border border-nfl-light-gray/30"
                  value={tradeTargetTeamId}
                  onChange={e => {
                    setTradeTargetTeamId(e.target.value);
                    setTradeMyPlayerIds([]);
                    setTradeTargetPlayerIds([]);
                  }}
                >
                  <option value="">Select team</option>
                  {activeTeams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Player selections */}
              <div>
                <label className="block text-gray-300 mb-1">Select your players to offer (same position):</label>
                <div className="flex flex-wrap gap-2">
                  {mySelectablePlayers.map(player => (
                    <label key={player.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer border ${tradeMyPlayerIds.includes(player.id) ? "bg-nfl-blue/30 border-nfl-blue" : "bg-nfl-dark-gray border-nfl-light-gray/20"}`}>
                      <input
                        type="checkbox"
                        checked={tradeMyPlayerIds.includes(player.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            if (selectedPosition && player.position !== selectedPosition) return;
                            setTradeMyPlayerIds([...tradeMyPlayerIds, player.id]);
                          } else {
                            setTradeMyPlayerIds(tradeMyPlayerIds.filter(id => id !== player.id));
                            setTradeTargetPlayerIds([]);
                          }
                        }}
                        disabled={!!selectedPosition && player.position !== selectedPosition}
                      />
                      <span>{player.name} ({player.position} - {player.team})</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Select players to receive ({tradeMyPlayerIds.length}):</label>
                <div className="flex flex-wrap gap-2">
                  {targetPlayersSamePosition.map(player => (
                    <label key={player.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer border ${tradeTargetPlayerIds.includes(player.id) ? "bg-nfl-blue/30 border-nfl-blue" : "bg-nfl-dark-gray border-nfl-light-gray/20"}`}>
                      <input
                        type="checkbox"
                        checked={tradeTargetPlayerIds.includes(player.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            if (tradeTargetPlayerIds.length < tradeMyPlayerIds.length) {
                              setTradeTargetPlayerIds([...tradeTargetPlayerIds, player.id]);
                            }
                          } else {
                            setTradeTargetPlayerIds(tradeTargetPlayerIds.filter(id => id !== player.id));
                          }
                        }}
                        disabled={
                          !tradeMyPlayerIds.length ||
                          (tradeTargetPlayerIds.length >= tradeMyPlayerIds.length && !tradeTargetPlayerIds.includes(player.id))
                        }
                      />
                      <span>{player.name} ({player.position} - {player.team})</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  disabled={!canGoToConfirm}
                  className="bg-nfl-blue hover:bg-nfl-lightblue"
                  onClick={() => setTradeStep("confirm")}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-2 space-y-4">
              <h3 className="text-lg font-bold text-white mb-2">Confirm Trade Proposal</h3>
              <div className="mb-2">
                <div className="text-gray-300 mb-1">You will offer:</div>
                <ul className="list-disc ml-6 text-white">
                  {mySelectedPlayers.map(player => (
                    <li key={player.id}>{player.name} ({player.position} - {player.team})</li>
                  ))}
                </ul>
              </div>
              <div className="mb-2">
                <div className="text-gray-300 mb-1">You will receive:</div>
                <ul className="list-disc ml-6 text-white">
                  {targetPlayersSamePosition.filter(p => tradeTargetPlayerIds.includes(p.id)).map(player => (
                    <li key={player.id}>{player.name} ({player.position} - {player.team})</li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setTradeStep("select")}>Back</Button>
                <Button className="bg-nfl-blue hover:bg-nfl-lightblue" onClick={onSendTrade} disabled={tradeLoading}>
                  {tradeLoading ? "Enviando..." : "Confirm and Send"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
