import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  PlayCircle, Calendar, Users, Trophy, FastForward, 
  RotateCcw, AlertTriangle, CheckCircle, Clock,
  Database, Zap, Settings, ChevronRight, Skull
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { seasonSimulator } from "@/utils/testing/seasonSimulator";
import { testDataSeeder } from "@/utils/testing/testDataSeeder";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SimulationStatus {
  isSimulating: boolean;
  currentWeek: number;
  totalWeeks: number;
  message: string;
}

export default function TestingDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [simulationMode, setSimulationMode] = useState(true);
  const [currentSimWeek, setCurrentSimWeek] = useState(1);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus>({
    isSimulating: false,
    currentWeek: 0,
    totalWeeks: 0,
    message: ""
  });
  const [seedConfig, setSeedConfig] = useState({
    leagueName: "Test Championship 2023",
    numberOfTeams: 8,
    simulateWeeks: 0
  });

  // Get all leagues for selection
  const { data: availableLeagues } = useQuery({
    queryKey: ["availableLeagues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select("id, name, status, created_at, owner_id")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Get current season status
  const { data: seasonStatus } = useQuery({
    queryKey: ["seasonStatus", selectedLeagueId],
    queryFn: async () => {
      // Get current week for selected league
      let currentWeekQuery = supabase
        .from("weeks")
        .select("*")
        .eq("status", "active");
      
      if (selectedLeagueId) {
        currentWeekQuery = currentWeekQuery.eq("league_id", selectedLeagueId);
      }
      
      const { data: currentWeek } = await currentWeekQuery.single();
      
      // Get league-specific data
      let leaguesQuery = supabase
        .from("leagues")
        .select("id, name, status");
      
      if (selectedLeagueId) {
        leaguesQuery = leaguesQuery.eq("id", selectedLeagueId);
      } else {
        leaguesQuery = leaguesQuery.eq("status", "active");
      }
      
      const { data: leagues } = await leaguesQuery;
      
      // Get teams for selected league
      let teamsQuery = supabase
        .from("fantasy_teams")
        .select("id")
        .eq("is_eliminated", false);
      
      if (selectedLeagueId) {
        teamsQuery = teamsQuery.eq("league_id", selectedLeagueId);
      }
      
      const { data: teams } = await teamsQuery;
      
      return {
        currentWeek: currentWeek?.number || 1,
        activeLeagues: leagues?.length || 0,
        activeTeams: teams?.length || 0
      };
    },
    enabled: true
  });

  // Seed test data mutation
  const seedDataMutation = useMutation({
    mutationFn: async () => {
      setSimulationStatus({
        isSimulating: true,
        currentWeek: 0,
        totalWeeks: seedConfig.simulateWeeks,
        message: "Creating test data..."
      });

      const result = await testDataSeeder.seedTestData({
        createUsers: true,
        createLeague: true,
        createFantasyTeams: true,
        populateRosters: true,
        simulateWeeks: seedConfig.simulateWeeks,
        leagueName: seedConfig.leagueName,
        numberOfTeams: seedConfig.numberOfTeams
      });

      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Test Data Created",
        description: `Created league "${seedConfig.leagueName}" with ${seedConfig.numberOfTeams} teams`,
      });
      queryClient.invalidateQueries({ queryKey: ["seasonStatus"] });
      setSimulationStatus({
        isSimulating: false,
        currentWeek: 0,
        totalWeeks: 0,
        message: ""
      });
    },
    onError: (error) => {
      toast({
        title: "Error Creating Test Data",
        description: error.message,
        variant: "destructive"
      });
      setSimulationStatus({
        isSimulating: false,
        currentWeek: 0,
        totalWeeks: 0,
        message: ""
      });
    }
  });

  // Advance week mutation
  const advanceWeekMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLeagueId) {
        throw new Error("Please select a league first");
      }
      
      // Update current week in database
      const nextWeek = currentSimWeek + 1;
      
      // Deactivate current week for the selected league
      await supabase
        .from("weeks")
        .update({ status: "completed" })
        .eq("number", currentSimWeek)
        .eq("league_id", selectedLeagueId);
      
      // Activate next week for the selected league
      await supabase
        .from("weeks")
        .update({ status: "active" })
        .eq("number", nextWeek)
        .eq("league_id", selectedLeagueId);
      
      // Generate and insert player stats for the week
      const weeklyStats = seasonSimulator.generateWeeklyStats(nextWeek);
      
      // Get players in this league to generate stats for them
      const { data: leaguePlayers } = await supabase
        .from("team_rosters")
        .select("player_id")
        .eq("week", nextWeek)
        .in("fantasy_team_id", 
          await supabase
            .from("fantasy_teams")
            .select("id")
            .eq("league_id", selectedLeagueId)
            .then(res => res.data?.map(t => t.id) || [])
        );
      
      if (leaguePlayers) {
        const statsToInsert = leaguePlayers.map(({ player_id }) => {
          const stat = weeklyStats.find(s => s.playerId === player_id) || 
                       weeklyStats[Math.floor(Math.random() * weeklyStats.length)];
          return {
            player_id,
            week: nextWeek,
            season: 2024,
            fantasy_points: stat.fantasyPoints,
            passing_yards: stat.passingYards || 0,
            passing_touchdowns: stat.passingTD || 0,
            rushing_yards: stat.rushingYards || 0,
            rushing_touchdowns: stat.rushingTD || 0,
            receiving_yards: stat.receivingYards || 0,
            receiving_touchdowns: stat.receivingTD || 0
          };
        });
        
        await supabase
          .from("player_stats")
          .insert(statsToInsert);
      }
      
      // Process eliminations for this league
      await supabase.rpc("process_weekly_elimination", { 
        p_week: currentSimWeek,
        p_season: 2024,
        p_league_id: selectedLeagueId
      });
      
      return nextWeek;
    },
    onSuccess: (nextWeek) => {
      setCurrentSimWeek(nextWeek);
      seasonSimulator.setWeek(nextWeek);
      toast({
        title: "Week Advanced",
        description: `Now in week ${nextWeek}. Eliminations processed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["seasonStatus"] });
    },
    onError: (error) => {
      toast({
        title: "Error Advancing Week",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Quick simulation mutation
  const quickSimMutation = useMutation({
    mutationFn: async (weeks: number) => {
      for (let i = 0; i < weeks; i++) {
        setSimulationStatus({
          isSimulating: true,
          currentWeek: i + 1,
          totalWeeks: weeks,
          message: `Simulating week ${currentSimWeek + i}...`
        });
        
        await advanceWeekMutation.mutateAsync();
        
        // Small delay between weeks
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    },
    onSuccess: () => {
      toast({
        title: "Simulation Complete",
        description: "Season simulation completed successfully",
      });
      setSimulationStatus({
        isSimulating: false,
        currentWeek: 0,
        totalWeeks: 0,
        message: ""
      });
    }
  });

  // Reset season mutation
  const resetSeasonMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLeagueId) {
        throw new Error("Please select a league first");
      }
      
      // Reset all weeks for the selected league
      await supabase
        .from("weeks")
        .update({ status: "upcoming" })
        .eq("league_id", selectedLeagueId)
        .neq("number", 1);
      
      await supabase
        .from("weeks")
        .update({ status: "active" })
        .eq("league_id", selectedLeagueId)
        .eq("number", 1);
      
      // Get teams in this league to clear their stats
      const { data: leagueTeams } = await supabase
        .from("fantasy_teams")
        .select("id")
        .eq("league_id", selectedLeagueId);
      
      if (leagueTeams) {
        // Clear player stats for this league's teams
        const { data: leaguePlayers } = await supabase
          .from("team_rosters")
          .select("player_id")
          .in("fantasy_team_id", leagueTeams.map(t => t.id));
        
        if (leaguePlayers) {
          await supabase
            .from("player_stats")
            .delete()
            .in("player_id", leaguePlayers.map(p => p.player_id))
            .gte("week", 1);
        }
        
        // Reset eliminations for this league
        await supabase
          .from("fantasy_teams")
          .update({ 
            is_eliminated: false,
            elimination_week: null 
          })
          .eq("league_id", selectedLeagueId);
      }
      
      setCurrentSimWeek(1);
      seasonSimulator.setWeek(1);
    },
    onSuccess: () => {
      toast({
        title: "Season Reset",
        description: "Season has been reset to week 1",
      });
      queryClient.invalidateQueries({ queryKey: ["seasonStatus"] });
    }
  });

  const handleToggleSimulation = (enabled: boolean) => {
    setSimulationMode(enabled);
    seasonSimulator.setSimulationMode(enabled);
    toast({
      title: enabled ? "Simulation Mode Enabled" : "Simulation Mode Disabled",
      description: enabled 
        ? "You can now control the season timeline" 
        : "Using real-time NFL season data",
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Settings className="h-8 w-8 text-nfl-blue" />
          <div>
            <h1 className="text-3xl font-bold text-white">Testing Dashboard</h1>
            <p className="text-gray-400">Season simulation and testing tools</p>
          </div>
        </div>

        {/* Important Notice */}
        <Alert className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Testing Mode</strong><br/>
            This dashboard allows you to simulate an NFL season for testing purposes. 
            Perfect for testing the app outside of the regular NFL season.
          </AlertDescription>
        </Alert>

        {/* Season Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-nfl-gray border-nfl-light-gray/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Current Week</CardTitle>
              <Calendar className="h-4 w-4 text-nfl-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                Week {seasonStatus?.currentWeek || currentSimWeek}
              </div>
              {simulationMode && (
                <Badge variant="secondary" className="mt-2">Simulation Mode</Badge>
              )}
            </CardContent>
          </Card>

          <Card className="bg-nfl-gray border-nfl-light-gray/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Leagues</CardTitle>
              <Trophy className="h-4 w-4 text-nfl-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{seasonStatus?.activeLeagues || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-nfl-gray border-nfl-light-gray/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Teams</CardTitle>
              <Users className="h-4 w-4 text-nfl-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{seasonStatus?.activeTeams || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="simulation" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-nfl-gray">
            <TabsTrigger value="simulation" className="text-white">Season Simulation</TabsTrigger>
            <TabsTrigger value="data" className="text-white">Test Data</TabsTrigger>
            <TabsTrigger value="scenarios" className="text-white">Test Scenarios</TabsTrigger>
          </TabsList>

          {/* Season Simulation Tab */}
          <TabsContent value="simulation" className="space-y-6">
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PlayCircle className="h-5 w-5" />
                  Season Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Simulation Mode Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Simulation Mode</Label>
                    <p className="text-sm text-gray-400">
                      Enable to control season timeline manually
                    </p>
                  </div>
                  <Switch
                    checked={simulationMode}
                    onCheckedChange={handleToggleSimulation}
                  />
                </div>

                {simulationMode && (
                  <>
                    {/* League Selection */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-white">Select League to Test</Label>
                        <p className="text-sm text-gray-400 mb-4">
                          Choose which league you want to simulate and test
                        </p>
                        <Select
                          value={selectedLeagueId || ""}
                          onValueChange={setSelectedLeagueId}
                        >
                          <SelectTrigger className="w-full bg-nfl-dark border-nfl-light-gray/20">
                            <SelectValue placeholder="Select a league to test" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLeagues?.map(league => (
                              <SelectItem key={league.id} value={league.id}>
                                {league.name} ({league.status})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!selectedLeagueId && availableLeagues?.length > 0 && (
                          <p className="text-sm text-yellow-500 mt-2">
                            Please select a league above to enable simulation controls
                          </p>
                        )}
                        {availableLeagues?.length === 0 && (
                          <Alert className="mt-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              No leagues found. Create a test league in the "Test Data" tab first.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      {/* Week Control */}
                      <div>
                        <Label className="text-white">Current Week Control</Label>
                        <p className="text-sm text-gray-400 mb-4">
                          Manually advance through the season week by week
                        </p>
                        <div className="flex items-center gap-4">
                          <Select
                            value={currentSimWeek.toString()}
                            onValueChange={(value) => {
                              const week = parseInt(value);
                              setCurrentSimWeek(week);
                              seasonSimulator.setWeek(week);
                            }}
                          >
                            <SelectTrigger className="w-32 bg-nfl-dark border-nfl-light-gray/20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
                                <SelectItem key={week} value={week.toString()}>
                                  Week {week}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => advanceWeekMutation.mutate()}
                            disabled={!selectedLeagueId || currentSimWeek >= 18 || advanceWeekMutation.isPending}
                          >
                            <ChevronRight className="h-4 w-4 mr-2" />
                            Advance Week
                          </Button>
                        </div>
                      </div>

                      {/* Quick Simulation */}
                      <div>
                        <Label className="text-white">Quick Simulation</Label>
                        <p className="text-sm text-gray-400 mb-4">
                          Simulate multiple weeks automatically
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => quickSimMutation.mutate(4)}
                            disabled={!selectedLeagueId || simulationStatus.isSimulating || currentSimWeek > 14}
                          >
                            <FastForward className="h-4 w-4 mr-2" />
                            Simulate 4 Weeks
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => quickSimMutation.mutate(8)}
                            disabled={!selectedLeagueId || simulationStatus.isSimulating || currentSimWeek > 10}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Simulate 8 Weeks
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => quickSimMutation.mutate(18 - currentSimWeek)}
                            disabled={!selectedLeagueId || simulationStatus.isSimulating || currentSimWeek >= 18}
                          >
                            <Trophy className="h-4 w-4 mr-2" />
                            Complete Season
                          </Button>
                        </div>
                      </div>

                      {/* Simulation Progress */}
                      {simulationStatus.isSimulating && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{simulationStatus.message}</span>
                            <span className="text-white">
                              {simulationStatus.currentWeek} / {simulationStatus.totalWeeks}
                            </span>
                          </div>
                          <Progress 
                            value={(simulationStatus.currentWeek / simulationStatus.totalWeeks) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}

                      {/* Reset Season */}
                      <div>
                        <Button
                          variant="destructive"
                          onClick={() => resetSeasonMutation.mutate()}
                          disabled={!selectedLeagueId || resetSeasonMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset Season to Week 1
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Weekly Elimination Control */}
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Skull className="h-5 w-5 text-red-500" />
                  Weekly Elimination Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Eliminación Semanal</strong><br/>
                    El sistema elimina automáticamente al equipo con menor puntaje cada martes.
                    Aquí puedes ejecutar manualmente la eliminación para pruebas.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Ejecutar Eliminación Manual</Label>
                    <p className="text-sm text-gray-400 mb-4">
                      Procesa la eliminación semanal para la liga seleccionada
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        onClick={async () => {
                          if (!selectedLeagueId) {
                            toast({
                              title: "Error",
                              description: "Por favor selecciona una liga primero",
                              variant: "destructive"
                            });
                            return;
                          }

                          try {
                            const { data, error } = await supabase.rpc('process_weekly_elimination', {
                              league_id: selectedLeagueId,
                              week_num: currentSimWeek,
                              season_year: new Date().getFullYear()
                            });

                            if (error) throw error;

                            toast({
                              title: "Eliminación Procesada",
                              description: data?.message || "El equipo con menor puntaje ha sido eliminado",
                              variant: data?.success ? "default" : "destructive"
                            });

                            queryClient.invalidateQueries({ queryKey: ["seasonStatus"] });
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: error.message || "Error al procesar eliminación",
                              variant: "destructive"
                            });
                          }
                        }}
                        disabled={!selectedLeagueId}
                        className="w-full"
                      >
                        <Skull className="h-4 w-4 mr-2" />
                        Procesar Eliminación Ahora
                      </Button>

                      <Button
                        onClick={async () => {
                          try {
                            const response = await fetch(
                              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weekly-elimination-processor?force=true`,
                              {
                                method: 'GET',
                                headers: {
                                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                                  'Content-Type': 'application/json',
                                }
                              }
                            );

                            const data = await response.json();

                            if (!response.ok) {
                              throw new Error(data.error || 'Error al ejecutar edge function');
                            }

                            toast({
                              title: "Edge Function Ejecutada",
                              description: data.message || "Procesamiento de eliminaciones completado",
                            });

                            queryClient.invalidateQueries({ queryKey: ["seasonStatus"] });
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: error.message || "Error al ejecutar edge function",
                              variant: "destructive"
                            });
                          }
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Ejecutar Edge Function (Todas las Ligas)
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-400">Información del Sistema</h4>
                    <div className="text-sm space-y-1">
                      <p className="text-gray-500">
                        <strong className="text-gray-400">Ejecución Automática:</strong> Martes a las 10:00 AM (configurar en Supabase)
                      </p>
                      <p className="text-gray-500">
                        <strong className="text-gray-400">Función SQL:</strong> process_weekly_elimination()
                      </p>
                      <p className="text-gray-500">
                        <strong className="text-gray-400">Edge Function:</strong> weekly-elimination-processor
                      </p>
                      <p className="text-gray-500">
                        <strong className="text-gray-400">Semana Actual:</strong> {currentSimWeek}
                      </p>
                    </div>
                  </div>

                  <Alert className="border-yellow-500/20 bg-yellow-500/10">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-yellow-200">
                      <strong>Configurar Cron Job:</strong><br/>
                      Para activar la eliminación automática todos los martes:<br/>
                      1. Ve a Supabase Dashboard → Edge Functions<br/>
                      2. Busca "weekly-elimination-processor"<br/>
                      3. En Cron Jobs, agrega: <code className="bg-black/30 px-1 rounded">0 10 * * 2</code><br/>
                      4. Guarda los cambios
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Data Tab */}
          <TabsContent value="data" className="space-y-6">
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Create Test League
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="leagueName" className="text-white">League Name</Label>
                  <Input
                    id="leagueName"
                    value={seedConfig.leagueName}
                    onChange={(e) => setSeedConfig({ ...seedConfig, leagueName: e.target.value })}
                    className="bg-nfl-dark border-nfl-light-gray/20"
                  />
                </div>

                <div>
                  <Label htmlFor="numberOfTeams" className="text-white">Number of Teams</Label>
                  <Select
                    value={seedConfig.numberOfTeams.toString()}
                    onValueChange={(value) => setSeedConfig({ 
                      ...seedConfig, 
                      numberOfTeams: parseInt(value) 
                    })}
                  >
                    <SelectTrigger className="bg-nfl-dark border-nfl-light-gray/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[4, 6, 8, 10, 12].map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} Teams
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="simulateWeeks" className="text-white">
                    Pre-simulate Weeks (Optional)
                  </Label>
                  <Select
                    value={seedConfig.simulateWeeks.toString()}
                    onValueChange={(value) => setSeedConfig({ 
                      ...seedConfig, 
                      simulateWeeks: parseInt(value) 
                    })}
                  >
                    <SelectTrigger className="bg-nfl-dark border-nfl-light-gray/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No simulation</SelectItem>
                      <SelectItem value="4">4 weeks</SelectItem>
                      <SelectItem value="8">8 weeks</SelectItem>
                      <SelectItem value="12">12 weeks</SelectItem>
                      <SelectItem value="16">16 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => seedDataMutation.mutate()}
                  disabled={seedDataMutation.isPending}
                  className="w-full"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Create Test League with Mock Draft
                </Button>

                {seedDataMutation.isPending && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Creating test league and running mock draft...
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Scenarios Tab */}
          <TabsContent value="scenarios" className="space-y-6">
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Quick Test Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    These scenarios help test specific features quickly
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Trophy className="h-4 w-4 mr-2" />
                    Test Draft Night - 8 teams with timer pressure
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="h-4 w-4 mr-2" />
                    Test Weekly Elimination - Simulate to week 6
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Test Trading System - Create pending trades
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Zap className="h-4 w-4 mr-2" />
                    Test Waiver Processing - Multiple waiver requests
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Trophy className="h-4 w-4 mr-2" />
                    Test Championship - Simulate to final 2 teams
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}