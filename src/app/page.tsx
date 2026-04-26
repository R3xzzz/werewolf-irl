"use client";

import { useState } from "react";
import { motion, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import Link from "next/link";
import { Button } from "../components/ui/Button";
import { RulesModal } from "../components/RulesModal";
import { useLangStore } from "../store/useLangStore";

export default function Home() {
  const [rulesOpen, setRulesOpen] = useState(false);
  const { lang, toggleLang } = useLangStore();

  // Mouse tracking for spotlight effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { damping: 50, stiffness: 400 });
  const springY = useSpring(mouseY, { damping: 50, stiffness: 400 });

  function handleMouseMove({ clientX, clientY, currentTarget }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <main 
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden group"
    >
      {/* Spotlight Follower */}
      <motion.div
        className="pointer-events-none absolute -inset-px z-0 transition duration-300 opacity-0 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${springX}px ${springY}px,
              rgba(167, 139, 250, 0.15),
              transparent 80%
            )
          `,
        }}
      />
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-forest-900 via-forest-950 to-black">
        {/* Animated Moon/Glow */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-moon-400/10 blur-[120px] rounded-full animate-pulse-slow pointer-events-none" />
      </div>

      <div className="absolute top-6 left-6 z-50">
        <button onClick={toggleLang} className="text-xs bg-white/10 px-3 py-1 rounded-full cursor-pointer hover:bg-white/20 transition font-bold uppercase tracking-wider text-moon-200">
          {lang === 'en' ? 'EN' : 'ID'}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-10 md:mb-12"
        >
          <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-widest text-moon-50 mb-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] relative inline-block">
            WEREWOLF
            <span className="absolute -top-2 -right-4 md:-top-3 md:-right-12 text-[9px] md:text-xs font-sans bg-gradient-to-r from-moon-600 via-moon-200 to-moon-600 bg-[length:200%_100%] animate-shimmer text-forest-950 px-2 md:px-2.5 py-0.5 rounded-full shadow-[0_0_15px_rgba(167,139,250,0.4)] rotate-12 font-bold tracking-wider border border-white/20">BETA</span>
          </h1>
          <p className="font-sans text-moon-200/80 text-sm md:text-lg uppercase tracking-[0.2em] md:tracking-[0.3em]">
            {lang === 'en' ? 'Trust No One.' : 'Jangan Percaya Siapapun.'}
          </p>
        </motion.div>

        <motion.div
          className="w-full flex flex-col gap-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Button asChild size="lg" className="w-full h-14 text-lg bg-moon-800 hover:bg-moon-700">
            <Link href="/join">{lang === 'en' ? 'Join Room' : 'Gabung Room'}</Link>
          </Button>
          
          <Button asChild variant="secondary" size="lg" className="w-full h-14 text-lg">
            <Link href="/host/create">{lang === 'en' ? 'Create Room' : 'Buat Room'}</Link>
          </Button>

          <Button variant="ghost" size="lg" className="w-full text-slate-300 hover:text-white mt-4" onClick={() => setRulesOpen(true)}>
            {lang === 'en' ? 'How to Play & Roles' : 'Cara Bermain & Daftar Peran'}
          </Button>
        </motion.div>
        
        <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
        
        <div className="mt-12 text-center text-[13px] md:text-sm text-slate-500 w-full max-w-sm px-4">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mb-4 leading-relaxed">
            {lang === 'en' ? 'An IRL party game companion for 4-15+ players. Play face-to-face.' : 'Asisten main Werewolf asli untuk 4-15+ orang. Main langsung tatap muka.'}
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="font-medium text-slate-500">
            {lang === 'en' ? 'Created by' : 'Dibuat oleh'} <a href="https://instagram.com/yzdddddddd_" target="_blank" rel="noopener noreferrer" className="font-bold text-moon-300 hover:text-white transition-colors">@yzdddddddd_</a>
            <br />
            <span className="text-[11px] md:text-xs opacity-80">
              {lang === 'en' ? 'supported by' : 'didukung oleh'} <a href="https://instagram.com/awalstarjoo._" target="_blank" rel="noopener noreferrer" className="font-bold text-moon-300/80 hover:text-white transition-colors">@awalstarjoo._</a>, <a href="https://instagram.com/enruhfzrmd" target="_blank" rel="noopener noreferrer" className="font-bold text-moon-300/80 hover:text-white transition-colors">@enruhfzrmd</a>
            </span>
          </motion.p>
        </div>
      </div>
    </main>
  );
}
