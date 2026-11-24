import { create } from 'zustand';

export type QuickAddKind = 'contact' | 'company' | 'deal' | 'task' | 'quote';

/** Ephemeral, never persisted — cross-page UI signals (quick-add requests, mobile nav). */
export const useUi = create<{
  requestNew: QuickAddKind | null;
  setRequestNew: (k: QuickAddKind | null) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
}>((set) => ({
  requestNew: null,
  setRequestNew: (requestNew) => set({ requestNew }),
  mobileNavOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}));
