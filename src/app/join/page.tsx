"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { supabase } from "../../lib/supabase";
import { usePlayerStore } from "../../store/usePlayerStore";
import { useLangStore } from "../../store/useLangStore";
import { Scanner } from '@yudiel/react-qr-scanner';

export default function JoinRoomPage() {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setPlayer = usePlayerStore((state) => state.setPlayer);
  const { lang, toggleLang } = useLangStore();
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const codeParam = urlParams.get('code');
      if (codeParam) {
        setRoomCode(codeParam.toUpperCase());
      }
    }
  }, []);

  const handleScan = (detectedCodes: any[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const url = detectedCodes[0].rawValue;
      if (url) {
        try {
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          if (code) {
            setRoomCode(code.toUpperCase());
            setShowScanner(false);
          }
        } catch (e) {
           // If it's just the 4 letter code
           if (url.length === 4) {
             setRoomCode(url.toUpperCase());
             setShowScanner(false);
           }
        }
      }
    }
  };

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


      const { data: existingPlayers, error: checkError } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomData.id)
        .ilike('name', playerName.trim());

      if (checkError) throw checkError;
      
      let finalPlayerId = '';

      if (existingPlayers && existingPlayers.length > 0) {
        // Reconnect flow: If name exists, just log them back into that player!
        finalPlayerId = existingPlayers[0].id;
      } else {
        // 3. Join the Room as a new Player
        const { data: playerData, error: playerInsertError } = await supabase
          .from('players')
          .insert([
            { room_id: roomData.id, name: playerName.trim() }
          ])
          .select()
          .single();

        if (playerInsertError) {
          if (playerInsertError.code === '23505') throw new Error(lang === 'en' ? "That name is already taken." : "Nama itu sudah dipakai.");
          throw playerInsertError;
        }
        finalPlayerId = playerData.id;
      }

      // Save identity locally
      setPlayer(finalPlayerId, upperCode, playerName.trim());

      // Redirect to player waiting screen
      router.push(`/play/${upperCode}`);
    } catch (err: any) {
      // Intentionally not using console.error to avoid Next.js dev overlay for expected validation errors
      setError(err.message || (lang === 'en' ? 'Failed to join room.' : 'Gagal gabung ke room.'));
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >

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
            <label htmlFor="roomCode" className="text-sm font-medium text-slate-300 flex justify-between">
              <span>{lang === 'en' ? 'Room Code' : 'Kode Room'}</span>
              <button 
                 type="button" 
                 onClick={() => setShowScanner(true)}
                 className="text-xs flex items-center gap-1 text-moon-400 hover:text-moon-200 bg-moon-900/30 px-2 py-0.5 rounded"
              >
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                 SCAN QR
              </button>
            </label>
            <div className="relative">
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
          </div>
          
          <Button type="submit" disabled={!playerName.trim() || roomCode.length !== 4 || loading} className="w-full">
            {loading ? (lang === 'en' ? "Connecting..." : "Menyambungkan...") : (lang === 'en' ? "Join Now" : "Gabung Sekarang")}
          </Button>

          <Button type="button" variant="ghost" className="w-full" onClick={() => router.push('/')} disabled={loading}>
            {lang === 'en' ? 'Back to Home' : 'Kembali ke Menu Utama'}
          </Button>
        </form>
      </motion.div>

      {showScanner && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90">
            <div className="w-full max-w-sm relative">
               <button type="button" onClick={() => setShowScanner(false)} className="absolute -top-12 right-0 text-white z-10 p-2 font-bold bg-white/10 rounded-full w-10 h-10 flex items-center justify-center hover:bg-white/20">
                 ✕
               </button>
               <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-forest-950 aspect-square">
                 <Scanner onScan={handleScan} />
               </div>
               <p className="text-center text-slate-300 mt-6 font-bold tracking-widest uppercase">{lang === 'en' ? 'Point camera at Host QR' : 'Arahkan kamera ke QR Host'}</p>
            </div>
         </div>
      )}
    </div>
  );
}
