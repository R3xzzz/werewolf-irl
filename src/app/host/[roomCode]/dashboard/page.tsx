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
      
      const updates: any = { phase: newPhase };

      if (newPhase === 'voting') {
         // Clear old votes for this room before opening voting anew
         await supabase.from('votes').delete().eq('room_id', room.id);
      }

      if (newPhase === 'night_transition') {
         await supabase.from('rooms').update({ round: (room.round || 0) + 1 }).eq('id', room.id);
         // Clear temporary daily flags for the next round
         updates.settings = { ...room.settings, troubleCandidates: null, pacifistActive: false };
      }

      if (winner) {
         updates.settings = { ...(room.settings || {}), winner };
      }

      if (newPhase === 'lobby') {
         // Reset players to default state for a new game
         updates.settings = { ...room.settings, winner: null }; // clear winner
         await supabase.from('players').update({ alive: true, role: 'unassigned', action_target_id: null }).eq('room_id', room.id);
      }

      if (newPhase === 'day') {
         const s = room.settings || {};
         let updatedSettings = { ...s, dayAction: null };

         // Check who should act first
         const hasPacifist = alivePlayers.some(p => p.role === 'pacifist') && !s.pacifistUsed;
         const hasTroublemaker = alivePlayers.some(p => p.role === 'troublemaker') && !s.troublemakerUsed;

         if (hasPacifist) {
            updatedSettings.dayAction = 'pacifist';
         } else if (hasTroublemaker) {
            updatedSettings.dayAction = 'troublemaker';
         }

         updates.settings = updatedSettings;

         // Initial Day Popups (History / News)
         if (s.pacifistActive) {
            sendPopup({
               type: 'popup', visibility: 'public',
               title_en: '☮ Peace Chosen', title_id: '☮ Perdamaian Terpilih',
               desc_en: 'No one will be eliminated today by the Pacifist.', desc_id: 'Tidak ada yang dieliminasi hari ini oleh Pacifist.',
               icon: '🕊️', durationMs: 8000
            });
         }

         if (s.troubleCandidates) {
            sendPopup({
               type: 'popup', visibility: 'public',
               title_en: 'Trouble Brews!', title_id: 'Onar Dimulai!',
               desc_en: `Today's vote restricted to: ${players.find(p => p.id === s.troubleCandidates[0])?.name} vs ${players.find(p => p.id === s.troubleCandidates[1])?.name}`,
               desc_id: `Voting hari ini terbatas antara: ${players.find(p => p.id === s.troubleCandidates[0])?.name} vs ${players.find(p => p.id === s.troubleCandidates[1])?.name}`,
               icon: '⚖️', durationMs: 8000
            });
         }
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
            let targetRole = ROLES[target.role];
            if (target.role === 'alpha_wolf') {
               targetRole = Math.random() > 0.5 ? ROLES['alpha_wolf'] : ROLES['villager'];
            }
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
            if (!newSettings.wolvesDisabled) {
               newSettings.werewolfTargetId = target.id;
            }
         } else if (currentRoleAction.id === 'doppelganger') {
            newSettings.doppelTargetId = target.id;
         } else if (currentRoleAction.id === 'troublemaker') {
            newSettings.historyLog.push(`Troublemaker used skill on ${target.name} and another player.`);
         }
      }

      if (currentRoleAction.id === 'cupid' && newSettings.lovers && newSettings.lovers.length === 2) {
         const l1 = players.find(p => p.id === newSettings.lovers[0]);
         const l2 = players.find(p => p.id === newSettings.lovers[1]);
         if (l1 && l2) {
            sendPopup({
               type: 'popup',
               visibility: 'private',
               targetId: l1.id,
               title_en: '❤️ You are in Love!',
               title_id: '❤️ Kamu Jatuh Cinta!',
               desc_en: `Your partner is: ${l2.name}. If one of you dies, the other dies too.`,
               desc_id: `Pasanganmu adalah: ${l2.name}. Jika salah satu mati, yang lain juga ikut mati.`,
               icon: '💖',
               durationMs: 10000
            });
            sendPopup({
               type: 'popup',
               visibility: 'private',
               targetId: l2.id,
               title_en: '❤️ You are in Love!',
               title_id: '❤️ Kamu Jatuh Cinta!',
               desc_en: `Your partner is: ${l1.name}. If one of you dies, the other dies too.`,
               desc_id: `Pasanganmu adalah: ${l1.name}. Jika salah satu mati, yang lain juga ikut mati.`,
               icon: '💖',
               durationMs: 10000
            });
         }
      }

      if ((currentRoleAction.id === 'werewolf' || currentRoleAction.id === 'alpha_wolf') && newSettings.wolvesDisabled) {
         newSettings.wolvesDisabled = false;
         newSettings.historyLog.push("Werewolf attack was disabled tonight due to Disease.");
      }

      if (currentRoleAction.id === 'alpha_wolf' && newSettings.alphaConvertTargetId) {
         const targetId = newSettings.alphaConvertTargetId;
         const target = actualPlayers.find(p => p.id === targetId);
         const isProtected = target?.id === newSettings.lastProtectedPlayerId;

         if (target && !isProtected) {
            await supabase.from('players').update({ role: 'werewolf', team: 'werewolf' }).eq('id', targetId);
            newSettings.historyLog.push(`Alpha Wolf converted ${target.name} into a Werewolf.`);
            newSettings.alphaConverted = true;
         } else if (isProtected) {
            newSettings.historyLog.push(`Alpha Wolf tried to convert ${target?.name} but they were PROTECTED.`);
         }
         newSettings.alphaConvertTargetId = null;
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

   const skipDayAction = async () => {
      if (!room) return;
      const s = room.settings || {};
      let updatedSettings = { ...s };

      if (s.dayAction === 'pacifist') {
         const hasTroublemaker = alivePlayers.some(p => p.role === 'troublemaker') && !s.troublemakerUsed;
         updatedSettings.dayAction = hasTroublemaker ? 'troublemaker' : null;
      } else if (s.dayAction === 'troublemaker') {
         updatedSettings.dayAction = null;
      }

      await supabase.from('rooms').update({ settings: updatedSettings }).eq('id', room.id);
   };

   const killPlayer = async (playerId: string, isCascade = false, source?: string) => {
      const player = players.find(p => p.id === playerId);
      if (!player || !player.alive) return;

      const role = ROLES[player.role];
      let updatesToRoomSettings = { ...(room?.settings || {}) };

      if (source === 'werewolf' || source === 'alpha_wolf') {
         const isProtected = room?.settings?.lastProtectedPlayerId === playerId;
         if (isProtected) {
            // Protected by Bodyguard - Survive!
            return;
         }

         if (player.role === 'diseased') {
            updatesToRoomSettings.wolvesDisabled = true;
         } else if (player.role === 'cursed') {
            await supabase.from('players').update({ role: 'werewolf', team: 'werewolf' }).eq('id', playerId);
            updatesToRoomSettings.historyLog = [...(updatesToRoomSettings.historyLog || []), `Cursed (${player.name}) survived the attack and became a Werewolf.`];
            await supabase.from('rooms').update({ settings: updatesToRoomSettings }).eq('id', room?.id);
            
            sendPopup({
               type: 'popup', visibility: 'private', targetId: playerId,
               title_en: 'Cursed!', title_id: 'Terkutuk!',
               desc_en: 'You survived and became a Werewolf.', desc_id: 'Kamu selamat dan menjadi Manusia Serigala.',
               icon: '🐺', durationMs: 6000
            });
            return;
         }
      }

      await supabase.from('players').update({ alive: false }).eq('id', playerId);

      sendPopup({
         type: 'popup', visibility: 'public',
         title_en: `${player.name} died`, title_id: `${player.name} tereliminasi`,
         desc_en: `Role: ${role?.name || 'Unknown'}`, desc_id: `Peran: ${role?.name_id || 'Tidak diketahui'}`,
         icon: '☠️', durationMs: 5000
      });

      if (room) {
         const phaseLabel = room.phase.includes('day') || room.phase === 'voting' ? 'Day' : 'Night';
         updatesToRoomSettings.historyLog = [...(updatesToRoomSettings.historyLog || []), `${phaseLabel} ${room.round || 1}: ${player.name} (${role?.name}) died.`];
      }

      let newPhase = room?.phase;

      if (player.role === 'hunter') {
         updatesToRoomSettings.phaseBeforeRevenge = room?.phase;
         newPhase = 'hunter_revenge';
         sendPopup({
            type: 'popup', visibility: 'private', targetId: player.id,
            title_en: `Take your revenge!`, title_id: `Balas dendammu!`,
            desc_en: `Choose one player to die with you.`, desc_id: `Pilih satu pemain untuk mati bersamamu.`,
            icon: '🔫', durationMs: 6000
         });
      }

      if (player.role === 'seer') {
         const apprentice = players.find(p => p.role === 'apprentice_seer' && p.alive);
         if (apprentice) {
            await supabase.from('players').update({ role: 'seer' }).eq('id', apprentice.id);
            updatesToRoomSettings.historyLog.push(`Apprentice Seer (${apprentice.name}) became the new Seer.`);
         }
      }

      // Cascade Lovers Death
      const lovers = updatesToRoomSettings.lovers || [];
      if (!isCascade && lovers.includes(playerId)) {
         const otherLoverId = lovers.find((id: string) => id !== playerId);
         const otherLover = players.find(p => p.id === otherLoverId);
         if (otherLoverId && otherLover && otherLover.alive) {
            setTimeout(async () => {
               await killPlayer(otherLoverId, true);
               updatesToRoomSettings.historyLog.push(`Broken Heart: ${otherLover.name} died after ${player.name}'s death.`);
               await supabase.from('rooms').update({ settings: updatesToRoomSettings }).eq('id', room?.id);
               sendPopup({
                  type: 'popup', visibility: 'public',
                  title_en: `Broken Heart`, title_id: `Patah Hati`,
                  desc_en: `${otherLover.name} has died of a broken heart after ${player.name}'s death.`,
                  desc_id: `${otherLover.name} mati karena patah hati setelah kematian ${player.name}.`,
                  icon: '💔', durationMs: 7000
               });
            }, 3000);
         }
      }

      // Doppelgänger Transformation
      if (updatesToRoomSettings.doppelTargetId === playerId) {
         const doppelganger = players.find(p => p.role === 'doppelganger' && p.alive);
         if (doppelganger) {
            await supabase.from('players').update({ role: player.role, team: player.team || role?.team }).eq('id', doppelganger.id);
            updatesToRoomSettings.historyLog.push(`Doppelgänger (${doppelganger.name}) inherited the role of ${player.name} (${role?.name}).`);
            updatesToRoomSettings.doppelTargetId = null;
         }
      }

      await supabase.from('rooms').update({
         phase: newPhase,
         settings: updatesToRoomSettings
      }).eq('id', room?.id);
   };

   const resolveVoting = async (target: any) => {
      if (!target) return;
      if (target.role === 'idiot') {
         sendPopup({
            type: 'popup', visibility: 'public',
            title_en: `${target.name} is the Village Idiot!`, title_id: `${target.name} adalah Village Idiot!`,
            desc_en: `They survived the vote but can never vote again.`, desc_id: `Dia selamat dari voting tapi kehilangan hak suara selamanya.`,
            icon: '🤪', durationMs: 7000
         });
         await supabase.from('rooms').update({
            settings: { ...room?.settings, idiotRevealed: target.id }
         }).eq('id', room?.id);
         return;
      }

      await killPlayer(target.id, false, 'vote');

      if (target.role === 'tanner') {
         sendPopup({
            type: 'popup', visibility: 'public',
            title_en: `Tanner Wins!`, title_id: `Tanner Menang!`,
            desc_en: `${target.name} wanted to be eliminated. They win, but the game continues!`, desc_id: `${target.name} memang ingin dieliminasi. Dia menang, tapi permainan lanjut!`,
            icon: '🎭', durationMs: 8000
         });
      }

      setTimeout(() => {
         if (typeof window !== 'undefined' && room) {
            supabase.from('rooms').select('phase').eq('id', room.id).single().then(({ data }) => {
               if (data && data.phase === 'voting') changePhase('night_transition');
            });
         }
      }, 7000);
   };

   useEffect(() => {
      if (!room || room.phase === 'ended' || room.phase === 'lobby' || room.phase.includes('transition') || (room.round || 0) === 0) return;
      
      // 1. Enforce Missing Heartbreak Deaths (Safety Catch)
      const lovers = room.settings?.lovers || [];
      if (lovers.length === 2) {
         const l1 = players.find(p => p.id === lovers[0]);
         const l2 = players.find(p => p.id === lovers[1]);
         if (l1 && l2) {
            if (!l1.alive && l2.alive) {
               killPlayer(l2.id, true);
            } else if (!l2.alive && l1.alive) {
               killPlayer(l1.id, true);
            }
         }
      }

      // 2. Victory Condition Logic
      const aliveWolves = alivePlayers.filter(p => ROLES[p.role]?.team === 'werewolf');
      const aliveVillagersAndNeutrals = alivePlayers.filter(p => ROLES[p.role]?.team !== 'werewolf');
      
      const totalWolves = actualPlayers.filter(p => ROLES[p.role]?.team === 'werewolf');
      if (totalWolves.length === 0 && room.round > 0) return;

      const areLoversOnlySurvivors = alivePlayers.length === 2 && lovers.length === 2 && lovers.every((id: string) => alivePlayers.find(p => p.id === id));
      const bothLoversAlive = lovers.length === 2 && lovers.every((id: string) => alivePlayers.find(p => p.id === id)?.alive);

      if (areLoversOnlySurvivors) {
         changePhase('ended', 'lovers');
      } else if (aliveWolves.length === 0) {
         changePhase('ended', bothLoversAlive ? 'village_lovers' : 'village');
      } else if (aliveWolves.length >= aliveVillagersAndNeutrals.length) {
         changePhase('ended', bothLoversAlive ? 'werewolf_lovers' : 'werewolf');
      }
   }, [alivePlayers.length, room?.phase, room?.settings?.lovers]);

   const validVotes = votes.filter(vote => players.find(p => p.id === vote.voter_id)?.alive);

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

   const renderNightAssistant = () => {
      if (nightStep === -1) {
         return (
            <div className="text-center p-8">
               <h3 className="text-2xl font-serif text-wolf-100 mb-4">{lang === 'en' ? 'Preparation' : 'Persiapan'}</h3>
               <p className="text-xl text-slate-300 mb-8">{lang === 'en' ? '"Everyone, close your eyes."' : '"Semuanya, tutup mata kalian."'}</p>
               <Button size="lg" onClick={async () => {
                  setNightStep(0);
                  changePhase('night');
                  if (room && room.round === 3) {
                     const drunks = actualPlayers.filter(p => p.role === 'drunk' && p.alive);
                     const drunkSecrets = room.settings?.drunkSecrets || {};
                     for (const drunk of drunks) {
                        const realRole = drunkSecrets[drunk.id] || 'villager';
                        const roleData = ROLES[realRole];
                        await supabase.from('players').update({ role: realRole, team: roleData?.team || 'village' }).eq('id', drunk.id);
                        sendPopup({
                           type: 'popup', visibility: 'private', targetId: drunk.id,
                           title_en: 'Sobriety Hits!', title_id: 'Sudah Sadar!',
                           desc_en: `Your true role is: ${roleData?.name}`, desc_id: `Peran aslimu adalah: ${roleData?.name_id}`,
                           icon: '🍺', durationMs: 10000
                        });
                     }
                  }
                  await supabase.from('rooms').update({ settings: { ...room?.settings, activeNightRole: gameNightRoles[0]?.id || null } }).eq('id', room?.id);
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
                  await supabase.from('rooms').update({ settings: { ...room?.settings, activeNightRole: null } }).eq('id', room?.id);
                  setTimeout(() => changePhase('day'), 3000);
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
                  {lang === 'en' ? '(Role is dead. Wait a few seconds then skip.)' : '(Pemain peran ini mati. Tunggu sebentar lalu lanjut.)'}
               </div>
            ) : (
               <div className="my-6">
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
         <div className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 bg-forest-950 p-4 rounded-xl border border-white/10">
            <div className="flex items-center gap-3">
               <button onClick={toggleLang} className="text-[10px] bg-white/10 px-2 py-0.5 rounded cursor-pointer hover:bg-white/20 transition">{lang.toUpperCase()}</button>
               <button onClick={() => setRulesOpen(true)} className="text-[10px] bg-moon-900/50 text-moon-400 border border-moon-400/30 px-2 py-0.5 rounded cursor-pointer hover:bg-moon-800 transition flex items-center justify-center font-bold">i</button>
               <div className="h-4 w-px bg-white/10" />
               <div>
                  <span className="text-slate-400 text-[10px] uppercase tracking-widest">{lang === 'en' ? 'Phase:' : 'Fase:'}</span>
                  <span className="ml-2 font-bold uppercase tracking-widest text-moon-400 text-xs">{room.phase.replace('_', ' ')}</span>
               </div>
            </div>
            <div className="flex items-center gap-6">
               <div className="bg-forest-900 border border-white/10 px-6 py-2 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">Players</span>
                  <span className="text-2xl font-serif text-white">{actualPlayers.length}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">{lang === 'en' ? 'Alive:' : 'Sisa:'}</span>
                  <span className="font-bold text-xl text-moon-400">{alivePlayers.length}/{actualPlayers.length}</span>
               </div>
            </div>
         </div>

         <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 order-2 md:order-1 glass-panel rounded-2xl p-4 flex flex-col max-h-[80vh]">
               <h3 className="font-serif text-lg mb-4 text-moon-200 border-b border-white/10 pb-2">{lang === 'en' ? 'Master Roster' : 'Pemain'}</h3>
               <ul className="space-y-2 overflow-y-auto flex-1 pr-2">
                  {actualPlayers.map((player) => (
                     <li key={player.id} className={`p-3 rounded-md flex flex-col text-sm ${player.alive ? 'bg-forest-900 border border-white/5' : 'bg-wolf-950/20 opacity-50 border border-wolf-500/20'}`}>
                        <div className="flex justify-between items-center mb-1">
                           <span className="font-bold text-white">{player.name}</span>
                           {player.alive ? (
                              <motion.button 
                                 whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)', borderColor: '#ef4444' }}
                                 whileTap={{ scale: 0.95 }}
                                 onClick={() => killPlayer(player.id)} 
                                 className="text-[10px] uppercase font-bold text-wolf-400 hover:text-white bg-wolf-950 hover:bg-wolf-700 border border-wolf-800/50 px-2 py-1 rounded transition-all cursor-pointer shadow-sm"
                              >
                                 {lang === 'en' ? 'Eliminate' : 'Eliminasi'}
                              </motion.button>
                           ) : (
                              <span className="text-xs text-wolf-600 font-bold uppercase tracking-widest">{lang === 'en' ? 'Dead' : 'Mati'}</span>
                           )}
                        </div>
                        {player.role && <div className="text-moon-400 text-xs">Role: {lang === 'en' ? ROLES[player.role]?.name : ROLES[player.role]?.name_id}</div>}
                     </li>
                  ))}
               </ul>
            </div>

            <div className="w-full md:w-2/3 order-1 md:order-2 glass-panel rounded-2xl flex flex-col h-full">
               <div className="p-4 border-b border-white/10 flex justify-center gap-2 flex-wrap">
                  <Button variant={room.phase.includes('night') ? 'primary' : 'secondary'} size="sm" onClick={() => changePhase('night_transition')}>{lang === 'en' ? 'Start Night' : 'Malam'}</Button>
                  <Button variant={room.phase === 'day' ? 'primary' : 'secondary'} size="sm" onClick={() => changePhase('day')}>{lang === 'en' ? 'Start Day' : 'Siang'}</Button>
                  <Button variant={room.phase === 'voting' ? 'primary' : 'secondary'} size="sm" onClick={() => changePhase('voting')}>{lang === 'en' ? 'Voting' : 'Voting'}</Button>
                  <Button variant="danger" size="sm" onClick={() => changePhase('ended')}>{lang === 'en' ? 'End Game' : 'Akhiri'}</Button>
               </div>

               <div className="flex-1 flex flex-col p-6 min-h-[400px]">
                  {room.phase.includes('night') && renderNightAssistant()}
                  {room.phase === 'day' && (
                     <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <h3 className="text-3xl font-serif text-moon-200 mb-4">{lang === 'en' ? 'Day Phase' : 'Siang Hari'}</h3>
                        {room.settings?.werewolfTargetId ? (
                           <div className="bg-forest-900 p-6 rounded-xl border border-white/10 mb-8 w-full max-w-md">
                              <h4 className="text-xl text-wolf-400 font-bold mb-2">{lang === 'en' ? 'Night Attack' : 'Serangan Malam'}</h4>
                              <p className="text-white mb-6">
                                 {players.find(p => p.id === room.settings.werewolfTargetId)?.name} was targeted. 
                                 {players.find(p => p.id === room.settings.werewolfTargetId)?.id === room.settings.lastProtectedPlayerId && <span className="text-moon-400 font-bold block mt-2 animate-pulse">PROTECTED BY BODYGUARD!</span>}
                              </p>
                              <div className="flex gap-3">
                                 <Button variant="danger" className="flex-1" onClick={async () => {
                                    if (room.settings.werewolfTargetId) await killPlayer(room.settings.werewolfTargetId, false, 'werewolf');
                                    await supabase.from('rooms').update({ settings: { ...room.settings, werewolfTargetId: null } }).eq('id', room.id);
                                 }}>{lang === 'en' ? 'Confirm Kill' : 'Konfirmasi'}</Button>
                                 <Button variant="secondary" className="flex-1" onClick={async () => {
                                    await supabase.from('rooms').update({ settings: { ...room.settings, werewolfTargetId: null } }).eq('id', room.id);
                                 }}>{lang === 'en' ? 'Cancel' : 'Batal'}</Button>
                              </div>
                           </div>
                        ) : (
                           <div className="flex flex-col items-center">
                              {room.settings?.dayAction ? (
                                 <div className="bg-forest-900 p-6 rounded-xl border border-white/10 mb-8 w-full max-w-md">
                                    <h4 className="text-xl text-moon-400 font-bold mb-2">
                                       {room.settings.dayAction === 'pacifist' ? (lang === 'en' ? 'Pacifist Choice' : 'Pilihan Pacifist') : (lang === 'en' ? 'Troublemaker Choice' : 'Pilihan Troublemaker')}
                                    </h4>
                                    <p className="text-slate-400 mb-6 italic">
                                       {lang === 'en' ? 'Waiting for the player to decide...' : 'Menunggu pemain untuk memutuskan...'}
                                    </p>
                                    <Button variant="secondary" className="w-full" onClick={skipDayAction}>
                                       {lang === 'en' ? 'Skip Action (Host Force)' : 'Lewati Aksi (Paksa Host)'}
                                    </Button>
                                 </div>
                              ) : (
                                 <>
                                    <p className="text-lg text-slate-400 mb-8">
                                       {room.settings?.pacifistActive ? (lang === 'en' ? 'Peace has been chosen. Voting is skipped.' : 'Perdamaian dipilih. Voting dilewati.') : (lang === 'en' ? 'Let the village discuss and debate.' : 'Biarin warga diskusi.')}
                                    </p>
                                    {!room.settings?.pacifistActive && <Button size="lg" onClick={() => changePhase('voting')}>{lang === 'en' ? 'Open Voting' : 'Buka Voting'}</Button>}
                                    {room.settings?.pacifistActive && <Button size="lg" onClick={() => changePhase('night_transition')}>{lang === 'en' ? 'Proceed to Night' : 'Lanjut ke Malam'}</Button>}
                                 </>
                              )}
                           </div>
                        )}
                     </div>
                  )}
                  {room.phase === 'hunter_revenge' && (
                     <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <h3 className="text-3xl font-serif text-wolf-400 mb-4">{lang === 'en' ? 'Hunter\'s Revenge' : 'Balas Dendam'}</h3>
                        {(() => {
                           const hunter = players.find(p => p.role === 'hunter');
                           const target = players.find(p => p.id === hunter?.action_target_id);
                           return target ? (
                              <div className="bg-forest-900 p-6 rounded-xl border border-white/10">
                                 <p className="text-xl text-white mb-6">Hunter shoots: <span className="font-bold text-wolf-400">{target.name}</span></p>
                                 <Button variant="danger" onClick={async () => {
                                    await killPlayer(target.id);
                                    if (hunter) await supabase.from('players').update({ action_target_id: null }).eq('id', hunter.id);
                                    await supabase.from('rooms').update({ phase: room.settings.phaseBeforeRevenge }).eq('id', room.id);
                                 }}>{lang === 'en' ? 'Confirm' : 'Konfirmasi'}</Button>
                              </div>
                           ) : <p className="text-slate-400 italic">Waiting for Hunter...</p>;
                        })()}
                     </div>
                  )}
                  {room.phase === 'voting' && (
                     <div className="flex-1 flex flex-col max-w-lg w-full mx-auto">
                        <h3 className="text-center text-2xl font-serif text-moon-200 mb-6">{lang === 'en' ? 'Vote Tally' : 'Hasil Voting'}</h3>
                        <div className="space-y-4 overflow-y-auto flex-1">
                           {groupedVotes.map(({ target, voters }) => (
                              <div key={target?.id || 'none'} className="bg-forest-900 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                                 <div>
                                    <h4 className="font-bold text-white"><span className="text-wolf-400 mr-2">{voters.length}</span> {target?.name || 'No Elimination'}</h4>
                                    <p className="text-xs text-slate-500">{voters.join(', ')}</p>
                                 </div>
                                 <motion.button 
                                    whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => target ? resolveVoting(target) : changePhase('night_transition')}
                                    className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-widest ${target ? 'bg-wolf-950 text-wolf-400 border border-wolf-500/50' : 'bg-moon-950 text-moon-400 border border-moon-500/50'} cursor-pointer`}
                                 >
                                    {target ? (lang === 'en' ? 'Eliminate' : 'Eliminasi') : (lang === 'en' ? 'Confirm' : 'Konfirmasi')}
                                 </motion.button>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
                  {room.phase === 'ended' && (
                     <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <h3 className="text-4xl font-serif mb-4">Game Over</h3>
                        <p className="text-2xl text-moon-400 mb-8 uppercase font-bold">{room.settings?.winner} Wins!</p>
                        <div className="flex flex-col gap-4 w-full max-w-xs">
                           <Button size="lg" className="w-full" onClick={() => changePhase('lobby')}>
                              {lang === 'en' ? 'Play Again' : 'Main Lagi'}
                           </Button>
                           <Button 
                             variant="ghost" 
                             className="text-wolf-500 hover:text-wolf-400 hover:bg-wolf-950/30" 
                             onClick={async () => {
                                if (room) await supabase.from('rooms').delete().eq('id', room.id);
                                router.push('/');
                             }}
                           >
                             {lang === 'en' ? 'Close Room & Exit' : 'Tutup Room & Keluar'}
                           </Button>
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
