import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface DraftMessage {
  type: string;
  userName?: string;
  teamId?: string;
  playerId?: string;
  playerName?: string;
  timestamp: string;
}

export function useDraftRealtimeSimple(leagueId: string, teamId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('');
  const [messages, setMessages] = useState<DraftMessage[]>([]);
  const [connectedTeams, setConnectedTeams] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Function to create and connect to channel
  const connectToChannel = () => {
    if (!leagueId || !user || isConnectingRef.current) {
      console.log('[DraftRealtimeSimple] Skipping connection - missing requirements or already connecting');
      return null;
    }

    isConnectingRef.current = true;
    console.log('[DraftRealtimeSimple] Setting up channel for league:', leagueId, 'team:', teamId);
    
    // Clean up any existing channel for this league first
    const existingChannels = supabase.getChannels();
    existingChannels.forEach(ch => {
      if (ch.topic === `draft-${leagueId}`) {
        console.log('[DraftRealtimeSimple] Removing existing channel before creating new one');
        supabase.removeChannel(ch);
      }
    });
    
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
          queryClient.invalidateQueries({ queryKey: ['recentDraftPicks', leagueId] });
        } else if (message.type === 'draft_started') {
          toast.success('Draft has started!');
          queryClient.invalidateQueries({ queryKey: ['draftState', leagueId] });
        } else if (message.type === 'user_joined') {
          // Track connected team
          console.log('[DraftRealtimeSimple] User joined with teamId:', message.teamId);
          if (message.teamId) {
            setConnectedTeams(prev => {
              const newSet = new Set([...prev, message.teamId!]);
              console.log('[DraftRealtimeSimple] Connected teams:', Array.from(newSet));
              return newSet;
            });
          }
        } else if (message.type === 'user_left') {
          // Remove disconnected team
          console.log('[DraftRealtimeSimple] User left with teamId:', message.teamId);
          if (message.teamId) {
            setConnectedTeams(prev => {
              const newSet = new Set(prev);
              newSet.delete(message.teamId!);
              console.log('[DraftRealtimeSimple] Connected teams after leave:', Array.from(newSet));
              return newSet;
            });
          }
        } else if (message.type === 'presence_request') {
          // Someone is requesting presence, respond with our team ID
          console.log('[DraftRealtimeSimple] Presence requested, responding with teamId:', teamId);
          if (teamId) {
            channel.send({
              type: 'broadcast',
              event: 'draft-message',
              payload: {
                type: 'presence_response',
                userName: user.email?.split('@')[0] || 'Unknown',
                teamId: teamId,
                timestamp: new Date().toISOString()
              }
            });
          }
        } else if (message.type === 'presence_response') {
          // Someone responded to presence request
          console.log('[DraftRealtimeSimple] Presence response from teamId:', message.teamId);
          if (message.teamId) {
            setConnectedTeams(prev => {
              const newSet = new Set([...prev, message.teamId!]);
              console.log('[DraftRealtimeSimple] Connected teams after presence response:', Array.from(newSet));
              return newSet;
            });
          }
        }
      })
      .subscribe((status) => {
        console.log('[DraftRealtimeSimple] Channel status:', status);
        setStatus(status);
        setIsConnected(status === 'SUBSCRIBED');
        isConnectingRef.current = false;
        
        if (status === 'SUBSCRIBED') {
          // Clear any pending reconnect timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          // Add own team to connected teams immediately
          if (teamId) {
            setConnectedTeams(prev => new Set([...prev, teamId]));
          }
          
          // Send join message with team ID
          channel.send({
            type: 'broadcast',
            event: 'draft-message',
            payload: {
              type: 'user_joined',
              userName: user.email?.split('@')[0] || 'Unknown',
              teamId: teamId,
              timestamp: new Date().toISOString()
            }
          });
          
          // Request presence from all connected users
          setTimeout(() => {
            channel.send({
              type: 'broadcast',
              event: 'draft-message',
              payload: {
                type: 'presence_request',
                userName: user.email?.split('@')[0] || 'Unknown',
                teamId: teamId,
                timestamp: new Date().toISOString()
              }
            });
          }, 500); // Small delay to ensure others receive join message first
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Handle connection errors and attempt reconnection
          console.log('[DraftRealtimeSimple] Connection failed, will attempt reconnection:', status);
          isConnectingRef.current = false;
          setIsConnected(false);
          
          // Schedule reconnection attempt
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('[DraftRealtimeSimple] Attempting to reconnect...');
              reconnectTimeoutRef.current = null;
              connectToChannel();
            }, 3000); // Retry after 3 seconds
          }
        }
      });

    return channel;
  };

  // Handle visibility change for page re-focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && !isConnectingRef.current) {
        console.log('[DraftRealtimeSimple] Page became visible, reconnecting...');
        const channel = connectToChannel();
        if (channel) {
          channelRef.current = channel;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [leagueId, user, teamId, isConnected]);

  useEffect(() => {
    if (!leagueId || !user) {
      console.log('[DraftRealtimeSimple] Missing leagueId or user');
      return;
    }

    const channel = connectToChannel();
    if (channel) {
      channelRef.current = channel;
    }

    return () => {
      console.log('[DraftRealtimeSimple] Cleaning up channel');
      isConnectingRef.current = false;
      
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (channelRef.current && teamId) {
        // Remove own team from connected teams
        setConnectedTeams(prev => {
          const newSet = new Set(prev);
          newSet.delete(teamId);
          return newSet;
        });
        
        // Send leave message before disconnecting
        channelRef.current.send({
          type: 'broadcast',
          event: 'draft-message',
          payload: {
            type: 'user_left',
            userName: user?.email?.split('@')[0] || 'Unknown',
            teamId: teamId,
            timestamp: new Date().toISOString()
          }
        }).then(() => {
          supabase.removeChannel(channelRef.current!);
        });
      } else if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [leagueId, user, queryClient, teamId]);

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
      teamId: teamId,
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

  // Function to request presence update from all connected users
  const requestPresence = async () => {
    await sendMessage({
      type: 'presence_request',
      userName: user?.email?.split('@')[0] || 'Unknown',
      teamId: teamId,
      timestamp: new Date().toISOString()
    });
  };

  return {
    isConnected,
    status,
    messages,
    connectedTeams,
    broadcastPick,
    broadcastDraftStatus,
    sendMessage,
    requestPresence
  };
}