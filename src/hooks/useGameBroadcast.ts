import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface GamePopupEvent {
  type: 'popup';
  visibility: 'public' | 'private';
  targetId?: string;
  title_en: string;
  title_id: string;
  desc_en?: string;
  desc_id?: string;
  icon?: string;
  durationMs?: number;
}

export function useGameBroadcast(roomCode: string | null, onPopup?: (popup: GamePopupEvent) => void) {
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!roomCode) return;

    // Use a separate channel for custom events to avoid colliding with postgres_changes if needed
    const broadcastChannel = supabase.channel(`room_events:${roomCode}`, {
      config: {
        broadcast: { ack: true },
      },
    });

    broadcastChannel
      .on('broadcast', { event: 'popup' }, ({ payload }) => {
        if (onPopup && payload) {
          onPopup(payload as GamePopupEvent);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setChannel(broadcastChannel);
        }
      });

    return () => {
      supabase.removeChannel(broadcastChannel);
      setChannel(null);
    };
  }, [roomCode, onPopup]);

  const sendPopup = useCallback(async (popup: GamePopupEvent) => {
    if (!channel) return;
    await channel.send({
      type: 'broadcast',
      event: 'popup',
      payload: popup,
    });
  }, [channel]);

  return { sendPopup, isConnected: !!channel };
}
