
import { Card, CardContent } from "@/components/ui/card";
import { Player } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PlayerCardProps {
  player: Player;
  onDraft?: (playerId: string) => void;
  showDraftButton?: boolean;
  buttonText?: string;
}

export function PlayerCard({ player, onDraft, showDraftButton = false, buttonText = "Draft Player" }: PlayerCardProps) {
  const positionColors = {
    QB: "bg-nfl-blue",
    RB: "bg-nfl-green",
    WR: "bg-nfl-yellow",
    TE: "bg-nfl-accent",
    K: "bg-nfl-lightblue",
    DEF: "bg-nfl-red"
  };

  return (
    <Card className="overflow-hidden bg-nfl-gray border-nfl-light-gray/20 hover:border-nfl-blue/50 transition-all duration-200">
      <CardContent className="p-0">
        <div className="flex flex-col">
          <div className="bg-nfl-dark-gray p-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge className={`${positionColors[player.position]} text-white`}>
                {player.position}
              </Badge>
              <span className="text-sm text-gray-400">{player.team}</span>
            </div>
            <div className="text-nfl-blue font-bold">{player.points} PTS</div>
          </div>
          
          <div className="p-4">
            <h3 className="font-bold text-lg mb-2">{player.name}</h3>
            
            <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
              {player.stats?.passingYards && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Pass Yards</span>
                  <span className="font-medium">{player.stats.passingYards}</span>
                </div>
              )}
              
              {player.stats?.passingTD && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Pass TD</span>
                  <span className="font-medium">{player.stats.passingTD}</span>
                </div>
              )}
              
              {player.stats?.rushingYards && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Rush Yards</span>
                  <span className="font-medium">{player.stats.rushingYards}</span>
                </div>
              )}
              
              {player.stats?.rushingTD && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Rush TD</span>
                  <span className="font-medium">{player.stats.rushingTD}</span>
                </div>
              )}
              
              {player.stats?.receivingYards && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Rec Yards</span>
                  <span className="font-medium">{player.stats.receivingYards}</span>
                </div>
              )}
              
              {player.stats?.receivingTD && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Rec TD</span>
                  <span className="font-medium">{player.stats.receivingTD}</span>
                </div>
              )}
              
              {player.stats?.fieldGoals && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Field Goals</span>
                  <span className="font-medium">{player.stats.fieldGoals}</span>
                </div>
              )}
              
              {player.stats?.tackles && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Tackles</span>
                  <span className="font-medium">{player.stats.tackles}</span>
                </div>
              )}
              
              {player.stats?.sacks && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Sacks</span>
                  <span className="font-medium">{player.stats.sacks}</span>
                </div>
              )}
              
              {player.stats?.interceptions && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Interceptions</span>
                  <span className="font-medium">{player.stats.interceptions}</span>
                </div>
              )}
            </div>
            
            {player.eliminated && (
              <Badge variant="destructive" className="mt-4 w-full justify-center">
                Eliminated
              </Badge>
            )}
            
            {showDraftButton && !player.eliminated && (
              <div className="mt-4">
                <Button 
                  className="w-full bg-nfl-blue hover:bg-nfl-lightblue" 
                  onClick={() => onDraft && onDraft(player.id)}
                >
                  {buttonText}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
