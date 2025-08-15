import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface DraftEvent {
  type: 'pick_made' | 'turn_changed' | 'draft_started' | 'draft_paused' | 'draft_completed' | 'user_joined' | 'user_left';
  userId?: string;
  userName?: string;
  playerId?: string;
  playerName?: string;
  currentPick?: number;
  currentTeamId?: string;
  timestamp: string;
}

interface PresenceState {
  [key: string]: {
    user_id: string;
    user_name: string;
    online_at: string;
  }[];
}

export function useDraftRealtime(leagueId: string, enabled: boolean = true) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<PresenceState>({});
  const [lastEvent, setLastEvent] = useState<DraftEvent | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!enabled || !leagueId || !user) {
      console.log('[DraftRealtime] Missing requirements:', { enabled, leagueId, user });
      return;
    }

    // Clean up any existing channels first
    const existingChannels = supabase.getChannels();
    console.log('[DraftRealtime] Existing channels:', existingChannels.length);
    existingChannels.forEach(ch => {
      if (ch.topic.includes('draft')) {
        console.log('[DraftRealtime] Removing old channel:', ch.topic);
        supabase.removeChannel(ch);
      }
    });

    console.log('[DraftRealtime] Initializing draft channel for league:', leagueId, 'user:', user.id);

    // Create a single channel for all draft communications
    // Use a simpler approach without complex config
    const channel = supabase.channel(`draft-${leagueId}`);

    channelRef.current = channel;

    // Subscribe to the channel first, then add listeners
    channel.subscribe(async (status) => {
        console.log('[DraftRealtime] Channel status:', status, 'Error:', error);
        
        if (error) {
          console.error('[DraftRealtime] Subscription error:', error);
          setConnectionError(error.message || 'Connection failed');
        }
        
        setIsConnected(status === 'SUBSCRIBED');

        if (status === 'SUBSCRIBED') {
          console.log('[DraftRealtime] Successfully subscribed to channel');
          setConnectionError(null);
          
          // Track user presence
          const userStatus = {
            user_id: user.id,
            user_name: user.email?.split('@')[0] || 'Unknown',
            online_at: new Date().toISOString()
          };
          
          try {
            const trackResult = await channel.track(userStatus);
            console.log('[DraftRealtime] Track result:', trackResult);
            
            if (trackResult === 'ok') {
              console.log('[DraftRealtime] Successfully tracked presence:', userStatus);
              
              // Announce that user joined
              await broadcastEvent({
                type: 'user_joined',
                userId: user.id,
                userName: userStatus.user_name,
                timestamp: new Date().toISOString()
              });
            } else {
              console.error('[DraftRealtime] Failed to track presence:', trackResult);
            }
          } catch (trackError) {
            console.error('[DraftRealtime] Error tracking presence:', trackError);
          }
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          setConnectionError('Connection closed');
          console.log('[DraftRealtime] Channel closed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[DraftRealtime] Channel error');
          setIsConnected(false);
          setConnectionError('Channel error');
        } else if (status === 'TIMED_OUT') {
          console.error('[DraftRealtime] Connection timed out');
          setIsConnected(false);
          setConnectionError('Connection timed out');
        }
      });

    // Cleanup function
    return () => {
      console.log('[DraftRealtime] Cleaning up draft channel');
      if (channelRef.current) {
        // Announce that user is leaving
        broadcastEvent({
          type: 'user_left',
          userId: user.id,
          userName: user.email?.split('@')[0] || 'Unknown',
          timestamp: new Date().toISOString()
        }).then(() => {
          supabase.removeChannel(channelRef.current!);
          channelRef.current = null;
        });
      }
    };
  }, [leagueId, enabled, user, queryClient]);

  // Function to broadcast draft events
  const broadcastEvent = async (event: DraftEvent) => {
    if (!channelRef.current) {
      console.error('[DraftRealtime] No channel available for broadcasting');
      return;
    }

    console.log('[DraftRealtime] Broadcasting event:', event);
    
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'draft_event',
        payload: event
      });
    } catch (error) {
      console.error('[DraftRealtime] Error broadcasting event:', error);
    }
  };

  // Function to broadcast a pick
  const broadcastPick = async (playerId: string, playerName: string) => {
    await broadcastEvent({
      type: 'pick_made',
      userId: user?.id,
      userName: user?.email?.split('@')[0] || 'Unknown',
      playerId,
      playerName,
      timestamp: new Date().toISOString()
    });
  };

  // Function to broadcast turn change
  const broadcastTurnChange = async (currentPick: number, currentTeamId: string) => {
    await broadcastEvent({
      type: 'turn_changed',
      currentPick,
      currentTeamId,
      timestamp: new Date().toISOString()
    });
  };

  // Function to broadcast draft status changes
  const broadcastDraftStatus = async (status: 'draft_started' | 'draft_paused' | 'draft_completed') => {
    await broadcastEvent({
      type: status,
      userId: user?.id,
      userName: user?.email?.split('@')[0] || 'Unknown',
      timestamp: new Date().toISOString()
    });
  };

  // Get count of active users
  const activeUserCount = Object.keys(activeUsers).reduce((count, key) => {
    return count + (activeUsers[key]?.length || 0);
  }, 0);

  return {
    isConnected,
    activeUsers,
    activeUserCount,
    lastEvent,
    connectionError,
    broadcastPick,
    broadcastTurnChange,
    broadcastDraftStatus,
    broadcastEvent
  };
}