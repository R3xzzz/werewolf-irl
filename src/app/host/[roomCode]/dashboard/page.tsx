"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../../components/ui/Button";
import { useRoomState } from "../../../../hooks/useRoomState";
import { usePlayers } from "../../../../hooks/usePlayers";
import { useVotes } from "../../../../hooks/useVotes";
import { useLangStore } from "../../../../store/useLangStore";
import { supabase } from "../../../../lib/supabase";
import { getNightActionRoles, ROLES } from "../../../../lib/roles";
import { RulesModal } from "../../../../components/RulesModal";
import { useGameBroadcast } from "../../../../hooks/useGameBroadcast";

export default function HostDashboardPage({ params }: { params: Promise<{ roomCode: string }> }) {
   const resolvedParams = use(params);
   const roomCode = resolvedParams.roomCode.toUpperCase();
   const router = useRouter();

   const { lang, toggleLang } = useLangStore();
   const { room, loading: roomLoading } = useRoomState(roomCode);
   const { players, loading: playersLoading } = usePlayers(room?.id);
   const { votes } = useVotes(room?.id);

   const [nightStep, setNightStep] = useState(-1); // -1 = Everyone close eyes
   const [rulesOpen, setRulesOpen] = useState(false);
   
   const { sendPopup } = useGameBroadcast(roomCode);

   // Derived state
   const actualPlayers = players.filter(p => !p.is_host);
   const alivePlayers = actualPlayers.filter(p => p.alive);

   // Roles present in this specific game session
   const activeRoleIds = Array.from(new Set(actualPlayers.map(p => p.role)));

   // Filter the central Night Action Roles down to only the ones actually in THIS game
   const gameNightRoles = getNightActionRoles().filter(r => activeRoleIds.includes(r.id));

   const changePhase = async (newPhase: string, winner?: string) => {
      if (!room) return;
      if (newPhase === 'voting') {
         // Clear old votes for this room before opening voting anew
         await supabase.from('votes').delete().eq('room_id', room.id);
      }

      const updates: any = { phase: newPhase };
      if (winner) {
         updates.settings = { ...(room.settings || {}), winner };
      }

      if (newPhase === 'lobby') {
         // Reset players to default state for a new game
         updates.settings = { ...room.settings, winner: null }; // clear winner
         await supabase.from('players').update({ alive: true, role: 'unassigned', action_target_id: null }).eq('room_id', room.id);
      }

      await supabase.from('rooms').update(updates).eq('id', room.id);

      if (newPhase === 'lobby') {
         router.push(`/host/${roomCode}/lobby`);
      }
   };

   const confirmNightAction = async (currentRoleAction: any, rolePlayers: any[]) => {
      let newSettings = { ...(room?.settings || {}) };

      for (const p of rolePlayers) {
         if (!p.action_target_id) continue;
         const target = actualPlayers.find(t => t.id === p.action_target_id);
         if (!target) continue;

         if (currentRoleAction.id === 'seer') {
            const targetRole = ROLES[target.role];
            sendPopup({
               type: 'popup',
               visibility: 'private',
               targetId: p.id,
               title_en: `${target.name} is ${targetRole?.name}`,
               title_id: `${target.name} adalah ${targetRole?.name_id}`,
               icon: '👁️',
               durationMs: 8000
            });
         } else if (currentRoleAction.id === 'bodyguard') {
            newSettings.lastProtectedPlayerId = target.id;
         } else if (currentRoleAction.id === 'werewolf' || currentRoleAction.id === 'alpha_wolf') {
            newSettings.werewolfTargetId = target.id;
         } else if (currentRoleAction.id === 'doppelganger') {
            newSettings.doppelTargetId = target.id;
         }
      }

      if (currentRoleAction.id === 'cupid' && newSettings.lovers && newSettings.lovers.length === 2) {
         const l1 = players.find(p => p.id === newSettings.lovers[0]);
         const l2 = players.find(p => p.id === newSettings.lovers[1]);
         if (l1 && l2) {
            const logMsg = `Lovers Pair Created: ${l1.name} ❤️ ${l2.name}`;
            if (!newSettings.historyLog.includes(logMsg)) {
               newSettings.historyLog.push(logMsg);
            }
         }
      }

      const nextStep = nightStep + 1;
      setNightStep(nextStep);
      newSettings.activeNightRole = gameNightRoles[nextStep]?.id || null;

      await supabase.from('rooms').update({
         settings: newSettings
      }).eq('id', room?.id);
      
      if (rolePlayers.length > 0) {
         await supabase.from('players').update({ action_target_id: null }).in('id', rolePlayers.map(p => p.id));
      }
   };

   const killPlayer = async (playerId: string, isCascade = false) => {
      const player = players.find(p => p.id === playerId);
      if (!player || !player.alive) return;

      const role = ROLES[player.role];

      await supabase.from('players').update({ alive: false }).eq('id', playerId);

      sendPopup({
         type: 'popup',
         visibility: 'public',
         title_en: `${player.name} died`,
         title_id: `${player.name} tereliminasi`,
         desc_en: `Role: ${role?.name || 'Unknown'}`,
         desc_id: `Peran: ${role?.name_id || 'Tidak diketahui'}`,
         icon: '☠️',
         durationMs: 5000
      });

      let updatesToRoomSettings = { ...(room?.settings || {}) };

      if (room) {
         const phaseLabel = room.phase.includes('day') || room.phase === 'voting' ? 'Day' : 'Night';
         const newLog = `${phaseLabel} ${room.round || 1}: ${player.name} (${role?.name}) died.`;
         const currentHistory = updatesToRoomSettings.historyLog || [];
         updatesToRoomSettings.historyLog = [...currentHistory, newLog];
      }

      let newPhase = room?.phase;

      if (player.role === 'hunter') {
         updatesToRoomSettings.phaseBeforeRevenge = room?.phase;
         newPhase = 'hunter_revenge';
         
         // Send private popup to hunter to let them know it's time
         sendPopup({
            type: 'popup',
            visibility: 'private',
            targetId: player.id,
            title_en: `Take your revenge!`,
            title_id: `Balas dendammu!`,
            desc_en: `Choose one player to die with you.`,
            desc_id: `Pilih satu pemain untuk mati bersamamu.`,
            icon: '🔫',
            durationMs: 6000
         });
      }

      if (player.role === 'seer') {
         const apprentice = players.find(p => p.role === 'apprentice_seer' && p.alive);
         if (apprentice) {
            await supabase.from('players').update({ role: 'seer' }).eq('id', apprentice.id);
            updatesToRoomSettings.historyLog.push(`Apprentice Seer (${apprentice.name}) became the new Seer.`);
         }
      }

      // 1. Cascade Lovers Death
      const lovers = updatesToRoomSettings.lovers || [];
      if (!isCascade && lovers.includes(playerId)) {
         const otherLoverId = lovers.find((id: string) => id !== playerId);
         const otherLover = players.find(p => p.id === otherLoverId);
         if (otherLoverId && otherLover && otherLover.alive) {
            setTimeout(async () => {
               await killPlayer(otherLoverId, true);
               sendPopup({
                  type: 'popup',
                  visibility: 'public',
                  title_en: `Broken Heart`,
                  title_id: `Patah Hati`,
                  desc_en: `${otherLover.name} has died of a broken heart after ${player.name}'s death.`,
                  desc_id: `${otherLover.name} mati karena patah hati setelah kematian ${player.name}.`,
                  icon: '💔',
                  durationMs: 7000
               });
            }, 3000);
         }
      }

      // 2. Doppelgänger Transformation
      if (updatesToRoomSettings.doppelTargetId === playerId) {
         const doppelganger = players.find(p => p.role === 'doppelganger' && p.alive);
         if (doppelganger) {
            await supabase.from('players').update({ 
               role: player.role, 
               team: player.team || role?.team 
            }).eq('id', doppelganger.id);
            
            updatesToRoomSettings.historyLog.push(`Doppelgänger (${doppelganger.name}) inherited the role of ${player.name} (${role?.name}).`);
            updatesToRoomSettings.doppelTargetId = null;

            setTimeout(() => {
               sendPopup({
                  type: 'popup',
                  visibility: 'private',
                  targetId: doppelganger.id,
                  title_en: 'Target Died!',
                  title_id: 'Target Tereliminasi!',
                  desc_en: `You have transformed into: ${role?.name || 'Unknown'}`,
                  desc_id: `Kamu telah berubah menjadi: ${role?.name_id || 'Tidak diketahui'}`,
                  icon: '🎭',
                  durationMs: 6000
               });
            }, 1000);
         }
      }

      await supabase.from('rooms').update({
         phase: newPhase,
         settings: updatesToRoomSettings
      }).eq('id', room?.id);
   };

   // Auto Win Condition Checker
   useEffect(() => {
      if (!room || room.phase === 'ended' || room.phase === 'lobby') return;

      const aliveWolves = alivePlayers.filter(p => ROLES[p.role]?.team === 'werewolf');
      const aliveVillagersAndNeutrals = alivePlayers.filter(p => ROLES[p.role]?.team !== 'werewolf');

      // We only auto-end if there was a game actually populated with wolves to prevent instant empty room finishes
      const totalWolves = actualPlayers.filter(p => ROLES[p.role]?.team === 'werewolf');
      if (totalWolves.length === 0) return;

      if (aliveWolves.length === 0) {
         changePhase('ended', 'village');
      } else if (aliveWolves.length >= aliveVillagersAndNeutrals.length) {
         changePhase('ended', 'werewolf');
      }
   }, [alivePlayers.length, room?.phase]);

   useEffect(() => {
      // Failsafe auto-redirect if phase is externally set to lobby
      if (room?.phase === 'lobby') {
         router.push(`/host/${roomCode}/lobby`);
      }
   }, [room?.phase, roomCode, router]);

   // Only consider votes from players who are currently alive
   const validVotes = votes.filter(vote => {
      const voter = players.find(p => p.id === vote.voter_id);
      return voter && voter.alive;
   });

   // Tally votes helper
   const groupedVotes = Array.from(
      validVotes.reduce((acc, vote) => {
         if (!acc.has(vote.target_id)) acc.set(vote.target_id, []);
         const voter = players.find(p => p.id === vote.voter_id);
         if (voter && voter.alive) acc.get(vote.target_id)!.push(voter.name);
         return acc;
      }, new Map<string, string[]>())
   ).map(([targetId, voters]) => {
      const target = players.find(p => p.id === targetId);
      return { target, voters };
   }).sort((a, b) => b.voters.length - a.voters.length);

   // The Assistant view for the Night
   const renderNightAssistant = () => {
      if (nightStep === -1) {
         return (
            <div className="text-center p-8">
               <h3 className="text-2xl font-serif text-wolf-100 mb-4">{lang === 'en' ? 'Preparation' : 'Persiapan'}</h3>
               <p className="text-xl text-slate-300 mb-8">{lang === 'en' ? '"Everyone, close your eyes."' : '"Semuanya, tutup mata kalian."'}</p>
               <Button size="lg" onClick={async () => {
                  setNightStep(0);
                  changePhase('night');
                  await supabase.from('rooms').update({
                     settings: { ...room?.settings, activeNightRole: gameNightRoles[0]?.id || null }
                  }).eq('id', room?.id);
               }}>{lang === 'en' ? 'Begin Night Order' : 'Mulai Malam'}</Button>
            </div>
         );
      }

      if (nightStep >= gameNightRoles.length) {
         return (
            <div className="text-center p-8">
               <h3 className="text-2xl font-serif text-moon-100 mb-4">{lang === 'en' ? 'Dawn Approaches' : 'Pagi Telah Tiba'}</h3>
               <p className="text-xl text-slate-300 mb-8">{lang === 'en' ? '"Everyone, wake up."' : '"Semuanya, bangun."'}</p>
               <Button size="lg" onClick={async () => {
                  setNightStep(-1);
                  changePhase('day_transition');
                  await supabase.from('rooms').update({
                     settings: { ...room?.settings, activeNightRole: null }
                  }).eq('id', room?.id);
                  setTimeout(() => changePhase('day'), 3000); // Cinematic delay
               }}>{lang === 'en' ? 'Start Day Phase' : 'Mulai Siang'}</Button>
            </div>
         );
      }

      const currentRoleAction = gameNightRoles[nightStep];
      const rolePlayers = actualPlayers.filter(p => p.role === currentRoleAction.id && p.alive);

      return (
         <div className="text-center p-8 relative">
            <h3 className="text-3xl font-serif text-white mb-2">{lang === 'en' ? currentRoleAction.name : currentRoleAction.name_id}</h3>

            {rolePlayers.length === 0 ? (
               <div className="text-slate-500 italic my-6">
                  {lang === 'en' ? '(Role is in game but player is dead. Wait a few seconds to pretend they are acting, then skip.)' : '(Pemain peran ini udah mati. Diem aja beberapa detik buat ngecoh, terus skip.)'}
               </div>
            ) : (
               <div className="my-6">
                  {/* Player Selections View */}
                  <div className="bg-forest-900 p-4 rounded-lg border border-white/5 inline-block text-left mb-4 w-full">
                     <h4 className="text-sm text-slate-400 mb-2">{lang === 'en' ? 'Player Selections:' : 'Pilihan Pemain:'}</h4>
                     <ul className="space-y-2">
                        {rolePlayers.map(p => {
                           const target = actualPlayers.find(t => t.id === p.action_target_id);
                           return (
                              <li key={p.id} className="text-white flex justify-between items-center border-b border-white/5 pb-2">
                                <span>{p.name}</span>
                                <span className={`font-bold ${target ? 'text-moon-400' : 'text-slate-500 animate-pulse'}`}>
                                   {target ? `👉 ${target.name}` : (lang === 'en' ? 'Choosing...' : 'Memilih...')}
                                </span>
                              </li>
                           );
                        })}
                     </ul>
                  </div>
                  <p className="text-lg text-slate-300">{lang === 'en' ? currentRoleAction.description : currentRoleAction.desc_id}</p>
               </div>
            )}

            <div className="mt-8 flex justify-center gap-4">
               <Button size="lg" onClick={() => confirmNightAction(currentRoleAction, rolePlayers)}>
                  {lang === 'en' ? 'Confirm & Next Role' : 'Konfirmasi & Lanjut'}
               </Button>
            </div>
         </div>
      );
   };

   if (roomLoading || playersLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
   if (!room) return <div>Room not found</div>;

   return (
      <div className="min-h-screen bg-black text-white p-4 md:p-8 flex flex-col items-center">

         {/* Header Info */}
         <div className="w-full max-w-5xl flex justify-between items-center mb-8 bg-forest-950 p-4 rounded-xl border border-white/10">
            <div className="flex items-center gap-4">
               <button onClick={toggleLang} className="text-[10px] bg-white/10 px-2 py-0.5 rounded cursor-pointer hover:bg-white/20 transition">
                  {lang.toUpperCase()}
               </button>
               <button onClick={() => setRulesOpen(true)} className="text-[10px] bg-moon-900/50 text-moon-400 border border-moon-400/30 px-2 py-0.5 rounded cursor-pointer hover:bg-moon-800 transition flex items-center justify-center font-bold">
                  i
               </button>
               <div>
                  <span className="text-slate-400 text-sm">{lang === 'en' ? 'Phase:' : 'Fase:'}</span>
                  <span className="ml-2 font-bold uppercase tracking-widest text-moon-400">{room.phase.replace('_', ' ')}</span>
               </div>
            </div>
            <div className="text-right">
               <span className="text-slate-400 text-sm">{lang === 'en' ? 'Alive:' : 'Sisa:'}</span>
               <span className="ml-2 font-bold text-lg">{alivePlayers.length}/{actualPlayers.length}</span>
            </div>
         </div>

         <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6">

            {/* Left Col: Player List Admin */}
            <div className="w-full md:w-1/3 order-2 md:order-1 glass-panel rounded-2xl p-4 flex flex-col max-h-[80vh]">
               <h3 className="font-serif text-lg mb-4 text-moon-200 border-b border-white/10 pb-2">{lang === 'en' ? 'Master Roster' : 'Pemain'}</h3>
               <ul className="space-y-2 overflow-y-auto flex-1 pr-2">
                  {actualPlayers.map((player) => (
                     <li key={player.id} className={`p-3 rounded-md flex flex-col text-sm ${player.alive ? 'bg-forest-900 border border-white/5' : 'bg-wolf-950/20 opacity-50 border border-wolf-500/20'}`}>
                        <div className="flex justify-between items-center mb-1">
                           <span className="font-bold text-white">{player.name}</span>
                           {player.alive ? (
                              <button onClick={() => killPlayer(player.id)} className="text-[10px] uppercase font-bold text-wolf-400 hover:text-white bg-wolf-950 hover:bg-wolf-700 border border-wolf-800/50 px-2 py-1 rounded transition-colors">{lang === 'en' ? 'Eliminate' : 'Eliminasi'}</button>
                           ) : (
                              <span className="text-xs text-wolf-600 font-bold uppercase tracking-widest">{lang === 'en' ? 'Dead' : 'Mati'}</span>
                           )}
                        </div>
                        {player.role && player.role !== 'unassigned' && (
                           <div className="text-moon-400 text-xs">Role: {lang === 'en' ? ROLES[player.role]?.name : ROLES[player.role]?.name_id}</div>
                        )}
                     </li>
                  ))}
               </ul>
            </div>

            {/* Main Admin Area */}
            <div className="w-full md:w-2/3 order-1 md:order-2 glass-panel rounded-2xl flex flex-col h-full">

               {/* Top Toolbar */}
               <div className="p-4 border-b border-white/10 flex justify-center gap-2 flex-wrap">
                  <Button variant={room.phase.includes('night') ? 'primary' : 'secondary'} size="sm" onClick={() => changePhase('night_transition')}>{lang === 'en' ? 'Start Night' : 'Malam'}</Button>
                  <Button variant={room.phase === 'day' ? 'primary' : 'secondary'} size="sm" onClick={() => changePhase('day')}>{lang === 'en' ? 'Start Day' : 'Siang'}</Button>
                  <Button variant={room.phase === 'voting' ? 'primary' : 'secondary'} size="sm" onClick={() => changePhase('voting')}>{lang === 'en' ? 'Voting' : 'Voting'}</Button>
                  <Button variant="danger" size="sm" onClick={() => changePhase('ended')}>{lang === 'en' ? 'End Game' : 'Akhiri'}</Button>
               </div>

               {/* Smart Assistant View */}
               <div className="flex-1 flex flex-col p-6 min-h-[400px]">
                  {room.phase.includes('night') && renderNightAssistant()}

                  {room.phase === 'day' && (
                     <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <h3 className="text-3xl font-serif text-moon-200 mb-4">{lang === 'en' ? 'Day Phase' : 'Siang Hari'}</h3>
                        
                        {/* Night Resolution UI */}
                        {(() => {
                           if (room.settings?.werewolfTargetId) {
                              const target = players.find(p => p.id === room.settings.werewolfTargetId);
                              const wasProtected = target?.id === room.settings.lastProtectedPlayerId;

                              return (
                                 <div className="bg-forest-900 p-6 rounded-xl border border-white/10 mb-8 w-full max-w-md">
                                    <h4 className="text-xl text-wolf-400 font-bold mb-2">
                                       {lang === 'en' ? 'Night Attack Result' : 'Hasil Serangan Malam'}
                                    </h4>
                                    <p className="text-white mb-4">
                                       {lang === 'en' ? `The Werewolves attacked ` : `Werewolf menyerang `}
                                       <span className="font-bold text-lg">{target?.name || 'Unknown'}</span>.
                                    </p>
                                    {wasProtected ? (
                                       <>
                                          <p className="text-moon-400 font-bold mb-6 text-lg animate-pulse">
                                             {lang === 'en' ? 'They were PROTECTED by the Bodyguard!' : 'Dia DILINDUNGI oleh Bodyguard!'}
                                          </p>
                                          <Button size="lg" onClick={async () => {
                                             await supabase.from('rooms').update({ settings: { ...room.settings, werewolfTargetId: null, lastProtectedPlayerId: null } }).eq('id', room.id);
                                          }}>
                                             {lang === 'en' ? 'Acknowledge' : 'Mengerti'}
                                          </Button>
                                       </>
                                    ) : (
                                       <div className="flex flex-col sm:flex-row gap-3 w-full mt-6">
                                          <Button variant="danger" className="w-full" onClick={async () => {
                                             if (target) await killPlayer(target.id);
                                             await supabase.from('rooms').update({ settings: { ...room.settings, werewolfTargetId: null, lastProtectedPlayerId: null } }).eq('id', room.id);
                                          }}>
                                             {lang === 'en' ? 'Confirm Kill' : 'Konfirmasi Kematian'}
                                          </Button>
                                          <Button variant="secondary" className="w-full" onClick={async () => {
                                             await supabase.from('rooms').update({ settings: { ...room.settings, werewolfTargetId: null, lastProtectedPlayerId: null } }).eq('id', room.id);
                                          }}>
                                             {lang === 'en' ? 'Cancel / Undo' : 'Batal / Anulir'}
                                          </Button>
                                       </div>
                                    )}
                                 </div>
                              );
                           }
                           return null;
                        })()}

                        {!room.settings?.werewolfTargetId && (
                           <>
                              <p className="text-lg text-slate-400 mb-8">{lang === 'en' ? 'Let the village discuss and debate.' : 'Biarin warga diskusi buat cari tau siapa serigalanya.'}</p>
                              <Button size="lg" onClick={() => changePhase('voting')}>{lang === 'en' ? 'Open Voting' : 'Buka Voting'}</Button>
                           </>
                        )}
                     </div>
                  )}

                  {room.phase === 'hunter_revenge' && (
                     <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <h3 className="text-3xl font-serif text-wolf-400 mb-4">{lang === 'en' ? 'Hunter\'s Revenge' : 'Balas Dendam Hunter'}</h3>
                        <p className="text-lg text-slate-400 mb-8">{lang === 'en' ? 'Waiting for the Hunter to shoot...' : 'Menunggu Hunter menembak...'}</p>
                        
                        {(() => {
                           const hunter = players.find(p => p.role === 'hunter');
                           const target = hunter?.action_target_id ? players.find(p => p.id === hunter.action_target_id) : null;
                           
                           if (target) {
                              return (
                                 <div className="bg-forest-900 p-6 rounded-xl border border-white/10 mb-8">
                                    <p className="text-xl text-white mb-4">
                                       {lang === 'en' ? `Hunter aims at: ` : `Hunter membidik: `} 
                                       <span className="font-bold text-wolf-400">{target.name}</span>
                                    </p>
                                    <Button variant="danger" size="lg" onClick={async () => {
                                       await killPlayer(target.id);
                                       if (hunter) await supabase.from('players').update({ action_target_id: null }).eq('id', hunter.id);
                                       await supabase.from('rooms').update({ phase: room.settings?.phaseBeforeRevenge || 'day' }).eq('id', room.id);
                                    }}>
                                       {lang === 'en' ? 'Confirm Shot' : 'Konfirmasi Tembakan'}
                                    </Button>
                                 </div>
                              );
                           }
                           return null;
                        })()}
                     </div>
                  )}

                  {room.phase === 'voting' && (
                     <div className="flex-1 flex flex-col max-w-lg w-full mx-auto">
                        <div className="text-center mb-6">
                           <h3 className="text-3xl font-serif text-moon-200 mb-1">{lang === 'en' ? 'Live Vote Tally' : 'Hasil Voting'}</h3>
                           <p className="text-sm text-slate-400">{lang === 'en' ? 'Total votes cast:' : 'Total Suara Masuk:'} {validVotes.length} / {alivePlayers.length}</p>
                        </div>

                        {validVotes.length === 0 ? (
                           <div className="flex-1 flex items-center justify-center text-slate-500 italic">
                              {lang === 'en' ? 'Waiting for players to vote...' : 'Lagi nunggu pada milih...'}
                           </div>
                        ) : (
                           <div className="flex-1 overflow-y-auto space-y-4">
                              {groupedVotes.map(({ target, voters }) => (
                                 <div key={target?.id || Math.random()} className="bg-forest-900 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                                    <div>
                                       <h4 className="text-xl font-bold text-white mb-1"><span className="text-wolf-400 mr-2">{voters.length}</span> {target?.name || (lang === 'en' ? 'No Elimination' : 'Tidak Ada Eliminasi')}</h4>
                                       <p className="text-xs text-slate-400">Voters: {voters.join(', ')}</p>
                                    </div>
                                    {target?.alive ? (
                                       <button
                                          onClick={() => killPlayer(target.id)}
                                          className="ml-4 bg-wolf-950 text-wolf-400 border border-wolf-500/50 hover:bg-wolf-900 px-4 py-2 rounded text-sm font-bold transition-colors uppercase tracking-widest"
                                       >
                                          {lang === 'en' ? 'Eliminate' : 'Eliminasi'}
                                       </button>
                                    ) : !target ? (
                                       <button
                                          onClick={() => changePhase('night_transition')}
                                          className="ml-4 bg-moon-950 text-moon-400 border border-moon-500/50 hover:bg-moon-900 px-4 py-2 rounded text-sm font-bold transition-colors uppercase tracking-widest"
                                       >
                                          {lang === 'en' ? 'Confirm Skip' : 'Konfirmasi Lewati'}
                                       </button>
                                    ) : null}
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  )}

                  {room.phase === 'ended' && (
                     <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <h3 className="text-4xl font-serif mb-4 text-white">Game Over</h3>
                        {room.settings?.winner === 'village' && (
                           <p className="text-2xl text-emerald-400 mb-8 uppercase tracking-widest font-bold">{lang === 'en' ? 'The Village Wins' : 'Warga Menang!'}</p>
                        )}
                        {room.settings?.winner === 'werewolf' && (
                           <p className="text-2xl text-wolf-500 mb-8 uppercase tracking-widest font-bold">{lang === 'en' ? 'The Werewolves Win' : 'Serigala Menang!'}</p>
                        )}

                        <p className="text-sm text-slate-400 max-w-sm mb-6">
                           {lang === 'en' ? 'Return to the Lobby to restart everything and shuffle new roles for the exact same players!' : 'Balik ke lobby buat ngacak role baru ke pemain yang sama!'}
                        </p>
                        <div className="flex flex-col gap-4 items-center justify-center">
                           <Button size="lg" className="w-full" onClick={() => changePhase('lobby')}>
                              {lang === 'en' ? 'Play Again (Reset Room)' : 'Main Lagi (Reset)'}
                           </Button>
                           <div className="mt-4 text-center">
                              <p className="text-xs text-amber-500/80 mb-2 max-w-sm">
                                 {lang === 'en' ? 'Warning: Pressing this will close the lobby for everyone.' : 'Peringatan: Menekan tombol ini akan membubarkan lobby untuk semua orang.'}
                              </p>
                              <Button variant="danger" size="sm" onClick={async () => {
                                 if (room) {
                                   await supabase.from('rooms').delete().eq('id', room.id);
                                 }
                                 router.push('/');
                              }}>
                                 {lang === 'en' ? 'Back to Main Menu' : 'Kembali ke Menu Utama'}
                              </Button>
                           </div>
                        </div>
                     </div>
                  )}
               </div>

            </div>
         </div>

         <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
      </div>
   );
}
