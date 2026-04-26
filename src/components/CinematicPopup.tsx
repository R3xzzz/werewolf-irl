import { motion, AnimatePresence } from 'framer-motion';
import { GamePopupEvent } from '../hooks/useGameBroadcast';
import { useLangStore } from '../store/useLangStore';
import { useEffect } from 'react';

interface CinematicPopupProps {
  popup: GamePopupEvent | null;
  onClose: () => void;
}

export function CinematicPopup({ popup, onClose }: CinematicPopupProps) {
  const { lang } = useLangStore();

  useEffect(() => {
    if (popup) {
      const duration = popup.durationMs || 5000;
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [popup, onClose]);

  if (!popup) return null;

  const title = lang === 'en' ? popup.title_en : popup.title_id;
  const desc = lang === 'en' ? popup.desc_en : popup.desc_id;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className="relative w-full max-w-sm bg-forest-950 border border-white/20 rounded-2xl shadow-2xl p-6 text-center overflow-hidden"
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={onClose} // Allow clicking the modal itself to close it
        >
          {/* Animated decorative line */}
          <motion.div 
            className="absolute top-0 left-0 h-1 bg-moon-400"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: (popup.durationMs || 5000) / 1000, ease: "linear" }}
          />

          {popup.icon && (
            <div className="text-5xl mb-4 mt-2">
              {popup.icon}
            </div>
          )}

          <h2 className={`font-serif text-white mb-2 ${title.length > 20 ? 'text-2xl' : 'text-3xl'}`}>
            {title}
          </h2>

          {desc && (
            <p className="text-slate-300 text-lg leading-relaxed border-t border-white/10 pt-4 mt-4">
              {desc}
            </p>
          )}

          {popup.visibility === 'private' && (
            <div className="mt-6 inline-block bg-white/10 px-3 py-1 rounded-full text-xs tracking-widest text-moon-200 uppercase">
              {lang === 'en' ? 'Private Information' : 'Informasi Rahasia'}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
