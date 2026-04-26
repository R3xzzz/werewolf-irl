import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAllRoles } from "../lib/roles";
import { useLangStore } from "../store/useLangStore";
import { Button } from "./ui/Button";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  const { lang } = useLangStore();
  const [activeTab, setActiveTab] = useState<'rules' | 'roles'>('rules');

  const roles = getAllRoles();
  const villageRoles = roles.filter(r => r.team === 'village');
  const werewolfRoles = roles.filter(r => r.team === 'werewolf');
  const neutralRoles = roles.filter(r => r.team === 'neutral');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        
        <motion.div 
          className="relative w-full max-w-2xl max-h-[90vh] bg-forest-950 border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-forest-900/50">
            <h2 className="text-2xl font-serif text-moon-100 tracking-widest uppercase">
              {lang === 'en' ? 'Game Guide' : 'Panduan Game'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex border-b border-white/10">
            <button 
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'rules' ? 'text-moon-200 border-b-2 border-moon-400 bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}
              onClick={() => setActiveTab('rules')}
            >
              {lang === 'en' ? 'How to Play' : 'Cara Bermain'}
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'roles' ? 'text-moon-200 border-b-2 border-moon-400 bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}
              onClick={() => setActiveTab('roles')}
            >
              {lang === 'en' ? 'Roles' : 'Daftar Peran'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {activeTab === 'rules' ? (
              <div className="space-y-6 text-slate-300 leading-relaxed text-sm">
                <div>
                  <h3 className="text-xl font-serif text-white mb-2">{lang === 'en' ? 'The Objective' : 'Tujuan Permainan'}</h3>
                  <p>{lang === 'en' ? 'Werewolf is a game of deception. The Village must find and eliminate all Werewolves, while the Werewolves must eliminate Villagers until they control the town.' : 'Werewolf adalah permainan tebak-tebakan dan tipuan. Warga harus menemukan dan menghabisi semua Serigala, sementara Serigala harus memakan Warga sampai jumlah mereka mendominasi.'}</p>
                </div>
                <div>
                  <h3 className="text-xl font-serif text-white mb-2">{lang === 'en' ? 'Night Phase' : 'Fase Malam'}</h3>
                  <p>{lang === 'en' ? 'Everyone closes their eyes. The Moderator (Host) will wake up specific roles to perform their secret actions (e.g., Wolves picking a victim, Seer checking a role).' : 'Semua pemain menutup mata. Moderator (Host) akan membangunkan peran-peran tertentu untuk melakukan aksi rahasia mereka (misal: Serigala memilih korban, Penerawang mengecek peran).'}</p>
                </div>
                <div>
                  <h3 className="text-xl font-serif text-white mb-2">{lang === 'en' ? 'Day Phase' : 'Fase Siang'}</h3>
                  <p>{lang === 'en' ? 'Everyone wakes up. The Moderator announces who was killed during the night. The village then discusses and debates who the Werewolves might be.' : 'Semua pemain bangun. Moderator mengumumkan siapa yang mati di malam hari. Warga kemudian berdiskusi dan berdebat untuk mencari tahu siapa Serigalanya.'}</p>
                </div>
                <div>
                  <h3 className="text-xl font-serif text-white mb-2">{lang === 'en' ? 'Voting' : 'Voting / Pemungutan Suara'}</h3>
                  <p>{lang === 'en' ? 'After discussion, everyone votes on who to eliminate. The player with the most votes is killed and their role is NOT revealed (usually).' : 'Setelah diskusi, semua pemain mem-vote siapa yang harus dieliminasi. Pemain dengan vote terbanyak akan mati dan peran mereka TIDAK diberi tahu ke warga (biasanya).'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div>
                   <h3 className="text-xl font-serif text-moon-400 mb-4 border-b border-moon-400/30 pb-2">{lang === 'en' ? 'Village Team' : 'Tim Warga'}</h3>
                   <div className="space-y-4">
                     {villageRoles.map(role => (
                       <div key={role.id} className="bg-white/5 p-4 rounded-lg border border-white/5">
                         <h4 className="font-bold text-white mb-1">{lang === 'en' ? role.name : role.name_id}</h4>
                         <p className="text-sm text-slate-400">{lang === 'en' ? role.description : role.desc_id}</p>
                       </div>
                     ))}
                   </div>
                </div>
                <div>
                   <h3 className="text-xl font-serif text-wolf-400 mb-4 border-b border-wolf-400/30 pb-2">{lang === 'en' ? 'Werewolf Team' : 'Tim Serigala'}</h3>
                   <div className="space-y-4">
                     {werewolfRoles.map(role => (
                       <div key={role.id} className="bg-wolf-950/30 p-4 rounded-lg border border-wolf-500/20">
                         <h4 className="font-bold text-white mb-1">{lang === 'en' ? role.name : role.name_id}</h4>
                         <p className="text-sm text-slate-400">{lang === 'en' ? role.description : role.desc_id}</p>
                       </div>
                     ))}
                   </div>
                </div>
                <div>
                   <h3 className="text-xl font-serif text-amber-400 mb-4 border-b border-amber-400/30 pb-2">{lang === 'en' ? 'Neutral Team' : 'Tim Netral'}</h3>
                   <div className="space-y-4">
                     {neutralRoles.map(role => (
                       <div key={role.id} className="bg-amber-950/30 p-4 rounded-lg border border-amber-500/20">
                         <h4 className="font-bold text-white mb-1">{lang === 'en' ? role.name : role.name_id}</h4>
                         <p className="text-sm text-slate-400">{lang === 'en' ? role.description : role.desc_id}</p>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-white/10 bg-forest-900/50 flex justify-end">
             <Button variant="secondary" onClick={onClose}>
               {lang === 'en' ? 'Close' : 'Tutup'}
             </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
