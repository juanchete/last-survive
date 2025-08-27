/**
 * LiveScoreBoard Component
 * Shows real-time scores and stats during game days
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  RefreshCw, 
  Play, 
  Pause, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Zap,
  Trophy,
  Target
} from 'lucide-react';
import { useRealtimeStats, useLiveTeamScores, useLiveWeeklyStats } from '@/hooks/useRealtimeStats';
import { cn } from '@/lib/utils';

interface LiveScoreBoardProps {
  leagueId: string;
  week: number;
  season: number;
  autoStart?: boolean;
}

export function LiveScoreBoard({ leagueId, week, season, autoStart = false }: LiveScoreBoardProps) {
  const { status, countdown, startSync, stopSync, forceSync } = useRealtimeStats(autoStart);
  const { data: teamScores = [], isLoading: teamsLoading } = useLiveTeamScores(leagueId, week, season);
  const { data: playerStats = [], isLoading: playersLoading } = useLiveWeeklyStats(leagueId, week, season);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPositionColor = (position: string) => {
    const colors = {
      QB: 'bg-blue-500',
      RB: 'bg-green-500',
      WR: 'bg-yellow-500',
      TE: 'bg-purple-500',
      K: 'bg-cyan-500',
      DEF: 'bg-red-500',
      DP: 'bg-indigo-500',
    };
    return colors[position as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Sync Control Panel */}
      <Card className="border-2 border-nfl-blue/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Score Sync
              </CardTitle>
              <CardDescription>
                Real-time stats update every minute during games
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Next sync in</div>
                <div className="text-2xl font-bold font-mono">{formatTime(countdown)}</div>
              </div>
              <div className="flex gap-2">
                {status.isRunning ? (
                  <Button
                    onClick={stopSync}
                    variant="destructive"
                    size="sm"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    onClick={startSync}
                    variant="default"
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                )}
                <Button
                  onClick={forceSync}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Last sync: {status.lastSyncTime ? 
                    new Date(status.lastSyncTime).toLocaleTimeString() : 
                    'Never'}
                </span>
              </div>
              <Badge variant={status.isGameTime ? 'default' : 'secondary'}>
                {status.isGameTime ? 'Game Time' : 'Off Hours'}
              </Badge>
              <Badge variant={status.isRunning ? 'success' : 'secondary'}>
                <Zap className="h-3 w-3 mr-1" />
                {status.isRunning ? 'Live' : 'Paused'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Scores Tabs */}
      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="teams">Team Scores</TabsTrigger>
          <TabsTrigger value="players">Player Stats</TabsTrigger>
        </TabsList>

        {/* Team Scores Tab */}
        <TabsContent value="teams" className="space-y-4">
          {teamsLoading ? (
            <div className="text-center py-8">Loading team scores...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {teamScores.map((team, index) => (
                <Card key={team.team_id} className={cn(
                  "relative overflow-hidden",
                  index === 0 && "border-yellow-500 border-2"
                )}>
                  {index === 0 && (
                    <div className="absolute top-2 right-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{team.team_name}</span>
                      <span className="text-2xl font-bold">
                        {team.total_points.toFixed(2)}
                      </span>
                    </CardTitle>
                    <CardDescription className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Projected: {team.projected_points.toFixed(2)}
                      </span>
                      <span className={cn(
                        "flex items-center gap-1 font-semibold",
                        team.difference >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {team.difference >= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        {team.difference >= 0 ? '+' : ''}{team.difference.toFixed(2)}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Players Active</span>
                        <span>{team.players_playing}/{team.players_playing + team.players_finished}</span>
                      </div>
                      <Progress 
                        value={(team.players_finished / (team.players_playing + team.players_finished)) * 100} 
                        className="h-2"
                      />
                      {team.is_final && (
                        <Badge variant="secondary" className="w-full justify-center">
                          All Games Final
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Player Stats Tab */}
        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle>Live Player Stats</CardTitle>
              <CardDescription>
                Real-time fantasy points for all rostered players
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {playersLoading ? (
                    <div className="text-center py-8">Loading player stats...</div>
                  ) : (
                    playerStats
                      .sort((a, b) => b.fantasy_points - a.fantasy_points)
                      .map((player) => (
                        <div 
                          key={player.player_id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Badge className={cn(getPositionColor(player.position), "text-white")}>
                              {player.position}
                            </Badge>
                            <div>
                              <div className="font-semibold">{player.player_name}</div>
                              <div className="text-sm text-muted-foreground">{player.team}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-bold text-lg">
                                {player.fantasy_points.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Proj: {player.projected_points.toFixed(2)}
                              </div>
                            </div>
                            <div className={cn(
                              "flex items-center gap-1 text-sm font-semibold min-w-[60px] justify-end",
                              player.difference >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {player.difference >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {player.difference >= 0 ? '+' : ''}{player.difference.toFixed(2)}
                            </div>
                            <Badge 
                              variant={player.is_playing ? "default" : "secondary"}
                              className="min-w-[50px] justify-center"
                            >
                              {player.game_status}
                            </Badge>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}