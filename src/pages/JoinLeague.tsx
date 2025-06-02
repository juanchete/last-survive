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

export default function JoinLeague() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');
  const inviteCode = searchParams.get('code');

  // Obtener información de la liga por código
  const { data: league, isLoading: isLoadingLeague } = useQuery({
    queryKey: ['league-by-code', inviteCode || manualCode],
    queryFn: async () => {
      const code = inviteCode || manualCode;
      if (!code) return null;

      // Buscar por código de invitación directo
      const { data: invitation } = await supabase
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

      if (invitation) {
        return invitation.league as League;
      }

      // Buscar por código privado de liga
      const { data: leagueData, error } = await supabase
        .from('leagues')
        .select(`
          *,
          owner:users!leagues_owner_id_fkey(full_name, email)
        `)
        .eq('private_code', code)
        .single();

      if (error) throw new Error('Liga no encontrada o código inválido');
      return leagueData as League;
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

      // Marcar invitación como aceptada si existe
      if (inviteCode) {
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header con botón de regreso */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/hub')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Regresar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Unirse a Liga</h1>
            <p className="text-gray-600 mt-1">
              Ingresa el código de invitación para unirte a una liga
            </p>
          </div>
        </div>

        {!inviteCode && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Código de Invitación</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualCodeSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    placeholder="Ingresa el código de invitación"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Buscar Liga
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoadingLeague && (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Buscando liga...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {league && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {league.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {league.description && (
                <p className="text-gray-600">{league.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {members?.length || 0}/{league.max_members || '∞'} participantes
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    Inicio: {new Date(league.start_date).toLocaleDateString()}
                  </span>
                </div>
                {league.entry_fee > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Inscripción: ${league.entry_fee}
                    </span>
                  </div>
                )}
                {league.prize && (
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Premio: {league.prize}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-2">Organizador</h3>
                <p className="text-sm text-gray-600">
                  {league.owner?.full_name} ({league.owner?.email})
                </p>
              </div>

              {league.status !== 'upcoming' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    Esta liga ya ha comenzado o ha finalizado. No es posible unirse.
                  </p>
                </div>
              )}

              {!canJoin && league.status === 'upcoming' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">
                    Esta liga ha alcanzado el límite máximo de participantes.
                  </p>
                </div>
              )}

              <Button
                onClick={() => joinLeagueMutation.mutate()}
                disabled={!canJoin || joinLeagueMutation.isPending}
                className="w-full"
                size="lg"
              >
                {joinLeagueMutation.isPending ? 'Uniéndose...' : 'Unirse a la Liga'}
              </Button>
            </CardContent>
          </Card>
        )}

        {(inviteCode || manualCode) && !isLoadingLeague && !league && (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="text-red-500 text-4xl mb-4">❌</div>
                <h3 className="font-semibold text-lg mb-2">Liga no encontrada</h3>
                <p className="text-gray-600 mb-4">
                  El código de invitación no es válido o ha expirado.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setManualCode('');
                    navigate('/join-league', { replace: true });
                  }}
                >
                  Intentar con otro código
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 