"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { supabase } from "../../../lib/supabase";
import { usePlayerStore } from "../../../store/usePlayerStore";
import { useLangStore } from "../../../store/useLangStore";

// Helper to generate a 4-letter generic code
const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function CreateRoomPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setPlayer = usePlayerStore((state) => state.setPlayer);
  const { lang, toggleLang } = useLangStore();

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    const code = generateRoomCode();

    try {
      // Background Cleanup: Auto-delete abandoned rooms older than 24 hours
      // We run this "silently" before creating a new room to keep the database clean
      // without needing an actual server-side CRON job.
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      try {
        await supabase.from('rooms').delete().lt('created_at', twentyFourHoursAgo);
      } catch (e) {
        console.error('Cleanup error:', e);
      }

      // 1. Create Room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert([
          { code, host_name: '[MODERATOR]', phase: 'lobby' }
        ])
        .select()
        .single();

      if (roomError) throw roomError;

      // 2. Create the Host as a Player in the Room
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert([
          { room_id: roomData.id, name: '[MODERATOR]', is_host: true, role: 'host', team: 'host' }
        ])
        .select()
        .single();

      if (playerError) throw playerError;

      // Save identity locally
      setPlayer(playerData.id, code, '[MODERATOR]');

      // Redirect to host lobby
      router.push(`/host/${code}/lobby`);
    } catch (err: any) {
      // Intentionally not using console.error to avoid Next.js dev overlay
      setError(err.message || (lang === 'en' ? 'Failed to create room.' : 'Gagal membuat room.'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="absolute top-6 left-6 z-50">
        <button onClick={toggleLang} className="text-xs bg-white/10 px-3 py-1 rounded-full cursor-pointer hover:bg-white/20 transition font-bold uppercase tracking-wider text-moon-200">
          {lang === 'en' ? 'EN' : 'ID'}
        </button>
      </div>

      <motion.div 
        className="w-full max-w-sm glass-panel p-8 rounded-2xl relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >

        <h1 className="font-serif text-3xl font-bold text-center mb-2">{lang === 'en' ? 'Create Room' : 'Buat Room'}</h1>
        <p className="text-center text-slate-400 text-sm mb-8">{lang === 'en' ? 'You will be the moderator for this game.' : 'Kamu akan menjadi moderator untuk game ini.'}</p>
        
        {error && (
          <div className="mb-4 p-3 bg-wolf-900/50 border border-wolf-500/50 rounded-md text-wolf-100 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateRoom} className="space-y-6">
          <Button type="submit" disabled={loading} className="w-full mt-4">
            {loading ? (lang === 'en' ? "Initializing Ritual..." : "Mempersiapkan Ritual...") : (lang === 'en' ? "Start New Game" : "Mulai Game Baru")}
          </Button>

          <Button type="button" variant="ghost" className="w-full" onClick={() => router.push('/')} disabled={loading}>
            {lang === 'en' ? 'Cancel' : 'Batal'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
