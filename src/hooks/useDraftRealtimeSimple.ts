import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface DraftMessage {
  type: string;
  userName?: string;
  playerId?: string;
  playerName?: string;
  timestamp: string;
}

export function useDraftRealtimeSimple(leagueId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('');
  const [messages, setMessages] = useState<DraftMessage[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!leagueId || !user) {
      console.log('[DraftRealtimeSimple] Missing leagueId or user');
      return;
    }

    console.log('[DraftRealtimeSimple] Setting up channel for league:', leagueId);
    
    // Create channel exactly like the test that worked
    const channel = supabase
      .channel(`draft-${leagueId}`)
      .on('broadcast', { event: 'draft-message' }, (payload) => {
        console.log('[DraftRealtimeSimple] Received broadcast:', payload);
        const message = payload.payload as DraftMessage;
        setMessages(prev => [...prev, message]);
        
        // Handle the message
        if (message.type === 'pick_made') {
          toast.info(`${message.userName} drafted ${message.playerName}!`);
          // Refresh data
          queryClient.invalidateQueries({ queryKey: ['draftState', leagueId] });
          queryClient.invalidateQueries({ queryKey: ['availablePlayers', leagueId] });
          queryClient.invalidateQueries({ queryKey: ['draftRoster'] });
        } else if (message.type === 'draft_started') {
          toast.success('Draft has started!');
          queryClient.invalidateQueries({ queryKey: ['draftState', leagueId] });
        }
      })
      .subscribe((status) => {
        console.log('[DraftRealtimeSimple] Channel status:', status);
        setStatus(status);
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          // Send join message
          channel.send({
            type: 'broadcast',
            event: 'draft-message',
            payload: {
              type: 'user_joined',
              userName: user.email?.split('@')[0] || 'Unknown',
              timestamp: new Date().toISOString()
            }
          });
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[DraftRealtimeSimple] Cleaning up channel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [leagueId, user, queryClient]);

  // Function to send a message
  const sendMessage = async (message: DraftMessage) => {
    if (!channelRef.current) {
      console.error('[DraftRealtimeSimple] No channel available');
      return;
    }

    const result = await channelRef.current.send({
      type: 'broadcast',
      event: 'draft-message',
      payload: message
    });
    console.log('[DraftRealtimeSimple] Send result:', result);
  };

  // Function to broadcast a pick
  const broadcastPick = async (playerId: string, playerName: string) => {
    await sendMessage({
      type: 'pick_made',
      userName: user?.email?.split('@')[0] || 'Unknown',
      playerId,
      playerName,
      timestamp: new Date().toISOString()
    });
  };

  // Function to broadcast draft status
  const broadcastDraftStatus = async (draftStatus: string) => {
    await sendMessage({
      type: draftStatus,
      userName: user?.email?.split('@')[0] || 'Unknown',
      timestamp: new Date().toISOString()
    });
  };

  return {
    isConnected,
    status,
    messages,
    broadcastPick,
    broadcastDraftStatus,
    sendMessage
  };
}