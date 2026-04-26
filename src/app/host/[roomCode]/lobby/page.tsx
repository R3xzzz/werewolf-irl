"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../../components/ui/Button";
import { useRoomState } from "../../../../hooks/useRoomState";
import { usePlayers } from "../../../../hooks/usePlayers";
import { supabase } from "../../../../lib/supabase";
import { getAutoBalancedRoles, GameMode } from "../../../../lib/gameLogic";
import { getAllRoles } from "../../../../lib/roles";

export default function HostLobbyPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.roomCode.toUpperCase();
  const router = useRouter();

  const { room, loading: roomLoading, error } = useRoomState(roomCode);
  const { players, loading: playersLoading } = usePlayers(room?.id);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mode, setMode] = useState<GameMode>('casual');
  const [selectedCustomRoles, setSelectedCustomRoles] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (room && room.phase !== 'lobby' && room.phase !== 'settings') {
      router.push(`/host/${roomCode}/dashboard`);
    }
  }, [room?.phase, router, roomCode]);

  // Minimum 4 players required
  const canStart = players.filter(p => !p.is_host).length >= 4 || (room && room.code === 'TEST'); // allowing TEST code for debug without 4 players

  const handleStartGame = async () => {
    if (!room) return;
    setStarting(true);

    try {
      // 1. Get non-host players
      const activePlayers = players.filter(p => !p.is_host);
      const rolesToAssign = getAutoBalancedRoles(activePlayers.length, mode, selectedCustomRoles);

      // 2. Assign Roles to Players
      for (let i = 0; i < activePlayers.length; i++) {
        await supabase
          .from('players')
          .update({ role: rolesToAssign[i] })
          .eq('id', activePlayers[i].id);
      }

      // 3. Change Room Phase to Night Transition
      await supabase
        .from('rooms')
        .update({ phase: 'night_transition', settings: { mode } })
        .eq('id', room.id);

      // Redirect into the Dashboard
      router.push(`/host/${roomCode}/dashboard`);
    } catch (err) {
      console.error(err);
      alert("Failed to start game. Check connection.");
      setStarting(false);
    }
  };

  const handleCancelRoom = async () => {
    if (!room) return;
    try {
      await supabase.from('rooms').delete().eq('id', room.id);
      router.push('/');
    } catch (err) {
      console.error(err);
    }
  };

  if (roomLoading || playersLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (error || !room) return <div className="min-h-screen flex items-center justify-center text-wolf-500">Error: {error}</div>;

  const actualPlayers = players.filter(p => !p.is_host);

  return (
    <div className="min-h-screen flex flex-col items-center bg-forest-950 p-6 md:p-12 relative overflow-hidden">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl flex justify-between items-center mb-12 relative z-10"
      >
        <div>
          <h2 className="text-slate-400 text-sm uppercase tracking-widest">Room Code</h2>
          <div className="flex items-center gap-4">
             <h1 className="font-mono text-5xl md:text-6xl font-bold tracking-widest text-moon-400 cursor-pointer hover:text-moon-200 transition-colors"
                 onClick={() => { navigator.clipboard.writeText(roomCode); alert('Copied!');}}>
               {roomCode}
             </h1>
             <p className="text-xs text-slate-500 hidden md:block">(click to copy)</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-slate-400">Total Players: <span className="text-white text-xl font-bold ml-2">{actualPlayers.length}</span></p>
          {actualPlayers.length < 4 && <p className="text-wolf-500 text-sm">Need at least 4 players</p>}
          {actualPlayers.length >= 5 && <p className="text-moon-400 text-sm">Optimal match size</p>}
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8 relative z-10">
        
        {/* Left: Player List */}
        <div className="flex-1 glass-panel p-6 rounded-2xl min-h-[400px]">
          <h3 className="font-serif text-xl border-b border-white/10 pb-4 mb-4">Joined Players</h3>
          
          {actualPlayers.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-slate-500 italic pb-12">
              Waiting for players to join...
            </div>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence>
                {actualPlayers.map((player) => (
                  <motion.li 
                    key={player.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-forest-900/50 p-3 rounded-lg flex justify-between items-center border border-white/5"
                  >
                    <span>{player.name}</span>
                    <Button variant="ghost" size="sm" className="text-wolf-500 hover:text-wolf-400 opacity-50 hover:opacity-100"
                            onClick={async () => await supabase.from('players').delete().eq('id', player.id)}>
                      Kick
                    </Button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {/* Right: Controls & Settings */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          <div className="glass-panel p-6 rounded-2xl">
             <h3 className="font-serif text-xl mb-4">Game Settings</h3>
             
             <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Auto-Balance Mode</label>
                  <select 
                    className="w-full bg-forest-900 border border-white/10 rounded-md p-2 text-white outline-none focus:border-moon-400"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as GameMode)}
                  >
                    <option value="casual">Casual (Simple beginner roles)</option>
                    <option value="competitive">Competitive (Standard balanced)</option>
                    <option value="chaos">Chaos (Fun random roles)</option>
                    <option value="custom">Custom (Select Roles)</option>
                  </select>
                </div>
                
                <p className="text-xs text-slate-500 leading-tight">
                  The system will automatically assign balanced roles based on the {actualPlayers.length} joined players.
                </p>

                {mode === 'custom' && (
                  <div className="mt-4">
                     <p className="text-sm text-slate-400 mb-2 block">Available Roles</p>
                     <div className="max-h-48 overflow-y-auto bg-forest-900/50 border border-white/10 rounded-md p-2 space-y-2">
                        {getAllRoles().filter(r => r.id !== 'villager').map(role => {
                           const isChecked = selectedCustomRoles.includes(role.id);
                           return (
                             <label key={role.id} className="flex items-center gap-3 cursor-pointer group">
                               <input 
                                 type="checkbox" 
                                 className="w-4 h-4 rounded border-white/20 bg-forest-950 text-moon-400 focus:ring-moon-400 focus:ring-offset-forest-900"
                                 checked={isChecked}
                                 onChange={(e) => {
                                    if (e.target.checked) setSelectedCustomRoles(prev => [...prev, role.id]);
                                    else setSelectedCustomRoles(prev => prev.filter(id => id !== role.id));
                                 }}
                               />
                               <span className={`text-sm ${isChecked ? 'text-white' : 'text-slate-400'} group-hover:text-moon-200 transition-colors`}>
                                 {role.name}
                               </span>
                             </label>
                           )
                        })}
                     </div>
                     <p className="text-xs text-slate-500 mt-2">Villagers are automatically added to fill empty slots.</p>
                  </div>
                )}
             </div>

             <Button 
               size="lg" 
               className="w-full relative overflow-hidden group mb-3" 
               disabled={!canStart || starting}
               onClick={handleStartGame}
             >
               {starting ? 'Starting...' : 'START GAME'}
               {canStart && !starting && (
                 <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
               )}
             </Button>

             <Button 
               variant="ghost" 
               size="sm" 
               className="w-full text-wolf-400 hover:text-wolf-300 hover:bg-wolf-950/50" 
               onClick={handleCancelRoom}
               disabled={starting}
             >
               Cancel Room
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
