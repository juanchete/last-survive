import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Mail, Send, Users, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LeagueInvitation } from '@/types';

interface LeagueInvitationsProps {
  leagueId: string;
  isOwner: boolean;
}

export const LeagueInvitations: React.FC<LeagueInvitationsProps> = ({ leagueId, isOwner }) => {
  const [email, setEmail] = useState('');
  const queryClient = useQueryClient();

  // Obtener invitaciones de la liga
  const { data: invitations, isLoading } = useQuery({
    queryKey: ['league-invitations', leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('league_invitations')
        .select(`
          *,
          inviter:users!league_invitations_inviter_id_fkey(full_name, email),
          league:leagues(name)
        `)
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeagueInvitation[];
    },
    enabled: isOwner,
  });

  // Enviar invitación por email
  const sendInvitationMutation = useMutation({
    mutationFn: async (inviteeEmail: string) => {
      const inviteCode = Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('league_invitations')
        .insert({
          league_id: leagueId,
          inviter_id: currentUser.user.id,
          invitee_email: inviteeEmail,
          invite_code: inviteCode,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Generar enlace de invitación
      const inviteLink = `${window.location.origin}/join-league?code=${inviteCode}`;
      
      return { invitation: data, inviteLink };
    },
    onSuccess: (data) => {
      toast.success('Invitación enviada correctamente');
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['league-invitations', leagueId] });
      
      // Copiar enlace al portapapeles
      navigator.clipboard.writeText(data.inviteLink);
      toast.info('Enlace de invitación copiado al portapapeles');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al enviar la invitación');
    },
  });

  // Cancelar invitación
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('league_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invitación cancelada');
      queryClient.invalidateQueries({ queryKey: ['league-invitations', leagueId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al cancelar la invitación');
    },
  });

  // Generar enlace de invitación directo
  const generateInviteLinkMutation = useMutation({
    mutationFn: async () => {
      const { data: league } = await supabase
        .from('leagues')
        .select('private_code')
        .eq('id', leagueId)
        .single();

      if (!league?.private_code) {
        // Generar código privado si no existe
        const privateCode = Math.random().toString(36).substring(2, 15);
        await supabase
          .from('leagues')
          .update({ private_code: privateCode })
          .eq('id', leagueId);
        
        return `${window.location.origin}/join-league?code=${privateCode}`;
      }

      return `${window.location.origin}/join-league?code=${league.private_code}`;
    },
    onSuccess: (inviteLink) => {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Enlace de invitación copiado al portapapeles');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al generar el enlace');
    },
  });

  const handleSendInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Por favor ingresa un email válido');
      return;
    }

    sendInvitationMutation.mutate(email);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      accepted: 'default',
      declined: 'destructive',
      expired: 'secondary',
      cancelled: 'secondary',
    };

    const labels: Record<string, string> = {
      pending: 'Pendiente',
      accepted: 'Aceptada',
      declined: 'Rechazada',
      expired: 'Expirada',
      cancelled: 'Cancelada',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (!isOwner) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invitar Jugadores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSendInvitation} className="space-y-4">
            <div>
              <Label htmlFor="email">Email del jugador</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="jugador@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={sendInvitationMutation.isPending}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => generateInviteLinkMutation.mutate()}
              disabled={generateInviteLinkMutation.isPending}
              className="flex-1"
            >
              <Link className="h-4 w-4 mr-2" />
              Copiar Enlace de Invitación
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitaciones Enviadas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Cargando invitaciones...</div>
          ) : !invitations?.length ? (
            <div className="text-center py-4 text-muted-foreground">
              No has enviado ninguna invitación aún
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invitation.invitee_email}</p>
                      <p className="text-sm text-muted-foreground">
                        Enviada el {new Date(invitation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(invitation.status)}
                    {invitation.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                        disabled={cancelInvitationMutation.isPending}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 