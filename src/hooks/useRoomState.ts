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
    let subscription: any = null;

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
          
          // Subscribe to changes using ID so DELETE events are caught (PK is always in payload)
          const sub = supabase
            .channel(`room:${data.id}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'rooms',
                filter: `id=eq.${data.id}`
              },
              (payload) => {
                if (isMounted) {
                  if (payload.eventType === 'DELETE') {
                    setRoom(null);
                    setError("Room has been closed.");
                  } else {
                    setRoom(payload.new as Room);
                  }
                }
              }
            )
            .subscribe();
            
          subscription = sub;
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Room not found");
          setRoom(null);
          setLoading(false);
        }
      }
    };

    fetchRoom();

    return () => {
      isMounted = false;
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [roomCode]);

  return { room, loading, error };
}
