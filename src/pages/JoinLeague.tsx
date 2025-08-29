import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Trophy, Users, Calendar, DollarSign, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { League } from '@/types';
import { Layout } from '@/components/Layout';

export default function JoinLeague() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');
  const inviteCode = searchParams.get('code');

  // Obtener información de la liga por código
  const { data: league, isLoading: isLoadingLeague, error: leagueError } = useQuery({
    queryKey: ['league-by-code', inviteCode || manualCode],
    queryFn: async () => {
      const code = inviteCode || manualCode;
      if (!code) return null;

      try {
        // Primero buscar por código de invitación temporal
        const { data: invitation, error: invitationError } = await supabase
          .from('league_invitations')
          .select(`
            *,
            league:leagues(
              *,
              owner:users!leagues_owner_id_fkey(full_name, email)
            )
          `)
          .eq('invite_code', code)
          .eq('status', 'pending')
          .single();

        // Si encontramos una invitación válida, verificar que no haya expirado
        if (invitation && !invitationError) {
          const now = new Date();
          const expiresAt = new Date(invitation.expires_at);
          
          if (now > expiresAt) {
            // Marcar como expirada
            await supabase
              .from('league_invitations')
              .update({ status: 'expired' })
              .eq('id', invitation.id);
            
            throw new Error('INVITATION_EXPIRED');
          }
          
          return { ...invitation.league, invitationType: 'temporary' } as League & { invitationType: string };
        }

        // Si no hay invitación temporal, buscar por código privado de liga
        const { data: leagueData, error: leagueError } = await supabase
          .from('leagues')
          .select(`
            *,
            owner:users!leagues_owner_id_fkey(full_name, email)
          `)
          .eq('private_code', code)
          .eq('is_private', true)
          .single();

        if (leagueError || !leagueData) {
          throw new Error('LEAGUE_NOT_FOUND');
        }

        return { ...leagueData, invitationType: 'private_code' } as League & { invitationType: string };
      } catch (error: any) {
        // Re-lanzar errores específicos
        if (error.message === 'INVITATION_EXPIRED' || error.message === 'LEAGUE_NOT_FOUND') {
          throw error;
        }
        throw new Error('LEAGUE_NOT_FOUND');
      }
    },
    enabled: !!(inviteCode || manualCode),
    retry: false,
  });

  // Obtener miembros actuales de la liga
  const { data: members } = useQuery({
    queryKey: ['league-members', league?.id],
    queryFn: async () => {
      if (!league?.id) return [];

      const { data, error } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', league.id);

      if (error) throw error;
      return data;
    },
    enabled: !!league?.id,
  });

  // Unirse a la liga
  const joinLeagueMutation = useMutation({
    mutationFn: async () => {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Usuario no autenticado');

      if (!league) throw new Error('Liga no encontrada');

      // Verificar si ya es miembro
      const { data: existingMember } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', league.id)
        .eq('user_id', currentUser.user.id)
        .single();

      if (existingMember) {
        throw new Error('Ya eres miembro de esta liga');
      }

      // Verificar límite de miembros
      if (members && league.max_members && members.length >= league.max_members) {
        throw new Error('La liga ha alcanzado el límite máximo de participantes');
      }

      // Crear equipo fantasy
      const { data: fantasyTeam, error: teamError } = await supabase
        .from('fantasy_teams')
        .insert({
          league_id: league.id,
          user_id: currentUser.user.id,
          name: `Equipo de ${currentUser.user.user_metadata?.full_name || currentUser.user.email?.split('@')[0]}`,
          points: 0,
          rank: (members?.length || 0) + 1,
          eliminated: false,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Unirse a la liga
      const { error: memberError } = await supabase
        .from('league_members')
        .insert({
          league_id: league.id,
          user_id: currentUser.user.id,
          role: 'member',
          team_id: fantasyTeam.id,
        });

      if (memberError) throw memberError;

      // Marcar invitación como aceptada si existe y es temporal
      if (inviteCode && (league as any)?.invitationType === 'temporary') {
        await supabase
          .from('league_invitations')
          .update({ status: 'accepted' })
          .eq('invite_code', inviteCode);
      }

      return fantasyTeam;
    },
    onSuccess: () => {
      toast.success('¡Te has unido a la liga correctamente!');
      navigate('/hub');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al unirse a la liga');
    },
  });

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    // La query se ejecutará automáticamente al cambiar manualCode
  };

  const canJoin = league && league.status === 'upcoming' && 
    (!league.max_members || !members || members.length < league.max_members);

  // Función para obtener mensaje de error específico
  const getErrorMessage = () => {
    if (!leagueError) return null;
    
    const errorMessage = leagueError.message;
    switch (errorMessage) {
      case 'INVITATION_EXPIRED':
        return 'Esta invitación ha expirado. Solicita un nuevo enlace al organizador de la liga.';
      case 'LEAGUE_NOT_FOUND':
        return 'Liga no encontrada. Verifica que el código de invitación sea correcto.';
      default:
        return 'Error al buscar la liga. Intenta nuevamente o contacta al organizador.';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-nfl-dark">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header con botón de regreso */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              onClick={() => navigate('/hub')}
              className="flex items-center gap-2 border-nfl-blue/20 text-white hover:bg-nfl-blue/10 hover:border-nfl-blue"
            >
              <ArrowLeft className="h-4 w-4" />
              Regresar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Unirse a Liga</h1>
              <p className="text-gray-400 mt-1">
                Ingresa el código de invitación para unirte a una liga
              </p>
            </div>
          </div>

          {!inviteCode && (
            <Card className="mb-6 bg-nfl-darker/50 border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="text-white">Código de Invitación</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualCodeSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="code" className="text-gray-300">Código</Label>
                    <Input
                      id="code"
                      placeholder="Ingresa el código de invitación"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="bg-nfl-dark/50 border-nfl-light-gray/20 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-nfl-blue hover:bg-nfl-blue/80">
                    Buscar Liga
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {isLoadingLeague && (
            <Card className="bg-nfl-darker/50 border-nfl-light-gray/20">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue mx-auto"></div>
                  <p className="mt-4 text-gray-300">Buscando liga...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {league && (
            <Card className="bg-nfl-darker/50 border-nfl-light-gray/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Trophy className="h-5 w-5 text-nfl-blue" />
                  {league.name}
                  {(league as any)?.invitationType === 'temporary' && (
                    <span className="ml-2 text-xs bg-nfl-blue/20 text-nfl-blue px-2 py-1 rounded-full">
                      Invitación Personal
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mensaje de confirmación mejorado */}
                <div className="bg-nfl-blue/10 border border-nfl-blue/20 rounded-lg p-4">
                  <h4 className="font-medium text-nfl-blue mb-2">
                    ¿Estás seguro que quieres unirte a esta liga?
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Al unirte, participarás en el formato "Survivor" donde cada semana 
                    el equipo con menor puntuación es eliminado hasta que quede un ganador.
                  </p>
                </div>

                {league.description && (
                  <div>
                    <h4 className="font-medium mb-1 text-white">Descripción</h4>
                    <p className="text-gray-300 text-sm">{league.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-300">
                      {members?.length || 0}/{league.max_members || '∞'} participantes
                    </span>
                  </div>
                  {league.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-300">
                        Inicio: {new Date(league.start_date).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  )}
                  {league.entry_fee > 0 && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-300">
                        Inscripción: ${league.entry_fee}
                      </span>
                    </div>
                  )}
                  {league.prize && (
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-300">
                        Premio: {league.prize}
                      </span>
                    </div>
                  )}
                </div>

                <Separator className="bg-nfl-light-gray/20" />

                <div>
                  <h4 className="font-medium mb-2 text-white">Organizador</h4>
                  <p className="text-sm text-gray-300">
                    {league.owner?.full_name} ({league.owner?.email})
                  </p>
                </div>

                {league.status !== 'upcoming' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ Esta liga ya ha comenzado o ha finalizado. No es posible unirse.
                    </p>
                  </div>
                )}

                {!canJoin && league.status === 'upcoming' && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-red-400 text-sm">
                      🚫 Esta liga ha alcanzado el límite máximo de participantes ({league.max_members}).
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    onClick={() => joinLeagueMutation.mutate()}
                    disabled={!canJoin || joinLeagueMutation.isPending}
                    className="w-full bg-nfl-blue hover:bg-nfl-blue/80 text-white"
                    size="lg"
                  >
                    {joinLeagueMutation.isPending 
                      ? '⏳ Uniéndose...' 
                      : '✅ Confirmar y Unirse a la Liga'
                    }
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => navigate('/browse-leagues')}
                    className="w-full border-nfl-light-gray/20 text-gray-300 hover:bg-nfl-dark/50 hover:text-white"
                  >
                    Cancelar y Explorar Otras Ligas
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {(inviteCode || manualCode) && !isLoadingLeague && !league && leagueError && (
            <Card className="bg-nfl-darker/50 border-nfl-light-gray/20">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="text-red-400 text-4xl mb-4">
                    {leagueError.message === 'INVITATION_EXPIRED' ? '⏰' : '❌'}
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-white">
                    {leagueError.message === 'INVITATION_EXPIRED' 
                      ? 'Invitación Expirada' 
                      : 'Liga no encontrada'
                    }
                  </h3>
                  <p className="text-gray-300 mb-4">
                    {getErrorMessage()}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setManualCode('');
                        navigate('/join-league', { replace: true });
                      }}
                      className="border-nfl-light-gray/20 text-gray-300 hover:bg-nfl-dark/50 hover:text-white"
                    >
                      Intentar con otro código
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => navigate('/browse-leagues')}
                      className="bg-nfl-blue hover:bg-nfl-blue/80 text-white"
                    >
                      Explorar Ligas Públicas
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}