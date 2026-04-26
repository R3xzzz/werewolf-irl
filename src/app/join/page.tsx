"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { supabase } from "../../lib/supabase";
import { usePlayerStore } from "../../store/usePlayerStore";
import { useLangStore } from "../../store/useLangStore";

export default function JoinRoomPage() {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setPlayer = usePlayerStore((state) => state.setPlayer);
  const { lang, toggleLang } = useLangStore();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomCode.trim()) return;

    setLoading(true);
    setError(null);
    const upperCode = roomCode.trim().toUpperCase();

    try {
      // 1. Verify Room Exists
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', upperCode)
        .single();

      if (roomError || !roomData) throw new Error(lang === 'en' ? "Room not found. Check the code." : "Room tidak ditemukan. Cek kodenya lagi.");

      if (roomData.phase !== 'lobby') {
        throw new Error(lang === 'en' ? "Game has already started." : "Game sudah dimulai.");
      }

      // 2. Prevent Duplicate Names in Room
      const { data: existingPlayers, error: checkError } = await supabase
        .from('players')
        .select('name')
        .eq('room_id', roomData.id)
        .ilike('name', playerName.trim()); // Case-insensitive matching

      if (checkError) throw checkError;
      if (existingPlayers && existingPlayers.length > 0) {
        throw new Error(lang === 'en' ? "That name is already taken in this room." : "Nama itu sudah dipakai di room ini.");
      }

      // 3. Join the Room as a Player
      const { data: playerData, error: playerInsertError } = await supabase
        .from('players')
        .insert([
          { room_id: roomData.id, name: playerName.trim() }
        ])
        .select()
        .single();

      if (playerInsertError) {
        // Fallback for DB-level Unique constraint just in case
        if (playerInsertError.code === '23505') throw new Error(lang === 'en' ? "That name is already taken." : "Nama itu sudah dipakai.");
        throw playerInsertError;
      }

      // Save identity locally
      setPlayer(playerData.id, upperCode, playerName.trim());

      // Redirect to player waiting screen
      router.push(`/play/${upperCode}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || (lang === 'en' ? 'Failed to join room.' : 'Gagal gabung ke room.'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div 
        className="w-full max-w-sm glass-panel p-8 rounded-2xl relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="absolute top-4 right-4">
          <button onClick={toggleLang} className="text-[10px] bg-white/10 px-2 py-1 rounded cursor-pointer hover:bg-white/20 transition font-bold uppercase text-moon-200">
            {lang.toUpperCase()}
          </button>
        </div>

        <h1 className="font-serif text-3xl font-bold text-center mb-8">{lang === 'en' ? 'Join Game' : 'Gabung Game'}</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-wolf-900/50 border border-wolf-500/50 rounded-md text-wolf-100 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="playerName" className="text-sm font-medium text-slate-300">
              {lang === 'en' ? 'Your Name' : 'Nama Kamu'}
            </label>
            <Input
              id="playerName"
              placeholder={lang === 'en' ? 'e.g. John Doe' : 'Cth: Budi'}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              required
              maxLength={20}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="roomCode" className="text-sm font-medium text-slate-300">
              {lang === 'en' ? 'Room Code' : 'Kode Room'}
            </label>
            <Input
              id="roomCode"
              placeholder={lang === 'en' ? '4 Letter Code' : '4 Huruf Kode'}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              required
              maxLength={4}
              disabled={loading}
              className="uppercase tracking-widest font-mono text-center"
            />
          </div>
          
          <Button type="submit" disabled={!playerName.trim() || roomCode.length !== 4 || loading} className="w-full">
            {loading ? (lang === 'en' ? "Connecting..." : "Menyambungkan...") : (lang === 'en' ? "Join Now" : "Gabung Sekarang")}
          </Button>

          <Button type="button" variant="ghost" className="w-full" onClick={() => router.push('/')} disabled={loading}>
            {lang === 'en' ? 'Back to Home' : 'Kembali ke Menu Utama'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
