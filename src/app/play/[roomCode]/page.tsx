"use client";

import { use, useEffect, useState, useCallback } from "react";
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
  const [troubleSelection, setTroubleSelection] = useState<string[]>([]);
  const [cupidSelection, setCupidSelection] = useState<string[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [currentPopup, setCurrentPopup] = useState<GamePopupEvent | null>(null);

  const onPopup = useCallback((popup: GamePopupEvent) => {
    if (popup.visibility === 'public' || (popup.visibility === 'private' && popup.targetId === playerId)) {
      setCurrentPopup(popup);
    }
  }, [playerId]);

  const { sendPopup } = useGameBroadcast(roomCode, onPopup);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !playerId) {
      router.push('/join');
    }
  }, [playerId, router, mounted]);

  useEffect(() => {
    if (!playersLoading && mounted && playerId) {
      if (players.length > 0 && !players.find(p => p.id === playerId)) {
         setKicked(true);
      }
    }
  }, [players, playersLoading, mounted, playerId]);

  if (!mounted) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (kicked) {
    return (
       <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
         <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-forest-950 p-8 rounded-2xl border border-red-500/50 max-w-sm w-full text-center">
            <div className="text-4xl mb-4">🚪</div>
            <h2 className="text-2xl font-serif text-white mb-2">{lang === 'en' ? 'You Were Kicked' : 'Kamu Dikeluarkan'}</h2>
            <p className="text-slate-400 mb-6">{lang === 'en' ? 'You were kicked by the moderator.' : 'Kamu dikeluarkan oleh moderator.'}</p>
            <Button onClick={() => { clearPlayer(); router.push('/'); }} className="w-full">
               {lang === 'en' ? 'Main Menu' : 'Menu Utama'}
            </Button>
         </motion.div>
       </div>
    );
  }

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
  if (!me) return <div className="min-h-screen flex items-center justify-center">Loading player data...</div>;

  const myRole = ROLES[me.role];
  const actualPlayers = players.filter(p => !p.is_host);
  const alivePlayers = actualPlayers.filter(p => {
     if (!p.alive) return false;
     if (p.id === me.id) {
        if (me.role === 'bodyguard') return true;
        if (me.role === 'cupid' && room.round === 1) return true;
        if (me.role === 'troublemaker' && room.phase === 'day' && !room.settings?.troublemakerUsed) return true;
        return false;
     }
     return true;
  });
  const myVote = votes.find(v => v.voter_id === me.id);

  const getPhaseMessage = () => {
     if (room.phase === 'lobby') return lang === 'en' ? "Waiting for host to start..." : "Menunggu host memulai...";
     if (room.phase.includes('transition')) return lang === 'en' ? "The world is changing..." : "Dunia sedang berubah...";
     if (room.phase === 'night') return lang === 'en' ? "The village sleeps. If you have a night action, follow the moderator's voice." : "Desa tertidur. Jika kamu memiliki aksi, ikuti suara moderator.";
     if (room.phase === 'day') {
        if (me.role === 'drunk' && room.round === 1) return lang === 'en' ? "You are too drunk to speak or give hints today! 🍺" : "Kamu terlalu mabuk untuk bicara atau kasih petunjuk hari ini! 🍺";
        return lang === 'en' ? "Discuss and find the wolves!" : "Diskusi & temukan Serigalanya!";
     }
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

  const handleAlphaWolfConvert = async (targetId: string) => {
     try {
       await supabase.from('rooms').update({ 
          settings: { ...room.settings, alphaConvertTargetId: targetId } 
       }).eq('id', room.id);
       await supabase.from('players').update({ action_target_id: targetId }).eq('id', me.id);
     } catch(e) {
       console.error(e);
     }
  };

  const handleTroubleSelect = (targetId: string) => {
     if (room.settings?.troublemakerUsed) return;
     setTroubleSelection(prev => {
        if (prev.includes(targetId)) return prev.filter(id => id !== targetId);
        if (prev.length < 2) return [...prev, targetId];
        return prev;
     });
  };


  const confirmTrouble = async () => {
     if (troubleSelection.length !== 2) return;
     await supabase.from('rooms').update({ 
        settings: { 
           ...room.settings, 
           troubleCandidates: troubleSelection,
           troublemakerUsed: true 
        } 
     }).eq('id', room.id);
     
     sendPopup({
        type: 'popup',
        visibility: 'public',
        title_en: 'Trouble Brews!',
        title_id: 'Onar Dimulai!',
        desc_en: `Today's vote restricted to: ${players.find(p => p.id === troubleSelection[0])?.name} vs ${players.find(p => p.id === troubleSelection[1])?.name}`,
        desc_id: `Voting hari ini terbatas antara: ${players.find(p => p.id === troubleSelection[0])?.name} vs ${players.find(p => p.id === troubleSelection[1])?.name}`,
        icon: '⚖️',
        durationMs: 8000
     });
  };

  const handleTroubleSchedule = async () => {
     if (troubleSelection.length !== 2) return;
     await supabase.from('rooms').update({ 
        settings: { 
           ...room.settings, 
           troubleScheduled: true,
           troubleScheduledTargets: troubleSelection,
           troublemakerUsed: true 
        } 
     }).eq('id', room.id);
     
     sendPopup({
        type: 'popup',
        visibility: 'private',
        targetId: me.id,
        title_en: 'Skill Scheduled',
        title_id: 'Skill Terjadwal',
        desc_en: 'Your trouble will brew tomorrow morning.',
        desc_id: 'Keonaranmu akan dimulai besok pagi.',
        icon: '⏳',
        durationMs: 6000
     });
  };

  const handlePacifistAction = async (scheduled: boolean) => {
     if (room.settings?.pacifistUsed) return;
     
     const updates: any = {
        ...room.settings,
        pacifistUsed: true
     };

     if (scheduled) {
        updates.pacifistScheduled = true;
     } else {
        updates.pacifistActive = true;
     }

     await supabase.from('rooms').update({ settings: updates }).eq('id', room.id);

     sendPopup({
        type: 'popup',
        visibility: 'private',
        targetId: me.id,
        title_en: scheduled ? 'Skill Scheduled' : 'Skill Activated',
        title_id: scheduled ? 'Skill Terjadwal' : 'Skill Diaktifkan',
        desc_en: scheduled ? 'Peace will be enforced tomorrow.' : 'You will be forced to vote for peace today.',
        desc_id: scheduled ? 'Kedamaian akan dipaksakan besok.' : 'Kamu akan dipaksa memilih damai hari ini.',
        icon: '🕊️',
        durationMs: 6000
     });

     if (!scheduled) {
        sendPopup({
           type: 'popup',
           visibility: 'public',
           title_en: 'Pacifist Plea!',
           title_id: 'Seruan Damai!',
           desc_en: `${me.name} is calling for peace today.`,
           desc_id: `${me.name} menyerukan kedamaian hari ini.`,
           icon: '🕊️',
           durationMs: 6000
        });
     }
  };

  const handleCupidSelect = (targetId: string) => {
     if (me?.action_target_id) return; // already confirmed
     setCupidSelection(prev => {
        if (prev.includes(targetId)) return prev.filter(id => id !== targetId);
        if (prev.length < 2) return [...prev, targetId];
        return prev;
     });
  };

  const confirmCupidLovers = async () => {
     if (cupidSelection.length !== 2 || !me || !room) return;
     try {
        await supabase.from('rooms').update({ settings: { ...room.settings, lovers: cupidSelection } }).eq('id', room.id);
        await supabase.from('players').update({ action_target_id: cupidSelection[0] }).eq('id', me.id);
        
        const p1 = players.find(p => p.id === cupidSelection[0])?.name;
        const p2 = players.find(p => p.id === cupidSelection[1])?.name;

        setCurrentPopup({
           type: 'popup',
           visibility: 'private',
           targetId: me.id,
           title_en: 'Lovers Linked!',
           title_id: 'Kekasih Terhubung!',
           desc_en: `You linked: ${p1} ❤️ ${p2}`,
           desc_id: `Kamu menghubungkan: ${p1} ❤️ ${p2}`,
           icon: '❤️',
           durationMs: 5000
        });
     } catch(e) {
        console.error(e);
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
                  {room.settings.winner === 'lovers' ? (
                     <h1 className="text-6xl md:text-8xl font-serif text-pink-400 drop-shadow-[0_0_30px_rgba(244,114,182,0.8)] mb-4 tracking-widest">
                       {lang === 'en' ? 'TRUE LOVE' : 'CINTA SEJATI'}
                     </h1>
                  ) : myRole?.team === room.settings.winner ? (
                     <h1 className="text-6xl md:text-8xl font-serif text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.8)] mb-4 tracking-widest">
                       {lang === 'en' ? 'VICTORY' : 'MENANG'}
                     </h1>
                  ) : (
                     <h1 className="text-6xl md:text-8xl font-serif text-wolf-600 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] mb-4 tracking-widest">
                       {lang === 'en' ? 'DEFEAT' : 'KALAH'}
                     </h1>
                  )}
                  <p className="text-2xl text-slate-300 font-serif mb-2">
                     {room.settings.winner === 'village' ? (lang === 'en' ? 'The Village Survives' : 'Warga Desa Selamat') : room.settings.winner === 'lovers' ? (lang === 'en' ? 'The Lovers Survived Together' : 'Kekasih Selamat Bersama') : (lang === 'en' ? 'The Werewolves Hunted Everyone' : 'Manusia Serigala Menguasai Desa')}
                  </p>
                  {(room.settings.winner === 'village' || room.settings.winner === 'werewolf') && room.settings?.lovers?.length === 2 && room.settings.lovers.every((id: string) => actualPlayers.find(p => p.id === id)?.alive) && (
                     <p className="text-xl text-pink-400 font-serif mb-2 italic animate-pulse">
                        {lang === 'en' ? 'The Lovers also win together! 💕' : 'Pasangan Kekasih juga menang bersama! 💕'}
                     </p>
                  )}
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
         
         {(!me.alive && !(room.phase === 'hunter_revenge' && me.role === 'hunter')) ? (
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
                         let isSelected = false;
                         let isConvertTarget = false;
                         if (me.role === 'cupid' && room.round === 1) {
                            isSelected = cupidSelection.includes(p.id);
                         } else if (me.role === 'alpha_wolf') {
                            isSelected = me.action_target_id === p.id && room.settings?.alphaConvertTargetId !== p.id;
                            isConvertTarget = me.action_target_id === p.id && room.settings?.alphaConvertTargetId === p.id;
                         } else {
                            isSelected = me.action_target_id === p.id;
                         }

                         const otherWolvesTargeting = myRole?.team === 'werewolf' ? actualPlayers.filter(w => ROLES[w.role]?.team === 'werewolf' && w.id !== me.id && w.action_target_id === p.id) : [];
                         const isConsecutiveBodyguard = me.role === 'bodyguard' && room.settings?.mode === 'competitive' && room.settings?.lastProtectedPlayerId === p.id;
                         const canConvert = me.role === 'alpha_wolf' && !room.settings?.alphaConverted;
                         
                         return (
                           <li key={p.id}>
                              {me.role === 'alpha_wolf' ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                       if (room.settings?.alphaConvertTargetId) {
                                          supabase.from('rooms').update({ settings: { ...room.settings, alphaConvertTargetId: null } }).eq('id', room.id);
                                       }
                                       castNightAction(p.id);
                                    }}
                                    className={`flex-1 p-3 rounded-lg flex justify-between items-center transition-all ${isSelected ? 'bg-wolf-900 border border-wolf-500 scale-[1.02]' : 'bg-forest-950 border border-white/5 hover:border-moon-400/50'}`}
                                  >
                                    <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{p.name}</span>
                                    {isSelected && <span className="text-[10px] uppercase text-wolf-400">Kill</span>}
                                  </button>
                                  <button
                                    onClick={() => handleAlphaWolfConvert(p.id)}
                                    disabled={!canConvert}
                                    className={`px-4 py-3 rounded-lg transition-all ${isConvertTarget ? 'bg-moon-900 border border-moon-500 scale-[1.02]' : 'bg-forest-950 border border-white/5 hover:border-moon-400/50'} ${!canConvert ? 'opacity-30 cursor-not-allowed' : ''}`}
                                  >
                                    <span className={`font-bold ${isConvertTarget ? 'text-white' : 'text-slate-300'}`}>{lang === 'en' ? 'Convert' : 'Ubah'}</span>
                                  </button>
                                </div>
                              ) : (
                                <button
                                  disabled={isConsecutiveBodyguard}
                                  onClick={() => (me.role === 'cupid' && room.round === 1) ? handleCupidSelect(p.id) : castNightAction(p.id)}
                                  className={`w-full p-3 rounded-lg flex justify-between items-center transition-all ${isSelected ? 'bg-moon-900 border border-moon-500 scale-[1.02]' : 'bg-forest-950 border border-white/5 hover:border-moon-400/50'} ${isConsecutiveBodyguard ? 'opacity-30 cursor-not-allowed' : ''}`}
                                >
                                   <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                      {me.role === 'bodyguard' && p.id === me.id ? (lang === 'en' ? 'Protect Yourself' : 'Lindungi Diri Sendiri') : p.name}
                                      {isConsecutiveBodyguard && <span className="ml-2 text-[10px] uppercase text-wolf-500">Protected Last Night</span>}
                                   </span>
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
                              )}
                           </li>
                         )
                      })}
                    </ul>
                    {me.role === 'cupid' && room.round === 1 && (
                       <div className="mt-4 pt-4 border-t border-white/5">
                          <Button 
                             className="w-full" 
                             disabled={cupidSelection.length !== 2 || !!me.action_target_id}
                             onClick={confirmCupidLovers}
                          >
                             {me.action_target_id ? (lang === 'en' ? 'Confirmed' : 'Terkonfirmasi') : (lang === 'en' ? 'Confirm Lovers' : 'Konfirmasi Pasangan')}
                          </Button>
                       </div>
                    )}
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
                      {[...alivePlayers, { id: null, name: lang === 'en' ? 'No Elimination' : 'Tidak Ada Eliminasi' }].map(p => {
                         const isSelected = myVote?.target_id === p.id;
                         const isTroubleCandidate = !room.settings?.troubleCandidates || room.settings.troubleCandidates.includes(p.id) || p.id === null;
                         
                         // Pacifist logic: if peace exists, they can ONLY vote peace
                         const isPacifistRestricted = me.role === 'pacifist' && room.settings?.pacifistActive && p.id !== null;

                         const isDisabled = isCastingVote || 
                                          (me.role === 'idiot' && room.settings?.idiotRevealed === me.id) ||
                                          !isTroubleCandidate ||
                                          isPacifistRestricted;

                         return (
                           <li key={p.id || 'none'}>
                             <button
                               onClick={() => castVote(p.id)}
                               disabled={isDisabled}
                               className={`w-full p-3 rounded-lg flex justify-between items-center transition-all ${isSelected ? 'bg-wolf-900 border border-wolf-500 scale-[1.02]' : 'bg-forest-950 border border-white/5 hover:border-moon-400/50'} ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                             >
                                <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                  {p.name}
                                  {(me.role === 'idiot' && room.settings?.idiotRevealed === me.id) && <span className="ml-2 text-[10px] text-wolf-500">Voting Disabled</span>}
                                  {(isPacifistRestricted) && <span className="ml-2 text-[10px] text-moon-500">Pacifist Restricted</span>}
                                </span>
                                {isSelected && <span className="text-xs uppercase tracking-widest text-wolf-200">Voted</span>}
                             </button>
                           </li>
                         )
                      })}
                    </ul>
                 </div>
              )}

              {room.phase === 'day' && me.role === 'troublemaker' && !room.settings?.troublemakerUsed && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto mb-8 bg-forest-900 border border-white/10 p-4 rounded-xl">
                    <h3 className="font-serif text-lg mb-4 text-moon-200 border-b border-white/5 pb-2">
                       {lang === 'en' ? 'Stir up trouble' : 'Buat Keonaran'}
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">{lang === 'en' ? 'Select 2 players to restrict today\'s vote to only them.' : 'Pilih 2 pemain untuk membatasi voting hari ini hanya ke mereka.'}</p>
                    <ul className="space-y-2">
                       {alivePlayers.map(p => {
                          const isSelected = troubleSelection.includes(p.id);
                          return (
                             <li key={p.id}>
                                <button
                                   onClick={() => handleTroubleSelect(p.id)}
                                   className={`w-full p-3 rounded-lg flex justify-between items-center transition-all ${isSelected ? 'bg-moon-900 border border-moon-500 scale-[1.02]' : 'bg-forest-950 border border-white/5 hover:border-moon-400/50'}`}
                                >
                                   <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{p.name}</span>
                                   {isSelected && <span className="text-xs uppercase tracking-widest text-moon-200">{lang === 'en' ? 'Selected' : 'Terpilih'}</span>}
                                </button>
                             </li>
                          )
                       })}
                    </ul>
                    <div className="flex gap-3 mt-4">
                       <Button 
                          className="flex-1" 
                          disabled={troubleSelection.length !== 2}
                          onClick={confirmTrouble}
                       >
                          {lang === 'en' ? 'Use Today' : 'Hari Ini'}
                       </Button>
                       <Button 
                          variant="secondary"
                          className="flex-1" 
                          disabled={troubleSelection.length !== 2}
                          onClick={handleTroubleSchedule}
                       >
                          {lang === 'en' ? 'Tomorrow' : 'Esok Hari'}
                       </Button>
                    </div>
                 </motion.div>
              )}

              {room.phase === 'day' && me.role === 'pacifist' && !room.settings?.pacifistUsed && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto mb-8 bg-forest-900 border border-white/10 p-4 rounded-xl">
                    <h3 className="font-serif text-lg mb-4 text-moon-200 border-b border-white/5 pb-2">
                       {lang === 'en' ? 'Pacifist Plea' : 'Seruan Damai'}
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">{lang === 'en' ? 'Use your ability to force yourself to vote for peace.' : 'Gunakan kemampuanmu untuk memaksa dirimu memilih kedamaian.'}</p>
                    <div className="flex gap-3">
                       <Button 
                          className="flex-1" 
                          onClick={() => handlePacifistAction(false)}
                       >
                          {lang === 'en' ? 'Use Today' : 'Hari Ini'}
                       </Button>
                       <Button 
                          variant="secondary"
                          className="flex-1" 
                          onClick={() => handlePacifistAction(true)}
                       >
                          {lang === 'en' ? 'Tomorrow' : 'Esok Hari'}
                       </Button>
                    </div>
                 </motion.div>
              )}

               {room.phase === 'night' && me.role === 'mason' && room.round === 1 && (
                 <div className="w-full max-w-md mx-auto mb-8 bg-forest-900 border border-white/10 p-4 rounded-xl">
                    <h3 className="font-serif text-lg mb-4 text-moon-200 border-b border-white/5 pb-2">
                       {lang === 'en' ? 'Your Fellow Masons' : 'Saudara Masonmu'}
                    </h3>
                    <ul className="space-y-2">
                      {actualPlayers.filter(p => p.role === 'mason' && p.id !== me.id).length > 0 ? (
                         actualPlayers.filter(p => p.role === 'mason' && p.id !== me.id).map(p => (
                            <li key={p.id} className="p-3 bg-forest-950 rounded-lg border border-white/5">
                               <span className="font-bold text-slate-300">{p.name}</span>
                            </li>
                         ))
                      ) : (
                         <li className="text-slate-400 italic">
                            {lang === 'en' ? 'You are the only Mason.' : 'Kamu adalah satu-satunya Mason.'}
                         </li>
                      )}
                    </ul>
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
