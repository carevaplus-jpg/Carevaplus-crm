import { create } from 'zustand';

/** Ephemeral UI state (never persisted or synced). */
export const useUi = create<{ immersive: boolean; setImmersive: (v: boolean) => void }>((set) => ({
  immersive: false,
  setImmersive: (immersive) => set({ immersive }),
}));
