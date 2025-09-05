import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  UserPlus, 
  Mail, 
  Link, 
  Copy, 
  Share,
  Users,
  Calendar,
  DollarSign,
  Trophy
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InvitePlayerToLeagueProps {
  leagueId: string;
  league: {
    id: string;
    name: string;
    private_code: string | null;
    entry_fee: number;
    max_members: number;
    start_date: string | null;
    prize: string | null;
  };
  isOwner: boolean;
}

export function InvitePlayerToLeague({ leagueId, league, isOwner }: InvitePlayerToLeagueProps) {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Generate invite link
  const inviteLink = league.private_code 
    ? `${window.location.origin}/join-league?code=${league.private_code}`
    : null;

  // Send email invitation
  const sendEmailInviteMutation = useMutation({
    mutationFn: async ({ email, message }: { email: string; message?: string }) => {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Usuario no autenticado');

      // Check if invitation already exists for this email
      const { data: existingInvite } = await supabase
        .from('league_invitations')
        .select('id, invite_code, status')
        .eq('league_id', leagueId)
        .eq('invitee_email', email)
        .single();

      let inviteCode: string;

      if (existingInvite) {
        // If there's a pending or recent invitation, use existing code
        if (existingInvite.status === 'pending' || existingInvite.status === 'expired') {
          inviteCode = existingInvite.invite_code;
          
          // Update the existing invitation to pending and extend expiry
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          
          const { error: updateError } = await supabase
            .from('league_invitations')
            .update({
              status: 'pending',
              expires_at: expiresAt.toISOString(),
              inviter_id: currentUser.user.id
            })
            .eq('id', existingInvite.id);

          if (updateError) throw updateError;
        } else {
          throw new Error('Ya existe una invitación activa para este email');
        }
      } else {
        // Create new invitation
        inviteCode = Math.random().toString(36).substring(2, 12).toUpperCase();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

        const { error: inviteError } = await supabase
          .from('league_invitations')
          .insert({
            league_id: leagueId,
            inviter_id: currentUser.user.id,
            invitee_email: email,
            invite_code: inviteCode,
            status: 'pending',
            expires_at: expiresAt.toISOString()
          });

        if (inviteError) throw inviteError;
      }

      const inviteLink = `${window.location.origin}/join-league?code=${inviteCode}`;
      
      // Open user's email client with pre-filled message
      const subject = `Invitación a unirse a la liga fantasy: ${league.name}`;
      const body = `¡Hola!

${message || 'Te invito a unirte a nuestra liga de fantasy football:'} 

🏈 Liga: ${league.name}
${league.entry_fee > 0 ? `💰 Entrada: $${league.entry_fee}` : ''}
${league.start_date ? `📅 Inicio: ${new Date(league.start_date).toLocaleDateString('es-ES')}` : ''}
${league.prize ? `🏆 Premio: ${league.prize}` : ''}

Para unirte, simplemente haz clic en este enlace:
${inviteLink}

O usa el código de invitación: ${inviteCode}

¡Esperamos que te unas!

---
Enviado desde NFL Fantasy Survivor`;

      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      // Open email client
      window.open(mailtoLink, '_blank');

      return {
        inviteCode,
        inviteLink,
        email,
        mailtoLink
      };
    },
    onSuccess: (data) => {
      toast.success(`Email abierto para ${data.email}`);
      toast.info('Se abrió tu cliente de email con la invitación lista para enviar', {
        duration: 5000,
      });
      setInviteEmail('');
      setInviteMessage('');
      setShowInviteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['league-invitations', leagueId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al enviar invitación');
    },
  });

  // Copy invite link to clipboard
  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Link de invitación copiado al portapapeles');
    }
  };

  // Copy league code to clipboard
  const copyLeagueCode = () => {
    if (league.private_code) {
      navigator.clipboard.writeText(league.private_code);
      toast.success('Código de liga copiado al portapapeles');
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <Card className="bg-nfl-darker/50 border-nfl-light-gray/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <UserPlus className="h-5 w-5 text-nfl-blue" />
            Invitar Jugadores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Send Email Invite */}
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Mail className="h-4 w-4 mr-2" />
                  Invitar por Email
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-nfl-dark border-nfl-light-gray/20">
                <DialogHeader>
                  <DialogTitle className="text-white">Invitar Jugador por Email</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-gray-300">Email del jugador</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jugador@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="bg-nfl-dark/50 border-nfl-light-gray/20 text-white mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="message" className="text-gray-300">Mensaje personalizado (opcional)</Label>
                    <Textarea
                      id="message"
                      placeholder="¡Te invito a unirte a nuestra liga fantasy! Va a estar genial..."
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      className="bg-nfl-dark/50 border-nfl-light-gray/20 text-white mt-1"
                      rows={3}
                    />
                  </div>
                  
                  <Button
                    onClick={() => sendEmailInviteMutation.mutate({ email: inviteEmail, message: inviteMessage })}
                    disabled={!inviteEmail || sendEmailInviteMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {sendEmailInviteMutation.isPending ? '⏳ Enviando...' : '📨 Enviar Invitación'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Share League Code */}
            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-nfl-light-gray/20 text-gray-300 hover:bg-nfl-blue/10">
                  <Share className="h-4 w-4 mr-2" />
                  Compartir Código
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-nfl-dark border-nfl-light-gray/20">
                <DialogHeader>
                  <DialogTitle className="text-white">Compartir Liga</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* League Info */}
                  <div className="bg-nfl-gray/30 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-2">{league.name}</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {league.entry_fee > 0 && (
                        <div className="flex items-center gap-1 text-gray-300">
                          <DollarSign className="h-3 w-3" />
                          ${league.entry_fee}
                        </div>
                      )}
                      {league.max_members && (
                        <div className="flex items-center gap-1 text-gray-300">
                          <Users className="h-3 w-3" />
                          Max {league.max_members}
                        </div>
                      )}
                      {league.start_date && (
                        <div className="flex items-center gap-1 text-gray-300">
                          <Calendar className="h-3 w-3" />
                          {new Date(league.start_date).toLocaleDateString('es-ES')}
                        </div>
                      )}
                      {league.prize && (
                        <div className="flex items-center gap-1 text-gray-300">
                          <Trophy className="h-3 w-3" />
                          {league.prize}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* League Code */}
                  {league.private_code && (
                    <div>
                      <Label className="text-gray-300">Código de Liga</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={league.private_code}
                          readOnly
                          className="bg-nfl-dark/50 border-nfl-light-gray/20 text-white font-mono text-lg text-center"
                        />
                        <Button
                          onClick={copyLeagueCode}
                          variant="outline"
                          size="icon"
                          className="border-nfl-light-gray/20"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Invite Link */}
                  {inviteLink && (
                    <div>
                      <Label className="text-gray-300">Link de Invitación</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={inviteLink}
                          readOnly
                          className="bg-nfl-dark/50 border-nfl-light-gray/20 text-white text-sm"
                        />
                        <Button
                          onClick={copyInviteLink}
                          variant="outline"
                          size="icon"
                          className="border-nfl-light-gray/20"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Copy Link Button */}
            {inviteLink && (
              <Button
                onClick={copyInviteLink}
                variant="outline"
                className="w-full border-nfl-blue/20 text-nfl-blue hover:bg-nfl-blue/10"
              >
                <Link className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-nfl-blue/10 border border-nfl-blue/20 rounded-lg p-3">
            <h4 className="text-sm font-medium text-nfl-blue mb-2">¿Cómo invitar jugadores?</h4>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• <strong>Por email:</strong> Envía invitación directa con link personalizado</li>
              <li>• <strong>Compartir código:</strong> Comparte el código {league.private_code} para que se unan</li>
              <li>• <strong>Copiar link:</strong> Comparte el link directo de invitación</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}