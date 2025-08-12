import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Download, RefreshCw, Users, BarChart3, Calendar, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
// Using new provider-based hooks instead of direct API hooks
import { 
  useNFLState, 
  useSyncStatus, 
  useProviderHealth,
  useCacheStats 
} from '@/hooks/useNFLDataAPI';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export function SleeperAPIControl() {
  const { data: nflState } = useNFLState();
  const { data: syncStatus } = useSyncStatus();
  const { data: providerHealth } = useProviderHealth();
  const { data: cacheStats } = useCacheStats();
  const { 
    syncPlayersFromSleeper, 
    syncWeeklyStatsFromSleeper, 
    syncNFLTeamsFromSleeper,
    syncTeamDefensesFromSleeper,
    getSleeperSyncStatus,
    mapExistingPlayersToSleeper,
    cleanDuplicatePlayers 
  } = useAdmin();

  const [loading, setLoading] = useState<{
    players: boolean;
    stats: boolean;
    teams: boolean;
    defenses: boolean;
    mapping: boolean;
    cleaning: boolean;
  }>({
    players: false,
    stats: false,
    teams: false,
    defenses: false,
    mapping: false,
    cleaning: false,
  });

  const [showCleanDialog, setShowCleanDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<any>(null);

  const [statsForm, setStatsForm] = useState({
    season: nflState?.previous_season || '2024',
    week: '1',
    scoringType: 'std' as 'std' | 'ppr' | 'half_ppr',
  });

  const handleSyncPlayers = async (fantasyOnly: boolean = true, activeOnly: boolean = true) => {
    setLoading(prev => ({ ...prev, players: true }));
    try {
      const result = await syncPlayersFromSleeper(fantasyOnly, activeOnly);
      if (result.success) {
        toast.success(`${result.message} (${result.count} jugadores)`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error al sincronizar jugadores');
    } finally {
      setLoading(prev => ({ ...prev, players: false }));
    }
  };

  const handleSyncStats = async () => {
    setLoading(prev => ({ ...prev, stats: true }));
    try {
      const result = await syncWeeklyStatsFromSleeper(
        parseInt(statsForm.season),
        parseInt(statsForm.week),
        statsForm.scoringType
      );
      if (result.success) {
        toast.success(`${result.message} (${result.count} estadísticas)`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error al sincronizar estadísticas');
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  const handleSyncTeams = async () => {
    setLoading(prev => ({ ...prev, teams: true }));
    try {
      const result = await syncNFLTeamsFromSleeper();
      if (result.success) {
        toast.success(`${result.message} (${result.count} equipos)`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error al sincronizar equipos NFL');
    } finally {
      setLoading(prev => ({ ...prev, teams: false }));
    }
  };

  const handleSyncDefenses = async () => {
    setLoading(prev => ({ ...prev, defenses: true }));
    try {
      const result = await syncTeamDefensesFromSleeper();
      if (result.success) {
        toast.success(`${result.message} (${result.count} defensas)`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error al sincronizar defensas de equipos');
    } finally {
      setLoading(prev => ({ ...prev, defenses: false }));
    }
  };

  const handleMapExistingPlayers = async () => {
    setLoading(prev => ({ ...prev, mapping: true }));
    try {
      const result = await mapExistingPlayersToSleeper();
      if (result.success) {
        toast.success(`${result.message} (${result.count} jugadores mapeados)`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error al mapear jugadores existentes');
    } finally {
      setLoading(prev => ({ ...prev, mapping: false }));
    }
  };

  const handleCheckDuplicates = async () => {
    setLoading(prev => ({ ...prev, cleaning: true }));
    try {
      const result = await cleanDuplicatePlayers(true); // dry run
      if (result.success) {
        setDuplicateInfo(result);
        setShowCleanDialog(true);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error al verificar duplicados');
    } finally {
      setLoading(prev => ({ ...prev, cleaning: false }));
    }
  };

  const handleCleanDuplicates = async () => {
    setLoading(prev => ({ ...prev, cleaning: true }));
    try {
      const result = await cleanDuplicatePlayers(false); // execute
      if (result.success) {
        toast.success('Jugadores duplicados limpiados exitosamente');
        setShowCleanDialog(false);
        setDuplicateInfo(null);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error al limpiar duplicados');
    } finally {
      setLoading(prev => ({ ...prev, cleaning: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estado de la API de Sleeper
          </CardTitle>
          <CardDescription>
            Información del estado actual de la API y sincronización
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Temporada NFL</Label>
              <div className="flex items-center gap-2">
                <Badge variant={nflState?.season_type === 'off' ? 'secondary' : 'default'}>
                  {nflState?.season} {nflState?.season_type}
                </Badge>
                <Badge variant="outline">Semana {nflState?.week}</Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Estado del Proveedor</Label>
              <div className="flex items-center gap-2">
                {providerHealth?.healthy ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">
                  {providerHealth?.healthy ? 'Saludable' : 'Con problemas'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Cache: {cacheStats?.healthy ? 'Activo' : 'Inactivo'}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Estado de Datos</Label>
              <div className="flex items-center gap-2">
                {syncStatus?.healthy ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">
                  {syncStatus?.healthy ? 'Sincronizado' : 'Desactualizado'}
                </span>
              </div>
              {syncStatus?.lastSync && (
                <div className="text-xs text-muted-foreground">
                  Última sync: {new Date(syncStatus.lastSync).toLocaleString('es-MX')}
                </div>
              )}
            </div>
          </div>

          {nflState?.season_type === 'off' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                La temporada NFL está en pausa. Los datos de la temporada {nflState.previous_season} están disponibles para pruebas.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Estado de Sincronización
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{syncStatus?.playerCount || 0}</div>
              <div className="text-sm text-muted-foreground">Jugadores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{syncStatus?.teamCount || 0}</div>
              <div className="text-sm text-muted-foreground">Equipos NFL</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {providerHealth?.details?.circuit_breakers ? Object.keys(providerHealth.details.circuit_breakers).length : 0}
              </div>
              <div className="text-sm text-muted-foreground">Endpoints Activos</div>
            </div>
            <div className="text-center">
              <div className="text-sm">
                {providerHealth?.details?.metrics ? (
                  <>
                    <div className="font-bold">
                      {providerHealth.details.metrics.cache_hit_rate || '0%'}
                    </div>
                    <div className="text-muted-foreground">Cache Hit Rate</div>
                  </>
                ) : (
                  <div className="text-muted-foreground">Sin métricas</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Players Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Sincronizar Jugadores
            </CardTitle>
            <CardDescription>
              Actualizar base de datos de jugadores desde Sleeper API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                onClick={() => handleSyncPlayers(true, true)}
                disabled={loading.players}
                className="w-full"
              >
                {loading.players ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Sincronizar Jugadores Fantasy Activos
              </Button>
              
              <Button
                onClick={() => handleSyncPlayers(false, false)}
                disabled={loading.players}
                variant="outline"
                className="w-full"
              >
                {loading.players ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Sincronizar Todos los Jugadores
              </Button>

              <Button
                onClick={handleMapExistingPlayers}
                disabled={loading.mapping}
                variant="secondary"
                className="w-full"
              >
                {loading.mapping ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                Mapear Jugadores Existentes
              </Button>

              <Button
                onClick={handleCheckDuplicates}
                disabled={loading.cleaning}
                variant="destructive"
                className="w-full"
              >
                {loading.cleaning ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Limpiar Jugadores Duplicados
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <strong>Recomendado:</strong> Solo jugadores fantasy activos (~1,500 jugadores)<br/>
              <strong>Mapear Existentes:</strong> Asigna Sleeper IDs a tus jugadores actuales sin sleeper_id<br/>
              <strong>Limpiar Duplicados:</strong> Elimina jugadores sin sleeper_id que están duplicados
            </div>
          </CardContent>
        </Card>

        {/* Teams Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Sincronizar Equipos NFL
            </CardTitle>
            <CardDescription>
              Actualizar información de equipos NFL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSyncTeams}
              disabled={loading.teams}
              className="w-full"
            >
              {loading.teams ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Sincronizar Equipos NFL
            </Button>
            
            <div className="text-xs text-muted-foreground mt-2">
              Actualiza nombres y abreviaciones de equipos
            </div>
          </CardContent>
        </Card>

        {/* Team Defenses Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Sincronizar Defensas
            </CardTitle>
            <CardDescription>
              Crear entradas de defensa para cada equipo NFL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSyncDefenses}
              disabled={loading.defenses}
              className="w-full"
            >
              {loading.defenses ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Sincronizar Defensas de Equipos
            </Button>
            
            <div className="text-xs text-muted-foreground mt-2">
              Crea jugadores especiales DEF para cada equipo NFL
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Stats Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Sincronizar Estadísticas Semanales
          </CardTitle>
          <CardDescription>
            Importar puntos fantasy y estadísticas de una semana específica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="season">Temporada</Label>
              <Input
                id="season"
                type="number"
                value={statsForm.season}
                onChange={(e) => setStatsForm(prev => ({ ...prev, season: e.target.value }))}
                min="2020"
                max="2025"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="week">Semana</Label>
              <Input
                id="week"
                type="number"
                value={statsForm.week}
                onChange={(e) => setStatsForm(prev => ({ ...prev, week: e.target.value }))}
                min="1"
                max="18"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="scoring">Tipo de Puntuación</Label>
              <Select
                value={statsForm.scoringType}
                onValueChange={(value: 'std' | 'ppr' | 'half_ppr') => 
                  setStatsForm(prev => ({ ...prev, scoringType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="std">Estándar</SelectItem>
                  <SelectItem value="ppr">PPR</SelectItem>
                  <SelectItem value="half_ppr">Half PPR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button
            onClick={handleSyncStats}
            disabled={loading.stats || !statsForm.season || !statsForm.week}
            className="w-full"
          >
            {loading.stats ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Sincronizar Estadísticas {statsForm.season} Semana {statsForm.week}
          </Button>
          
          <div className="text-xs text-muted-foreground">
            <strong>Nota:</strong> Esto actualizará los puntos fantasy de todos los jugadores para la semana seleccionada.
            Los puntajes de equipos se recalcularán automáticamente.
          </div>
        </CardContent>
      </Card>

      {/* Clean Duplicates Dialog */}
      <Dialog open={showCleanDialog} onOpenChange={setShowCleanDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Limpiar Jugadores Duplicados</DialogTitle>
            <DialogDescription>
              Se encontraron jugadores duplicados sin sleeper_id. Revisa la información antes de proceder.
            </DialogDescription>
          </DialogHeader>
          
          {duplicateInfo && (
            <div className="space-y-4">
              {duplicateInfo.duplicate_players && duplicateInfo.duplicate_players.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Jugadores Duplicados ({duplicateInfo.duplicate_players.length})</h4>
                  <div className="bg-muted p-4 rounded-lg max-h-48 overflow-y-auto">
                    {duplicateInfo.duplicate_players.map((player: any, index: number) => (
                      <div key={index} className="text-sm mb-1">
                        <strong>{player.name}</strong> (ID: {player.id}, {player.position})
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {duplicateInfo.affected_references && duplicateInfo.affected_references.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Referencias que serán migradas</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    {duplicateInfo.affected_references.map((ref: any, index: number) => (
                      <div key={index} className="text-sm mb-1">
                        <strong>{ref.player_name}</strong>: {ref.reference_count} en {ref.table_name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Esta acción migrará todas las referencias de los jugadores duplicados a los jugadores con sleeper_id 
                  y luego eliminará los duplicados. Esta acción no se puede deshacer.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCleanDialog(false)}
              disabled={loading.cleaning}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCleanDuplicates}
              disabled={loading.cleaning}
            >
              {loading.cleaning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Limpiar Duplicados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}