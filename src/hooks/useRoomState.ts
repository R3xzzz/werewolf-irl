import { useEffect, useState } from 'react';
import { supabase, Room } from '../lib/supabase';

export function useRoomState(roomCode: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Initial fetch
    const fetchRoom = async () => {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', roomCode)
          .single();

        if (error) throw error;
        if (isMounted) {
          setRoom(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          // Intentionally not using console.error to avoid Next.js dev overlay
          setError(err.message || "Room not found");
          setLoading(false);
        }
      }
    };

    fetchRoom();

    // Subscribe to changes
    const subscription = supabase
      .channel(`room:${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `code=eq.${roomCode}`
        },
        (payload) => {
          if (isMounted) {
            if (payload.eventType === 'DELETE') {
              setRoom(null);
              setError("Room has been closed by the host.");
            } else {
              setRoom(payload.new as Room);
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [roomCode]);

  return { room, loading, error };
}
