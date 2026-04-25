"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { supabase } from "../../lib/supabase";
import { usePlayerStore } from "../../store/usePlayerStore";

export default function JoinRoomPage() {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setPlayer = usePlayerStore((state) => state.setPlayer);

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

      if (roomError || !roomData) throw new Error("Room not found. Check the code.");

      if (roomData.phase !== 'lobby') {
        throw new Error("Game has already started.");
      }

      // 2. Prevent Duplicate Names in Room
      const { data: existingPlayers, error: checkError } = await supabase
        .from('players')
        .select('name')
        .eq('room_id', roomData.id)
        .ilike('name', playerName.trim()); // Case-insensitive matching

      if (checkError) throw checkError;
      if (existingPlayers && existingPlayers.length > 0) {
        throw new Error("That name is already taken in this room.");
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
        if (playerInsertError.code === '23505') throw new Error("That name is already taken.");
        throw playerInsertError;
      }

      // Save identity locally
      setPlayer(playerData.id, upperCode, playerName.trim());

      // Redirect to player waiting screen
      router.push(`/play/${upperCode}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to join room.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div 
        className="w-full max-w-sm glass-panel p-8 rounded-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h1 className="font-serif text-3xl font-bold text-center mb-8">Join Game</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-wolf-900/50 border border-wolf-500/50 rounded-md text-wolf-100 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="playerName" className="text-sm font-medium text-slate-300">
              Your Name
            </label>
            <Input
              id="playerName"
              placeholder="e.g. John Doe"
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
              Room Code
            </label>
            <Input
              id="roomCode"
              placeholder="4 Letter Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              required
              maxLength={4}
              disabled={loading}
              className="uppercase tracking-widest font-mono text-center"
            />
          </div>
          
          <Button type="submit" disabled={!playerName.trim() || roomCode.length !== 4 || loading} className="w-full">
            {loading ? "Connecting..." : "Join Now"}
          </Button>

          <Button type="button" variant="ghost" className="w-full" onClick={() => router.push('/')} disabled={loading}>
            Back to Home
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
