"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useRoomState } from "../../../hooks/useRoomState";
import { usePlayers } from "../../../hooks/usePlayers";
import { useVotes } from "../../../hooks/useVotes";
import { usePlayerStore } from "../../../store/usePlayerStore";
import { useLangStore } from "../../../store/useLangStore";
import { ROLES } from "../../../lib/roles";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../../components/ui/Button";
import { RulesModal } from "../../../components/RulesModal";
import { useGameBroadcast, GamePopupEvent } from "../../../hooks/useGameBroadcast";
import { CinematicPopup } from "../../../components/CinematicPopup";

// Full screen transition cinematic component
const PhaseTransition = ({ phase, lang }: { phase: string, lang: 'en'|'id' }) => {
  if (!phase.includes('transition')) return null;
  
  const isNight = phase === 'night_transition';

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      style={{
         background: isNight ? 'radial-gradient(ellipse at center, #020617 0%, #000000 100%)' : 'radial-gradient(ellipse at center, #1e293b 0%, #020617 100%)',
      }}
    >
      <motion.h1 
        className={`font-serif text-5xl md:text-7xl font-bold tracking-[0.2em] ${isNight ? 'text-wolf-900 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-moon-200 drop-shadow-[0_0_15px_rgba(167,139,250,0.5)]'}`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.1, opacity: 0 }}
        transition={{ duration: 2, delay: 0.5 }}
      >
        {isNight ? (lang === 'en' ? 'NIGHT FALLS' : 'MALAM TIBA') : (lang === 'en' ? 'SUNRISE' : 'MATAHARI TERBIT')}
      </motion.h1>
      {/* Fog effect overlay for night */}
      {isNight && (
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-screen animate-pulse-slow" />
      )}
    </motion.div>
  );
};

