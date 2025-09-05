import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UserPlus, 
  Clock, 
  MessageSquare, 
  Check, 
  X, 
  Users,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LeagueJoinRequest {
  id: string;
  league_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  message: string | null;
  response_message: string | null;
  created_at: string;
  responded_at: string | null;
  responded_by: string | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    favorite_team?: string;
  };
}

interface LeagueJoinRequestsProps {
  leagueId: string;
  isOwner: boolean;
}

export function LeagueJoinRequests({ leagueId, isOwner }: LeagueJoinRequestsProps) {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<LeagueJoinRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [responseAction, setResponseAction] = useState<'approve' | 'reject'>('approve');

  // Fetch pending join requests for this league
  const { data: joinRequests = [], isLoading } = useQuery({
    queryKey: ['league-join-requests', leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('league_join_requests')
        .select(`
          id,
          league_id,
          user_id,
          status,
          message,
          response_message,
          created_at,
          responded_at,
          responded_by,
          user:users!league_join_requests_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            favorite_team
          )
        `)
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeagueJoinRequest[];
    },
    enabled: !!leagueId && isOwner,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Respond to join request
  const respondToRequestMutation = useMutation({
    mutationFn: async ({ requestId, action, message }: { 
      requestId: string; 
      action: 'approve' | 'reject'; 
      message?: string;
    }) => {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Usuario no autenticado');

      const request = joinRequests.find(r => r.id === requestId);
      if (!request) throw new Error('Solicitud no encontrada');

      if (action === 'approve') {
        // First update the request status
        const { error: updateError } = await supabase
          .from('league_join_requests')
          .update({
            status: 'approved',
            response_message: message || null,
            responded_at: new Date().toISOString(),
            responded_by: currentUser.user.id
          })
          .eq('id', requestId);

        if (updateError) throw updateError;

        // Create fantasy team for the user
        const { data: fantasyTeam, error: teamError } = await supabase
          .from('fantasy_teams')
          .insert({
            league_id: request.league_id,
            user_id: request.user_id,
            name: `Equipo de ${request.user?.full_name || request.user?.email?.split('@')[0]}`,
            points: 0,
            rank: 1, // Will be updated when league starts
            eliminated: false,
          })
          .select()
          .single();

        if (teamError) throw teamError;

        // Add user to league members
        const { error: memberError } = await supabase
          .from('league_members')
          .insert({
            league_id: request.league_id,
            user_id: request.user_id,
            role: 'member',
            team_id: fantasyTeam.id,
          });

        if (memberError) throw memberError;

        // Send notification to user
        await supabase
          .from('notifications')
          .insert({
            user_id: request.user_id,
            league_id: request.league_id,
            message: `¡Tu solicitud para unirte a la liga ha sido aprobada! Bienvenido.`,
            type: 'success'
          });

      } else {
        // Reject request
        const { error: updateError } = await supabase
          .from('league_join_requests')
          .update({
            status: 'rejected',
            response_message: message || null,
            responded_at: new Date().toISOString(),
            responded_by: currentUser.user.id
          })
          .eq('id', requestId);

        if (updateError) throw updateError;

        // Send notification to user
        await supabase
          .from('notifications')
          .insert({
            user_id: request.user_id,
            league_id: request.league_id,
            message: `Tu solicitud para unirte a la liga fue ${message ? `rechazada: ${message}` : 'rechazada'}`,
            type: 'warning'
          });
      }
    },
    onSuccess: (_, variables) => {
      toast.success(`Solicitud ${variables.action === 'approve' ? 'aprobada' : 'rechazada'} exitosamente`);
      setShowResponseDialog(false);
      setSelectedRequest(null);
      setResponseMessage('');
      queryClient.invalidateQueries({ queryKey: ['league-join-requests', leagueId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al procesar solicitud');
    },
  });

  const handleRespond = (request: LeagueJoinRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setResponseAction(action);
    setResponseMessage('');
    setShowResponseDialog(true);
  };

  const pendingRequests = joinRequests.filter(r => r.status === 'pending');
  const processedRequests = joinRequests.filter(r => r.status !== 'pending');

  if (!isOwner) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card className="bg-nfl-darker/50 border-nfl-light-gray/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <UserPlus className="h-5 w-5 text-nfl-blue" />
            Solicitudes Pendientes
            {pendingRequests.length > 0 && (
              <Badge className="bg-orange-600 text-white">
                {pendingRequests.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-nfl-blue mx-auto"></div>
              <p className="text-gray-400 mt-2 text-sm">Cargando solicitudes...</p>
            </div>
          ) : pendingRequests.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-gray-300">
                No hay solicitudes pendientes para esta liga.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-nfl-dark/50 border border-nfl-light-gray/20 rounded-lg p-4"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.user?.avatar_url} />
                      <AvatarFallback className="bg-nfl-blue text-white">
                        {request.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-white">
                          {request.user?.full_name || 'Usuario'}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(request.created_at).toLocaleDateString('es-ES')}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-2">
                        {request.user?.email}
                      </p>

                      {request.message && (
                        <div className="bg-nfl-gray/30 border-l-2 border-nfl-blue pl-3 py-2 mb-3">
                          <p className="text-gray-300 text-sm">
                            <MessageSquare className="h-3 w-3 inline mr-1" />
                            {request.message}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRespond(request, 'approve')}
                          disabled={respondToRequestMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aprobar
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRespond(request, 'reject')}
                          disabled={respondToRequestMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests History */}
      {processedRequests.length > 0 && (
        <Card className="bg-nfl-darker/50 border-nfl-light-gray/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-gray-400" />
              Historial de Solicitudes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-3 p-3 bg-nfl-dark/30 rounded-lg"
                >
                  <Badge 
                    variant={request.status === 'approved' ? 'success' : 'destructive'}
                    className="text-xs"
                  >
                    {request.status === 'approved' ? '✅ Aprobada' : '❌ Rechazada'}
                  </Badge>
                  
                  <div className="flex-1 text-sm">
                    <span className="text-white">{request.user?.full_name}</span>
                    <span className="text-gray-400 ml-2">
                      {new Date(request.responded_at || request.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="bg-nfl-dark border-nfl-light-gray/20">
          <DialogHeader>
            <DialogTitle className="text-white">
              {responseAction === 'approve' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedRequest.user?.avatar_url} />
                  <AvatarFallback className="bg-nfl-blue text-white">
                    {selectedRequest.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-white">
                    {selectedRequest.user?.full_name}
                  </p>
                  <p className="text-sm text-gray-400">
                    {selectedRequest.user?.email}
                  </p>
                </div>
              </div>

              {selectedRequest.message && (
                <div className="bg-nfl-gray/30 border-l-2 border-nfl-blue pl-3 py-2">
                  <p className="text-sm text-gray-300">
                    <strong>Mensaje del usuario:</strong><br />
                    {selectedRequest.message}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="response" className="text-gray-300">
                  {responseAction === 'approve' 
                    ? 'Mensaje de bienvenida (opcional)' 
                    : 'Motivo del rechazo (opcional)'
                  }
                </Label>
                <Textarea
                  id="response"
                  placeholder={responseAction === 'approve' 
                    ? 'Ej: ¡Bienvenido a la liga! Esperamos que disfrutes la competencia.'
                    : 'Ej: Lo sentimos, la liga ya está completa.'
                  }
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  className="bg-nfl-dark/50 border-nfl-light-gray/20 text-white placeholder:text-gray-500 mt-2"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    if (selectedRequest) {
                      respondToRequestMutation.mutate({
                        requestId: selectedRequest.id,
                        action: responseAction,
                        message: responseMessage.trim() || undefined
                      });
                    }
                  }}
                  disabled={respondToRequestMutation.isPending}
                  className={responseAction === 'approve' 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {respondToRequestMutation.isPending ? (
                    <>⏳ Procesando...</>
                  ) : (
                    <>
                      {responseAction === 'approve' ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Aprobar Solicitud
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Rechazar Solicitud
                        </>
                      )}
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowResponseDialog(false)}
                  disabled={respondToRequestMutation.isPending}
                  className="border-nfl-light-gray/20 text-gray-300 hover:bg-nfl-dark/50"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}