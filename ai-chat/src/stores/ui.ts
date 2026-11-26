import { create } from 'zustand';

export interface Toast { id: number; text: string }
type DialogName = 'settings' | 'welcome' | null;

interface UIStore {
  sidebarOpen: boolean;          // mobile drawer
  searchOpen: boolean;
  search: string;
  artifactKey: string | null;    // open artifact
  artifactTab: 'preview' | 'code';
  artifactFull: boolean;
  artifactAuto: boolean;         // opened automatically while streaming: flip to Preview once the code is complete
  dialog: DialogName;
  toasts: Toast[];
  set: (p: Partial<Omit<UIStore, 'set' | 'toast'>>) => void;
  toast: (text: string, ms?: number) => void;
}

let toastId = 0;
export const useUI = create<UIStore>()((set, get) => ({
  sidebarOpen: false, searchOpen: false, search: '', artifactKey: null, artifactTab: 'preview', artifactFull: false, artifactAuto: false,
  dialog: null, toasts: [],
  set: (p) => set(p),
  toast: (text, ms = 2800) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts.slice(-2), { id, text }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), ms);
  },
}));
export const toast = (text: string, ms?: number) => useUI.getState().toast(text, ms);
