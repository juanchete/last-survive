import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DraftTimer } from '@/components/DraftTimer';
import { Layout } from '@/components/Layout';
import { Settings, Play, Pause, SkipForward, RotateCcw, Zap } from 'lucide-react';
import { useDraftState } from '@/hooks/useDraftState';
import { useUserFantasyTeam } from '@/hooks/useUserFantasyTeam';
import { useIsMyDraftTurn } from '@/hooks/useIsMyDraftTurn';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function DraftTesting() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "default";
  
  const [timerDuration, setTimerDuration] = useState(10); // 10 segundos para testing
  const [isTestMode, setIsTestMode] = useState(true);

  // Hooks
  const { data: draftState, refetch: refetchDraft } = useDraftState(leagueId);
  const { data: userTeam } = useUserFantasyTeam(leagueId);
  const myTeamId = userTeam?.id || "";
  const isMyTurn = useIsMyDraftTurn(leagueId, myTeamId);

  // Funciones de control del draft
  const startDraft = async () => {
    try {
      await supabase
        .from('leagues')
        .update({
          draft_status: 'in_progress',
          current_pick: 0,
        })
        .eq('id', leagueId);
      
      await refetchDraft();
      toast.success('Draft iniciado');
    } catch (error) {
      toast.error('Error iniciando draft');
    }
  };

  const pauseDraft = async () => {
    try {
      await supabase
        .from('leagues')
        .update({ draft_status: 'pending' })
        .eq('id', leagueId);
      
      await refetchDraft();
      toast.success('Draft pausado');
    } catch (error) {
      toast.error('Error pausando draft');
    }
  };

  const nextTurn = async () => {
    if (!draftState?.draft_order) return;
    
    const nextPick = ((draftState.current_pick || 0) + 1) % draftState.draft_order.length;
    
    try {
      await supabase
        .from('leagues')
        .update({ current_pick: nextPick })
        .eq('id', leagueId);
      
      await refetchDraft();
      toast.success(`Turno cambiado a pick ${nextPick + 1}`);
    } catch (error) {
      toast.error('Error cambiando turno');
    }
  };

  const setMyTurn = async () => {
    if (!draftState?.draft_order || !userTeam) return;
    
    const myIndex = draftState.draft_order.findIndex(teamId => teamId === userTeam.id);
    if (myIndex === -1) {
      toast.error('Tu equipo no está en el draft order');
      return;
    }
    
    try {
      await supabase
        .from('leagues')
        .update({ current_pick: myIndex })
        .eq('id', leagueId);
      
      await refetchDraft();
      toast.success('Es tu turno ahora');
    } catch (error) {
      toast.error('Error estableciendo tu turno');
    }
  };

  const resetDraft = async () => {
    try {
      await supabase
        .from('leagues')
        .update({
          draft_status: 'pending',
          current_pick: 0,
        })
        .eq('id', leagueId);
      
      await refetchDraft();
      toast.success('Draft reseteado');
    } catch (error) {
      toast.error('Error reseteando draft');
    }
  };

  const addTeamsToDraft = async () => {
    try {
      // Obtener todos los fantasy teams de la liga
      const { data: teams } = await supabase
        .from('fantasy_teams')
        .select('id, name')
        .eq('league_id', leagueId);

      if (!teams || teams.length === 0) {
        toast.error('No hay equipos en esta liga');
        return;
      }

      const teamIds = teams.map(team => team.id);
      
      await supabase
        .from('leagues')
        .update({ 
          draft_order: teamIds,
          current_pick: 0 
        })
        .eq('id', leagueId);
      
      await refetchDraft();
      toast.success(`${teams.length} equipos agregados al draft`);
    } catch (error) {
      toast.error('Error configurando equipos');
    }
  };

  const handleTimeExpired = () => {
    toast.error('⏱️ ¡Tiempo agotado en testing!');
  };

  const goToDraft = () => {
    navigate(`/draft?league=${leagueId}`);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Settings className="h-8 w-8" />
                Draft Testing Panel
              </h1>
              <p className="text-gray-400 mt-1">
                Herramientas para probar el sistema de draft
              </p>
            </div>
            <Button onClick={goToDraft} variant="outline">
              Ir al Draft Real
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Panel de Control */}
            <div className="space-y-6">
              
              {/* Estado Actual */}
              <Card>
                <CardHeader>
                  <CardTitle>Estado Actual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>League ID</Label>
                      <Input value={leagueId} readOnly />
                    </div>
                    <div>
                      <Label>Draft Status</Label>
                      <Badge variant={draftState?.draft_status === 'in_progress' ? 'default' : 'secondary'}>
                        {draftState?.draft_status || 'No encontrado'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Current Pick</Label>
                      <Input value={draftState?.current_pick ?? 'N/A'} readOnly />
                    </div>
                    <div>
                      <Label>¿Es mi turno?</Label>
                      <Badge variant={isMyTurn ? 'default' : 'secondary'}>
                        {isMyTurn ? 'SÍ' : 'NO'}
                      </Badge>
                    </div>
                  </div>

                  {draftState?.draft_order && (
                    <div>
                      <Label>Draft Order ({draftState.draft_order.length} equipos)</Label>
                      <div className="mt-2 text-xs text-gray-400 max-h-20 overflow-y-auto">
                        {draftState.draft_order.map((teamId, idx) => (
                          <div key={teamId} className={idx === draftState.current_pick ? 'font-bold text-blue-400' : ''}>
                            {idx + 1}. {teamId.substring(0, 8)}... {idx === draftState.current_pick && '← TURNO ACTUAL'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Configuración de Testing */}
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Testing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="timer">Duración del Timer (segundos)</Label>
                    <Input 
                      id="timer"
                      type="number" 
                      value={timerDuration} 
                      onChange={(e) => setTimerDuration(Number(e.target.value))}
                      min="5"
                      max="120"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Controles */}
              <Card>
                <CardHeader>
                  <CardTitle>Controles de Draft</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* Setup */}
                    <Button onClick={addTeamsToDraft} variant="outline" className="w-full">
                      <Zap className="h-4 w-4 mr-2" />
                      Setup Equipos
                    </Button>
                    
                    {/* Start/Pause */}
                    {draftState?.draft_status === 'in_progress' ? (
                      <Button onClick={pauseDraft} variant="outline" className="w-full">
                        <Pause className="h-4 w-4 mr-2" />
                        Pausar
                      </Button>
                    ) : (
                      <Button onClick={startDraft} className="w-full">
                        <Play className="h-4 w-4 mr-2" />
                        Iniciar
                      </Button>
                    )}
                    
                    {/* Next Turn */}
                    <Button onClick={nextTurn} variant="outline" className="w-full">
                      <SkipForward className="h-4 w-4 mr-2" />
                      Siguiente Turno
                    </Button>
                    
                    {/* My Turn */}
                    <Button onClick={setMyTurn} variant="outline" className="w-full">
                      👤 Mi Turno
                    </Button>
                    
                    {/* Reset */}
                    <Button onClick={resetDraft} variant="destructive" className="w-full col-span-2">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset Draft
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timer de Testing */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Timer de Testing</CardTitle>
                </CardHeader>
                <CardContent>
                  <DraftTimer
                    isMyTurn={isMyTurn}
                    isActive={draftState?.draft_status === 'in_progress'}
                    onTimeExpired={handleTimeExpired}
                    timerDuration={timerDuration}
                  />
                </CardContent>
              </Card>

              {/* Instrucciones */}
              <Card>
                <CardHeader>
                  <CardTitle>Instrucciones</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>1.</strong> Haz clic en "Setup Equipos" para configurar el draft order</p>
                  <p><strong>2.</strong> Usa "Iniciar" para comenzar el draft</p>
                  <p><strong>3.</strong> Haz clic en "Mi Turno" para activar el timer</p>
                  <p><strong>4.</strong> Ajusta la duración del timer para testing rápido</p>
                  <p><strong>5.</strong> Usa "Siguiente Turno" para cambiar turnos</p>
                  <p><strong>6.</strong> El timer se reinicia automáticamente en cada turno</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 