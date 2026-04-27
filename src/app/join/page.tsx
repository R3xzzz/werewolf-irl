"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { supabase } from "../../lib/supabase";
import { usePlayerStore } from "../../store/usePlayerStore";
import { useLangStore } from "../../store/useLangStore";
import dynamic from "next/dynamic";
const Scanner = dynamic(() => import("@yudiel/react-qr-scanner").then(m => m.Scanner), { ssr: false });

export default function JoinRoomPage() {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { playerId, setPlayer } = usePlayerStore();
  const { lang, toggleLang } = useLangStore();
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const codeParam = urlParams.get('code');
      const nameParam = urlParams.get('name');
      const isAdminFlow = urlParams.get('admin') === 'true';

      if (codeParam) {
        setRoomCode(codeParam.toUpperCase());
      }
      
      if (isAdminFlow && nameParam === 'Admin') {
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (isAdmin) {
          setPlayerName('Admin');
        }
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
    if (!playerName.trim() || !roomCode.trim() || loading) return;

    setLoading(true);
    setError(null);
    const upperCode = roomCode.trim().toUpperCase();
    const rawName = playerName.trim();

    // Advanced Normalization Utility
    const normalize = (name: string) => {
      return name
        .normalize('NFKD')               // Handle unicode spoofing
        .replace(/[\u0300-\u036f]/g, '') // Remove accents/diacritics
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')       // Strip symbols and spaces completely
        .trim();
    };

    const normalizedInput = normalize(rawName);
    const isTryingToBeAdmin = normalizedInput === 'admin';

    // Verify Real Admin Authorization
    const adminSecret = typeof window !== 'undefined' ? localStorage.getItem('adminSecret') : null;
    const isRealAdmin = adminSecret === process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    // 1. Reserved Name Protection
    if (isTryingToBeAdmin && !isRealAdmin) {
      setError(lang === 'en' ? "🚫 Admin name is protected" : "🚫 Nama Admin diproteksi");
      setLoading(false);
      return;
    }

    try {
      // 2. Verify Room Exists
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', upperCode)
        .single();

      if (roomError || !roomData) throw new Error(lang === 'en' ? "Room not found" : "Room tidak ditemukan");
      if (roomData.phase !== 'lobby') throw new Error(lang === 'en' ? "Game already started" : "Game sudah dimulai");

      // 3. Duplicate Detection (Normalized)
      const { data: existingPlayers, error: checkError } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomData.id);

      if (checkError) throw checkError;

      // Check if normalized name exists
      const conflictPlayer = existingPlayers?.find(p => normalize(p.name) === normalizedInput);

      if (conflictPlayer) {
        // ADMIN EXCEPTION: Real Admin always has priority over impostors
        if (isRealAdmin && isTryingToBeAdmin) {
          // Boot the impostor
          await supabase.from('players').delete().eq('id', conflictPlayer.id);
        } else if (conflictPlayer.id !== playerId) {
          // Regular user duplicate conflict
          throw new Error(lang === 'en' ? "⚠ This name is already taken" : "⚠ Nama sudah dipakai");
        }
      }
      
      let finalPlayerId = '';

      // If we are re-joining our own session in the same room
      const myPreviousSession = existingPlayers?.find(p => p.id === playerId);
      
      if (myPreviousSession) {
        finalPlayerId = myPreviousSession.id;
        // Update name if changed (e.g. from Admin to admin or vice versa by the real admin)
        await supabase.from('players').update({ name: rawName }).eq('id', finalPlayerId);
      } else {
        // Join as new player
        const { data: newPlayer, error: joinError } = await supabase
          .from('players')
          .insert([{
            room_id: roomData.id,
            name: rawName,
            is_host: false,
            role: 'unassigned'
          }])
          .select()
          .single();

        if (joinError) throw joinError;
        finalPlayerId = newPlayer.id;
      }

      // Save identity locally
      setPlayer(finalPlayerId, upperCode, rawName);

      // Redirect to player screen
      router.push(`/play/${upperCode}`);
    } catch (err: any) {
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
        
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-8 p-4 bg-gradient-to-br from-wolf-950/90 to-black/90 border border-wolf-500/20 rounded-2xl text-wolf-100 text-sm text-center flex items-center gap-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="w-10 h-10 rounded-full bg-wolf-500/10 flex items-center justify-center text-xl shrink-0">
                 {error.includes("not found") || error.includes("ditemukan") ? "⚠" : 
                  error.includes("already taken") || error.includes("sudah digunakan") ? "🚫" : "💡"}
              </div>
              <div className="text-left leading-tight">
                 <p className="font-bold text-wolf-300 text-xs uppercase tracking-widest mb-0.5">System Alert</p>
                 <p className="text-slate-300">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
