import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'id';

interface LangState {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
      toggleLang: () => set((state) => ({ lang: state.lang === 'en' ? 'id' : 'en' })),
    }),
    {
      name: 'werewolf-lang-storage',
    }
  )
);