export default function PlayerScreenPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.roomCode.toUpperCase();
  const router = useRouter();

  const { playerId, clearPlayer } = usePlayerStore();
  const { lang, toggleLang } = useLangStore();
  const { room, loading: roomLoading, error } = useRoomState(roomCode);
  const { players, loading: playersLoading } = usePlayers(room?.id);
  const { votes } = useVotes(room?.id);

  const [roleRevealed, setRoleRevealed] = useState(false);
  const [isCastingVote, setIsCastingVote] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentPopup, setCurrentPopup] = useState<GamePopupEvent | null>(null);

  useGameBroadcast(roomCode, (popup) => {
    if (popup.visibility === 'public' || (popup.visibility === 'private' && popup.targetId === playerId)) {
      setCurrentPopup(popup);
    }
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !playerId) {
      router.push('/join');
    }
  }, [playerId, router, mounted]);

  if (!mounted) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (roomLoading || playersLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <h2 className="text-3xl font-serif text-wolf-400 mb-4">{lang === 'en' ? 'Game Over' : 'Permainan Selesai'}</h2>
        <p className="text-slate-400 mb-8">{lang === 'en' ? 'The room has been closed by the host.' : 'Room telah ditutup oleh host.'}</p>
        <Button onClick={() => {
           clearPlayer();
           router.push('/');
        }}>
          {lang === 'en' ? 'Back to Main Menu' : 'Kembali ke Menu Utama'}
        </Button>
      </div>
    );
  }

  const me = players.find(p => p.id === playerId);
  if (!me) return <div className="min-h-screen flex items-center justify-center">Player session not found in room.</div>;

  const myRole = ROLES[me.role];
  const actualPlayers = players.filter(p => !p.is_host);
  const alivePlayers = actualPlayers.filter(p => p.alive && p.id !== me.id); // exclude self from target list
  const myVote = votes.find(v => v.voter_id === me.id);

  const getPhaseMessage = () => {
     if (room.phase === 'lobby') return lang === 'en' ? "Waiting for host to start..." : "Menunggu host memulai...";
     if (room.phase.includes('transition')) return lang === 'en' ? "The world is changing..." : "Dunia sedang berubah...";
     if (room.phase === 'night') return lang === 'en' ? "The village sleeps. If you have a night action, follow the moderator's voice." : "Desa tertidur. Jika kamu memiliki aksi, ikuti suara moderator.";
     if (room.phase === 'day') return lang === 'en' ? "Discuss and find the wolves!" : "Diskusi & temukan Serigalanya!";
     if (room.phase === 'voting') return lang === 'en' ? "It's time to vote! Tap a player below to cast your vote." : "Waktunya memilih! Sentuh nama pemain di bawah untuk memvote.";
     if (room.phase === 'ended') return lang === 'en' ? "The game has ended." : "Permainan telah berakhir.";
     return "";
  };

  const castVote = async (targetId: string | null) => {
    if (!me.alive || room.phase !== 'voting' || isCastingVote) return;
    setIsCastingVote(true);
    try {
       // Delete any previous vote from this user in this room
       await supabase.from('votes').delete().eq('room_id', room.id).eq('voter_id', me.id);
       // Insert new vote
       await supabase.from('votes').insert([{
         room_id: room.id,
         round: room.round || 0,
         voter_id: me.id,
         target_id: targetId
       }]);
    } catch (err) {
       console.error("VOTE ERROR", err);
    } finally {
       setIsCastingVote(false);
    }
  };

  const castNightAction = async (targetId: string) => {
     const isAwake = room.settings?.activeNightRole === me.role || (myRole?.isAlwaysAwakeWith?.includes(room.settings?.activeNightRole));
     
     if (room.phase === 'hunter_revenge' && me.role === 'hunter') {
        // Hunter revenge is allowed
     } else if (!me.alive || room.phase !== 'night' || !isAwake) {
        return;
     }

     try {
       await supabase.from('players').update({ action_target_id: targetId }).eq('id', me.id);
     } catch (err) {
       console.error("NIGHT ACTION ERROR", err);
     }
  };

  return (
    <div className={`min-h-screen flex flex-col p-6 transition-colors duration-1000 ${room.phase.includes('night') ? 'bg-black' : 'bg-forest-950'}`}>
      <CinematicPopup popup={currentPopup} onClose={() => setCurrentPopup(null)} />
      <AnimatePresence>
         {(room.phase === 'night_transition' || room.phase === 'day_transition') && (
           <PhaseTransition phase={room.phase} lang={lang} />
         )}
      </AnimatePresence>

      {/* Game Over Screen Overlay */}
      <AnimatePresence>
         {room.phase === 'ended' && room.settings?.winner && (
            <motion.div 
              className="fixed inset-0 z-50 flex items-center justify-center p-6 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, type: 'spring' }}
              style={{
                 background: myRole?.team === room.settings.winner ? 'radial-gradient(circle at center, rgba(16,185,129,0.3) 0%, #000000 100%)' : 'radial-gradient(circle at center, rgba(239,68,68,0.3) 0%, #000000 100%)'
              }}
            >
               <div className="absolute inset-0 bg-black/80 backdrop-blur-md -z-10" />
               <div>
                  {myRole?.team === room.settings.winner ? (
                     <h1 className="text-6xl md:text-8xl font-serif text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.8)] mb-4 tracking-widest">
                       {lang === 'en' ? 'VICTORY' : 'MENANG'}
                     </h1>
                  ) : (
                     <h1 className="text-6xl md:text-8xl font-serif text-wolf-600 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] mb-4 tracking-widest">
                       {lang === 'en' ? 'DEFEAT' : 'KALAH'}
                     </h1>
                  )}
                  <p className="text-2xl text-slate-300 font-serif mb-2">
                     {room.settings.winner === 'village' ? (lang === 'en' ? 'The Village Survives' : 'Warga Desa Selamat') : (lang === 'en' ? 'The Werewolves Hunted Everyone' : 'Manusia Serigala Menguasai Desa')}
                  </p>
                  <div className="mt-12 mb-8">
                     <p className="text-sm text-slate-500 uppercase tracking-widest animate-pulse mb-2">
                        {lang === 'en' ? 'WAITING FOR HOST TO CLOSE LOBBY...' : 'MENUNGGU HOST...'}
                     </p>
                     <p className="text-xs text-amber-500/80 max-w-xs mx-auto">
                        {lang === 'en' ? 'If you still want to play the next round, DO NOT press this button!' : 'Kalau masih mau main ronde selanjutnya, JANGAN pencet tombol ini!'}
                     </p>
                  </div>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={async () => {
                       if (me) await supabase.from('players').delete().eq('id', me.id);
                       router.push('/');
                    }}
                  >
                     {lang === 'en' ? 'Back to Main Menu' : 'Kembali ke Menu Utama'}
                  </Button>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
         <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xs text-slate-400 uppercase tracking-wider">Player</h2>
              <button onClick={toggleLang} className="text-[10px] bg-white/10 px-2 py-0.5 rounded cursor-pointer hover:bg-white/20 transition">
                {lang.toUpperCase()}
              </button>
              <button onClick={() => setRulesOpen(true)} className="text-[10px] bg-moon-900/50 text-moon-400 border border-moon-400/30 px-2 py-0.5 rounded cursor-pointer hover:bg-moon-800 transition flex items-center justify-center font-bold">
                i
              </button>
            </div>
            <p className="font-bold text-lg">{me.name}</p>
         </div>
         <div className="text-right">
            <h2 className="text-xs text-slate-400 uppercase tracking-wider">Status</h2>
            <p className={`font-bold text-lg ${me.alive ? 'text-moon-400' : 'text-wolf-500'}`}>
              {me.alive ? (lang === 'en' ? 'ALIVE' : 'HIDUP') : (lang === 'en' ? 'DEAD' : 'MATI')}
            </p>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
         
         {!me.alive ? (
           <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <h1 className="text-4xl font-serif text-wolf-600 mb-4">{lang === 'en' ? 'YOU DIED' : 'KAMU MATI'}</h1>
              <p className="text-slate-400 max-w-sm mx-auto">{lang === 'en' ? 'Please remain quiet for the rest of the game so you do not spoil it for the living.' : 'Tolong tetap diam selama sisa permainan agar tidak merusaknya bagi yang masih hidup.'}</p>
           </motion.div>
         ) : (
           <>
              <p className="text-xl text-slate-300 mb-8 min-h-[60px]">{getPhaseMessage()}</p>
              
              {room.phase === 'night' && (room.settings?.activeNightRole === me.role || myRole?.isAlwaysAwakeWith?.includes(room.settings?.activeNightRole)) && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto mb-8 bg-forest-900 border border-white/10 p-4 rounded-xl">
                    <h3 className="font-serif text-lg mb-4 text-moon-200 border-b border-white/5 pb-2">
                       {lang === 'en' ? 'Make your move' : 'Pilih targetmu'}
                    </h3>
                    <ul className="space-y-2">
                      {alivePlayers.map(p => {
                         const isSelected = me.action_target_id === p.id;
                         const otherWolvesTargeting = myRole?.team === 'werewolf' ? actualPlayers.filter(w => ROLES[w.role]?.team === 'werewolf' && w.id !== me.id && w.action_target_id === p.id) : [];
                         
                         return (
                           <li key={p.id}>
                             <button
                               onClick={() => castNightAction(p.id)}
                               className={`w-full p-3 rounded-lg flex justify-between items-center transition-all ${isSelected ? 'bg-moon-900 border border-moon-500 scale-[1.02]' : 'bg-forest-950 border border-white/5 hover:border-moon-400/50'}`}
                             >
                                <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{p.name}</span>
                                <div className="flex items-center gap-2">
                                  {otherWolvesTargeting.length > 0 && (
                                     <div className="flex -space-x-1">
                                       {otherWolvesTargeting.map(w => (
                                          <div key={w.id} className="w-5 h-5 rounded-full bg-wolf-600 border border-black text-[9px] flex items-center justify-center font-bold text-white shadow-sm" title={w.name}>
                                            {w.name.charAt(0).toUpperCase()}
                                          </div>
                                       ))}
                                     </div>
                                  )}
                                  {isSelected && <span className="text-xs uppercase tracking-widest text-moon-200">{lang === 'en' ? 'Selected' : 'Terpilih'}</span>}
                                </div>
                             </button>
                           </li>
                         )
                      })}
                    </ul>
                 </motion.div>
              )}

              {room.phase === 'hunter_revenge' && (
                 <div className="w-full max-w-md mx-auto mb-8 bg-forest-900 border border-white/10 p-4 rounded-xl">
                    <h3 className="font-serif text-lg mb-4 text-wolf-400 border-b border-white/5 pb-2">
                       {lang === 'en' ? 'Hunter\'s Revenge' : 'Balas Dendam Hunter'}
                    </h3>
                    {me.role === 'hunter' ? (
                       <ul className="space-y-2">
                          {alivePlayers.map(p => {
                             const isSelected = me.action_target_id === p.id;
                             return (
                                <li key={p.id}>
                                   <button
                                      onClick={() => castNightAction(p.id)}
                                      className={`w-full p-3 rounded-lg flex justify-between items-center transition-all ${isSelected ? 'bg-wolf-900 border border-wolf-500 scale-[1.02]' : 'bg-forest-950 border border-white/5 hover:border-moon-400/50'}`}
                                   >
                                      <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{p.name}</span>
                                      {isSelected && <span className="text-xs uppercase tracking-widest text-wolf-400">{lang === 'en' ? 'Targeted' : 'Ditargetkan'}</span>}
                                   </button>
                                </li>
                             )
                          })}
                       </ul>
                    ) : (
                       <p className="text-slate-400 italic">
                          {lang === 'en' ? 'The Hunter is taking aim...' : 'Hunter sedang membidik targetnya...'}
                       </p>
                    )}
                 </div>
              )}

              {room.phase === 'voting' && (
                 <div className="w-full max-w-md mx-auto mb-8 bg-forest-900 border border-white/10 p-4 rounded-xl">
                    <h3 className="font-serif text-lg mb-4 text-moon-200 border-b border-white/5 pb-2">
                       {lang === 'en' ? 'Cast your vote' : 'Pilih siapa yang harus mati'}
                    </h3>
                    <ul className="space-y-2">
                      {alivePlayers.map(p => {
                         const isSelected = myVote?.target_id === p.id;
                         return (
                           <li key={p.id}>
                             <button
                               onClick={() => castVote(p.id)}
                               disabled={isCastingVote}
                               className={`w-full p-3 rounded-lg flex justify-between items-center transition-all ${isSelected ? 'bg-wolf-900 border border-wolf-500 scale-[1.02]' : 'bg-forest-950 border border-white/5 hover:border-moon-400/50'}`}
                             >
                                <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{p.name}</span>
                                {isSelected && <span className="text-xs uppercase tracking-widest text-wolf-200">Voted</span>}
                             </button>
                           </li>
                         )
                      })}
                    </ul>
                    {alivePlayers.length === 0 && <p className="text-sm text-slate-500 italic">No one else is alive.</p>}
                 </div>
              )}

              {room.phase !== 'lobby' && !myRole && (
                 <div className="flex flex-col items-center justify-center p-16 glass-panel rounded-2xl animate-pulse w-full max-w-sm border-2 border-moon-400/20 mx-auto">
                    <div className="w-12 h-12 rounded-full border-b-2 border-moon-400 animate-spin mb-4" />
                    <p className="text-moon-400 font-serif tracking-widest uppercase text-sm">
                      {lang === 'en' ? 'Receiving Role' : 'Menerima Peran'}
                    </p>
                 </div>
              )}
              
              {room.phase !== 'lobby' && myRole && room.phase !== 'voting' && (
                 <div className="w-full max-w-sm relative group perspective-1000 mx-auto">
                    {/* Role Card Flip Animation */}
                    <motion.div 
                      className="w-full aspect-[2.5/3.5] relative preserve-3d cursor-pointer"
                      onClick={() => setRoleRevealed(!roleRevealed)}
                      animate={{ rotateY: roleRevealed ? 180 : 0 }}
                      transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
                    >
                       {/* Front (Card back) */}
                       <div className="absolute inset-0 backface-hidden glass-panel rounded-2xl flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] border-2 border-white/10 z-10 bg-[#0f172a]">
                          <div className="w-16 h-16 rounded-full border-2 border-moon-400/30 flex items-center justify-center mb-4">
                            <span className="text-2xl text-moon-400/50">?</span>
                          </div>
                          <p className="font-serif tracking-widest text-lg text-slate-300">
                             {lang === 'en' ? 'TAP TO REVEAL' : 'SENTUH UNTUK MELIHAT'}
                          </p>
                       </div>

                       {/* Back (Role Face) */}
                       <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] rounded-2xl flex flex-col items-center p-6 border-2 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden bg-forest-900"
                            style={{ borderColor: myRole.team === 'werewolf' ? 'rgba(239,68,68,0.3)' : 'rgba(167,139,250,0.3)'}}>
                          
                          {/* Background Glow */}
                          <div className={`absolute -top-20 -left-20 w-40 h-40 blur-[80px] ${myRole.team === 'werewolf' ? 'bg-wolf-600' : 'bg-moon-600'}`} />

                          <h2 className="relative z-10 font-serif text-3xl mb-2 mt-4 text-white">
                            {lang === 'en' ? myRole.name : myRole.name_id}
                          </h2>
                          <div className={`relative z-10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 ${myRole.team === 'werewolf' ? 'bg-wolf-900/50 text-wolf-200 border-wolf-500' : myRole.team === 'neutral' ? 'bg-slate-800 text-slate-300' : 'bg-moon-900/50 text-moon-200 border-moon-400'} border`}>
                            {lang === 'en' ? 'Team' : 'Tim'} {myRole.team}
                          </div>

                          <p className="relative z-10 text-sm text-slate-300 text-center leading-relaxed flex-1">
                             {lang === 'en' ? myRole.description : myRole.desc_id}
                          </p>
                          
                          <p className="relative z-10 text-xs text-slate-500 mt-4 uppercase tracking-widest">
                             {lang === 'en' ? 'Tap to Hide' : 'Sentuh untuk Menutup'}
                          </p>
                       </div>
                    </motion.div>
                 </div>
              )}
           </>
         )}

      </div>

      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
