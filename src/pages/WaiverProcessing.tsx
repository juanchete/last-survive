
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { LeagueNav } from "@/components/LeagueNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIsLeagueOwner } from "@/hooks/useIsLeagueOwner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Users,
  Clock
} from "lucide-react";
import { useLocation, Navigate } from "react-router-dom";

const WaiverProcessing = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "";
  const currentWeek = 1;

  const { data: isOwner, isLoading: loadingOwner } = useIsLeagueOwner(leagueId);
  const [processing, setProcessing] = useState(false);
  const [lastProcessResult, setLastProcessResult] = useState<any>(null);

  // Redirect if not owner
  if (!loadingOwner && !isOwner) {
    return <Navigate to={`/league/${leagueId}`} replace />;
  }

  const handleProcessWaivers = async () => {
    if (!leagueId) return;
    
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("process_league_waivers", {
        league_id: leagueId,
        week_num: currentWeek,
        season_year: 2024,
      });

      if (error) throw error;

      // Properly type the response data
      const result = data as any;
      setLastProcessResult(result);
      toast({
        title: "Waivers Procesadas",
        description: `${result.successful_claims || 0} solicitudes aprobadas, ${result.failed_claims || 0} rechazadas`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error procesando waivers",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleGetWaiverDeadline = async () => {
    try {
      const { data, error } = await supabase.rpc("get_waiver_deadline", {
        league_id: leagueId,
      });

      if (error) throw error;

      // Properly type the response data
      const result = data as any;
      toast({
        title: "Deadline Info",
        description: `Próximo deadline: ${new Date(result.deadline || Date.now()).toLocaleString()}`,
      });
    } catch (error: any) {
      toast({
        title: "Info",
        description: "Usando deadline por defecto: Martes 11 PM",
      });
    }
  };

  const handleDebugWaivers = async () => {
    try {
      const { data, error } = await supabase.rpc("debug_waiver_processing", {
        league_id: leagueId,
        week_num: currentWeek,
      });

      if (error) throw error;

      // Properly type the response data
      const result = data as any;
      toast({
        title: "Debug Info",
        description: `Waivers pendientes: ${result.pending_waiver_requests || 0}, Prioridades: ${result.waiver_priority_records || 0}, Matches: ${result.joined_records_matching_criteria || 0}`,
      });
    } catch (error: any) {
      toast({
        title: "Error en Debug",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleProcessWaiversSimple = async () => {
    if (!leagueId) return;
    
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("process_league_waivers_simple", {
        league_id: leagueId,
      });

      if (error) throw error;

      // Properly type the response data
      const result = data as any;
      setLastProcessResult(result);
      toast({
        title: "Waivers Procesadas (Simple)",
        description: `${result.successful_claims || 0} solicitudes aprobadas, ${result.failed_claims || 0} rechazadas`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error procesando waivers",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loadingOwner) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin w-8 h-8" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <LeagueNav leagueId={leagueId} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-nfl-blue" />
          <h1 className="text-3xl font-bold">Waiver Processing</h1>
          <Badge variant="outline" className="bg-blue-50">
            Owner Only
          </Badge>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Process Waivers Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Procesar Waivers Manualmente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-blue-500 bg-blue-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="text-sm text-blue-700">
                    <strong>Semana {currentWeek}:</strong> Procesar todas las solicitudes pendientes según la prioridad establecida.
                    <br />
                    <span className="text-xs mt-1 block">
                      Las solicitudes se procesan automáticamente después del deadline.
                    </span>
                  </div>
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleProcessWaivers}
                disabled={processing}
                className="w-full h-12"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Procesar Waivers Ahora
                  </>
                )}
              </Button>

              <Button
                onClick={handleGetWaiverDeadline}
                variant="outline"
                className="w-full"
              >
                <Clock className="w-4 h-4 mr-2" />
                Ver Deadline Actual
              </Button>

              {/* Debugging buttons - temporary */}
              <div className="border-t pt-4 space-y-2">
                <p className="text-xs text-gray-500 mb-2">🔧 Herramientas de Debugging:</p>
                <Button
                  onClick={handleDebugWaivers}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  🔍 Debug Info
                </Button>
                <Button
                  onClick={handleProcessWaiversSimple}
                  disabled={processing}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                >
                  🧪 Procesar (Versión Simple)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Last Process Result */}
          <Card>
            <CardHeader>
              <CardTitle>Último Resultado</CardTitle>
            </CardHeader>
            <CardContent>
              {lastProcessResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {lastProcessResult.successful_claims || 0}
                      </div>
                      <div className="text-sm text-green-700">Aprobadas</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {lastProcessResult.failed_claims || 0}
                      </div>
                      <div className="text-sm text-red-700">Rechazadas</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {lastProcessResult.total_processed || 0}
                      </div>
                      <div className="text-sm text-blue-700">Total</div>
                    </div>
                  </div>

                  <Alert className="border-green-500 bg-green-50">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-green-700">
                      <strong>Resultado:</strong> {lastProcessResult.message || 'Procesamiento completado'}
                    </AlertDescription>
                  </Alert>

                  {/* Details of processing */}
                  {lastProcessResult.results && lastProcessResult.results.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Detalles:</h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {lastProcessResult.results.map((result: any, idx: number) => (
                          <div 
                            key={idx}
                            className={`text-xs p-2 rounded ${
                              result.result.success 
                                ? 'bg-green-50 text-green-700' 
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            Team {result.fantasy_team_id?.slice(0, 8)} - Player {result.player_id}
                            {result.drop_player_id && ` (Drop: ${result.drop_player_id})`}
                            : {result.result.success ? '✅' : '❌'} {result.result.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aún no se han procesado waivers.</p>
                  <p className="text-sm">Los resultados aparecerán aquí después de procesar.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Información del Sistema de Waivers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Procesamiento Automático
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Las waivers se procesan automáticamente después del deadline</li>
                    <li>• Deadline por defecto: Martes 11:00 PM</li>
                    <li>• Se respeta el orden de prioridad de waivers</li>
                    <li>• Los usuarios reciben notificaciones automáticas</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Validaciones Automáticas
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Verifica límites de roster (16 jugadores máximo)</li>
                    <li>• Valida límites por posición</li>
                    <li>• Requiere drop si el roster está lleno</li>
                    <li>• Evita conflictos entre solicitudes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default WaiverProcessing; 
