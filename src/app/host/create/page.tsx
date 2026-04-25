"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { supabase } from "../../../lib/supabase";
import { usePlayerStore } from "../../../store/usePlayerStore";

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
  const [hostName, setHostName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setPlayer = usePlayerStore((state) => state.setPlayer);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;

    setLoading(true);
    setError(null);
    const code = generateRoomCode();

    try {
      // 1. Create Room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert([
          { code, host_name: hostName.trim(), phase: 'lobby' }
        ])
        .select()
        .single();

      if (roomError) throw roomError;

      // 2. Create the Host as a Player in the Room
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert([
          { room_id: roomData.id, name: hostName.trim(), is_host: true, role: 'host', team: 'host' }
        ])
        .select()
        .single();

      if (playerError) throw playerError;

      // Save identity locally
      setPlayer(playerData.id, code, hostName.trim());

      // Redirect to host lobby
      router.push(`/host/${code}/lobby`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create room.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div 
        className="w-full max-w-sm glass-panel p-8 rounded-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-serif text-3xl font-bold text-center mb-2">Create Room</h1>
        <p className="text-center text-slate-400 text-sm mb-8">You will be the moderator for this game.</p>
        
        {error && (
          <div className="mb-4 p-3 bg-wolf-900/50 border border-wolf-500/50 rounded-md text-wolf-100 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateRoom} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="hostName" className="text-sm font-medium text-slate-300">
              Moderator Name
            </label>
            <Input
              id="hostName"
              placeholder="e.g. Master Splinter"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              required
              maxLength={20}
              disabled={loading}
              autoFocus
            />
          </div>
          
          <Button type="submit" disabled={!hostName.trim() || loading} className="w-full">
            {loading ? "Initializing Ritual..." : "Create Room"}
          </Button>

          <Button type="button" variant="ghost" className="w-full" onClick={() => router.push('/')} disabled={loading}>
            Cancel
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
