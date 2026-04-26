import { useEffect, useState } from 'react';
import { supabase, Player } from '../lib/supabase';

export function usePlayers(roomId: string | undefined) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', roomId)
          .order('joined_at', { ascending: true });

        if (error) throw error;
        if (isMounted) {
          setPlayers(data || []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching players:", err);
        if (isMounted) setLoading(false);
      }
    };

    fetchPlayers();

    const subscription = supabase
      .channel(`players:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          if (isMounted) {
            setPlayers(prev => {
              if (payload.eventType === 'INSERT') {
                if (prev.some(p => p.id === payload.new.id)) return prev;
                return [...prev, payload.new as Player].sort((a,b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
              } 
              if (payload.eventType === 'UPDATE') {
                return prev.map(p => p.id === payload.new.id ? payload.new as Player : p);
              } 
              if (payload.eventType === 'DELETE') {
                return prev.filter(p => p.id !== payload.old.id);
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [roomId]);

  return { players, loading, setPlayers };
}
