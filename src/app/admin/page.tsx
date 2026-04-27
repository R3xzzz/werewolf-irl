"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";

interface Room {
  id: string;
  code: string;
  host_name: string;
  phase: string;
  created_at: string;
}

export default function AdminPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const secret = localStorage.getItem('adminSecret');
    const isValid = secret === process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    
    if (!isValid) {
      router.push('/');
      return;
    }
    setAuthorized(true);
    fetchRooms();

    // Realtime subscription
    const channel = supabase
      .channel('admin-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  async function fetchRooms() {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setRooms(data || []);
    }
    setLoading(false);
  }

  async function confirmDelete() {
    if (!roomToDelete) return;
    setIsDeleting(true);
    
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomToDelete.id);

    if (error) {
      alert('Failed to delete room: ' + error.message);
    }
    setRoomToDelete(null);
    setIsDeleting(false);
  }

  function handleLogout() {
    localStorage.removeItem('adminSecret');
    router.push('/');
  }

  function joinAsAdmin(code: string) {
    router.push(`/join?code=${code}&name=Admin&admin=true`);
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight text-moon-50">Admin Dashboard</h1>
            <p className="text-moon-400 uppercase tracking-[0.3em] text-xs mt-2 font-medium">Room Management Console</p>
          </div>
          <div className="flex gap-4">
            <Button onClick={handleLogout} variant="secondary" className="bg-red-950/20 text-red-400 border-red-500/20 hover:bg-red-900/40 px-6">
              Exit & Logout
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-moon-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="flex justify-between items-end">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-300">
                Active Rooms 
                <span className="bg-moon-900/50 text-moon-400 text-xs px-2 py-0.5 rounded-full border border-moon-500/20">
                  {rooms.length}
                </span>
              </h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Real-time Sync Enabled</p>
            </div>

            <div className="glass-panel overflow-hidden rounded-2xl border border-white/5 shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Room Code</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Host</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Phase</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Created</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <AnimatePresence mode="popLayout">
                      {rooms.length === 0 ? (
                        <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <td colSpan={5} className="px-6 py-20 text-center text-slate-500 italic">
                            No active rooms found.
                          </td>
                        </motion.tr>
                      ) : (
                        rooms.map((room) => (
                          <motion.tr 
                            key={room.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="hover:bg-white/[0.01] transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <span className="font-mono text-lg font-bold text-moon-200 tracking-tighter group-hover:text-moon-50 transition-colors">
                                {room.code}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-slate-300">{room.host_name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${
                                room.phase === 'lobby' ? 'bg-green-950/20 text-green-400 border-green-500/20' : 
                                room.phase === 'ended' ? 'bg-slate-900 text-slate-500 border-slate-800' :
                                'bg-moon-950/20 text-moon-400 border-moon-500/20'
                              }`}>
                                {room.phase}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                              {new Date(room.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => joinAsAdmin(room.code)}
                                  className="text-[10px] font-bold uppercase tracking-widest bg-moon-800 hover:bg-moon-700 text-white px-3 py-1.5 rounded-lg transition-all"
                                >
                                  Join
                                </button>
                                <button 
                                  onClick={() => setRoomToDelete(room)}
                                  className="text-[10px] font-bold uppercase tracking-widest bg-red-950/20 hover:bg-red-900/40 text-red-500 px-3 py-1.5 rounded-lg border border-red-500/10 transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-20 border-t border-white/5 pt-8 text-center">
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.4em]">System Administrator Panel &bull; Werewolf IRL</p>
        </footer>

        {/* Professional Delete Modal */}
        <AnimatePresence>
          {roomToDelete && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-sm glass-panel p-8 rounded-3xl border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]"
              >
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                
                <h2 className="text-xl font-bold mb-2 text-center text-white">Delete Room {roomToDelete.code}?</h2>
                <p className="text-slate-400 text-sm text-center mb-8 leading-relaxed">
                  Are you sure? This will immediately terminate the session and all player data for this room will be permanently lost.
                </p>
                
                <div className="flex gap-3">
                  <Button 
                    variant="ghost" 
                    className="flex-1 h-12 text-slate-400 hover:text-white"
                    onClick={() => setRoomToDelete(null)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 h-12 bg-red-600 hover:bg-red-500 text-white border-none shadow-lg shadow-red-600/20"
                    onClick={confirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
