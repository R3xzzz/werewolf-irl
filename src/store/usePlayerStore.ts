import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface PlayerState {
  playerId: string | null;
  roomCode: string | null;
  playerName: string | null;
  setPlayer: (id: string, code: string, name: string) => void;
  clearPlayer: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      playerId: null,
      roomCode: null,
      playerName: null,
      setPlayer: (id, code, name) => set({ playerId: id, roomCode: code, playerName: name }),
      clearPlayer: () => set({ playerId: null, roomCode: null, playerName: null }),
    }),
    {
      name: 'werewolf-player-storage',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage so different tabs have different identities for testing
    }
  )
);
