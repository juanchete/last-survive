import React, { useState } from 'react';
import { 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Info,
  Calendar,
  TrendingUp,
  Database,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AutomationStatus {
  pg_cron_available: boolean;
  active_cron_jobs: number;
  automation_enabled: boolean;
  timezone: string;
  webhook_configured: boolean;
  secret_configured: boolean;
  next_execution: string;
  recommendations: string[];
}

interface ProcessResult {
  success: boolean;
  message: string;
  timestamp: string;
  total_processed: number;
  successful_eliminations: number;
  successful_advancements: number;
  results: Array<{
    league_id: string;
    league_name: string;
    week_processed: number;
    result: any;
  }>;
}

const WeeklyAutomationControl: React.FC = () => {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const queryClient = useQueryClient();

  // Get automation status
  const { data: automationStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['automation-status'],
    queryFn: async (): Promise<AutomationStatus> => {
      const { data, error } = await supabase.rpc('check_tuesday_3am_automation');
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Get leagues for testing
  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leagues')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Toggle automation
  const toggleAutomationMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data, error } = await supabase.rpc('toggle_tuesday_3am_automation', {
        p_enabled: enabled
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['automation-status'] });
      toast({
        title: data.enabled ? "Automatización Habilitada" : "Automatización Deshabilitada",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Error toggling automation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Test Tuesday 3 AM process
  const testProcessMutation = useMutation({
    mutationFn: async (leagueId?: string) => {
      const { data, error } = await supabase.rpc('simulate_tuesday_3am_process', {
        league_id: leagueId || null,
        season_year: new Date().getFullYear()
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Proceso de Prueba Completado",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error en Prueba",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Call Edge Function for testing
  const testEdgeFunctionMutation = useMutation({
    mutationFn: async (leagueId?: string) => {
      const response = await fetch('/functions/v1/weekly-elimination', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          action: leagueId ? 'test_single_league' : 'tuesday_3am_process',
          league_id: leagueId,
          season: new Date().getFullYear()
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    },
    onSuccess: (data: ProcessResult) => {
      toast({
        title: "Edge Function Ejecutado",
        description: `${data.successful_eliminations} eliminaciones, ${data.successful_advancements} avances de semana`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Edge Function",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: AutomationStatus) => {
    if (status.pg_cron_available && status.active_cron_jobs > 0 && status.automation_enabled) {
      return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
        <CheckCircle className="w-3 h-3 mr-1" />Automatizado
      </Badge>;
    } else if (status.automation_enabled && status.webhook_configured) {
      return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
        <Info className="w-3 h-3 mr-1" />Webhook
      </Badge>;
    } else {
      return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
        <AlertCircle className="w-3 h-3 mr-1" />Manual
      </Badge>;
    }
  };

  if (statusLoading) {
    return <div className="text-center py-8">Cargando estado de automatización...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Control de Automatización Semanal</h2>
          <p className="text-gray-400">Sistema automático martes 3 AM: Eliminación + Avance de Semana + Reset de Puntos</p>
        </div>
        {automationStatus && getStatusBadge(automationStatus)}
      </div>

      <Tabs defaultValue="status" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">Estado del Sistema</TabsTrigger>
          <TabsTrigger value="control">Control Manual</TabsTrigger>
          <TabsTrigger value="testing">Pruebas</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuración Actual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {automationStatus && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Sistema de Cron Jobs</Label>
                      <div className="flex items-center gap-2">
                        {automationStatus.pg_cron_available ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-400" />
                        )}
                        <span className="text-sm text-gray-300">
                          {automationStatus.pg_cron_available ? 'pg_cron disponible' : 'pg_cron no disponible'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Jobs Activos</Label>
                      <div className="text-sm text-gray-300">
                        {automationStatus.active_cron_jobs} cron jobs configurados
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Zona Horaria</Label>
                      <div className="text-sm text-gray-300">
                        {automationStatus.timezone}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Próxima Ejecución</Label>
                      <div className="text-sm text-gray-300">
                        {automationStatus.next_execution}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="automation-enabled"
                      checked={automationStatus.automation_enabled}
                      onCheckedChange={(enabled) => toggleAutomationMutation.mutate(enabled)}
                      disabled={toggleAutomationMutation.isPending}
                    />
                    <Label htmlFor="automation-enabled" className="text-sm">
                      Automatización Habilitada (Martes 3 AM)
                    </Label>
                  </div>

                  {automationStatus.recommendations.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Recomendaciones:</strong>
                        <ul className="mt-2 list-disc list-inside">
                          {automationStatus.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm">{rec}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Funcionalidad del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Cada martes 3:00 AM (Eastern Time)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-red-400" />
                  <span className="text-sm">Eliminación automática del equipo con menor puntaje</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-green-400" />
                  <span className="text-sm">Liberación de jugadores al waiver pool</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">Avance automático de semana (1/18 → 2/18)</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">Reset de puntos semanales a 0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="control" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Control Manual del Sistema</CardTitle>
              <CardDescription>
                Ejecutar manualmente el proceso que normalmente ocurre martes 3 AM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>¡Cuidado!</strong> Este proceso eliminará equipos y avanzará semanas. 
                  Solo usar si el proceso automático falla o para mantenimiento.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => testProcessMutation.mutate()}
                disabled={testProcessMutation.isPending}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                {testProcessMutation.isPending ? 'Procesando...' : 'Ejecutar Proceso Completo (Todas las Ligas)'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pruebas del Sistema</CardTitle>
              <CardDescription>
                Probar componentes individuales sin afectar datos de producción
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => testProcessMutation.mutate()}
                  disabled={testProcessMutation.isPending}
                  variant="outline"
                >
                  <Database className="w-4 h-4 mr-2" />
                  {testProcessMutation.isPending ? 'Probando...' : 'Probar Función SQL'}
                </Button>

                <Button
                  onClick={() => testEdgeFunctionMutation.mutate()}
                  disabled={testEdgeFunctionMutation.isPending}
                  variant="outline"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {testEdgeFunctionMutation.isPending ? 'Probando...' : 'Probar Edge Function'}
                </Button>
              </div>

              {leagues.length > 0 && (
                <div className="space-y-3">
                  <Label htmlFor="league-select">Probar Liga Específica (Opcional)</Label>
                  <select
                    id="league-select"
                    value={selectedLeagueId}
                    onChange={(e) => setSelectedLeagueId(e.target.value)}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                  >
                    <option value="">Todas las ligas</option>
                    {leagues.map((league) => (
                      <option key={league.id} value={league.id}>
                        {league.name}
                      </option>
                    ))}
                  </select>
                  
                  {selectedLeagueId && (
                    <Button
                      onClick={() => testProcessMutation.mutate(selectedLeagueId)}
                      disabled={testProcessMutation.isPending}
                      variant="outline"
                      className="w-full"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Probar Liga Seleccionada
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WeeklyAutomationControl;