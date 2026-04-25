import { useEffect, useState } from 'react';
import { supabase, Vote } from '../lib/supabase';

export function useVotes(roomId: string | undefined) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchVotes = async () => {
      try {
        const { data, error } = await supabase
          .from('votes')
          .select('*')
          .eq('room_id', roomId);

        if (error) throw error;
        if (isMounted) {
          setVotes(data || []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching votes:", err);
        if (isMounted) setLoading(false);
      }
    };

    fetchVotes();

    const subscription = supabase
      .channel(`votes:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          if (isMounted) {
            setVotes(prev => {
              if (payload.eventType === 'INSERT') {
                // Remove existing vote for this voter if any
                const filtered = prev.filter(v => v.voter_id !== payload.new.voter_id);
                return [...filtered, payload.new as Vote];
              } 
              if (payload.eventType === 'UPDATE') {
                return prev.map(v => v.id === payload.new.id ? payload.new as Vote : v);
              } 
              if (payload.eventType === 'DELETE') {
                return prev.filter(v => v.id !== payload.old.id);
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

  return { votes, setVotes, loading };
}
