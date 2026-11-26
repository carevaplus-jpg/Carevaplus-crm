import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Settings } from '../lib/types';

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '', mode: 'auto', model: '', councilSize: 3, temperature: 0.7, instructions: '', userName: '',
  theme: 'system', showThinking: true, style: 'normal', thinking: false, voiceLang: '', voiceEngine: 'auto',
  voiceAutoSend: false, rail: false,
};

interface SettingsStore extends Settings { set: (patch: Partial<Settings>) => void }

// Same localStorage key as v1 of the app, stored flat, so existing users keep their key and preferences.
const KEY = 'careva.settings.v1';
const flatStorage = createJSONStorage<Settings>(() => ({
  getItem: (k) => {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    try { const v = JSON.parse(raw); return JSON.stringify(v.state ? v : { state: v, version: 0 }); } catch { return null; }
  },
  setItem: (k, v) => { try { localStorage.setItem(k, JSON.stringify(JSON.parse(v).state)); } catch { /* quota */ } },
  removeItem: (k) => localStorage.removeItem(k),
}));

export const useSettings = create<SettingsStore>()(persist(
  (set) => ({ ...DEFAULT_SETTINGS, set: (patch) => set(patch) }),
  {
    name: KEY,
    storage: flatStorage,
    partialize: (s) => { const { set: _set, ...rest } = s; return rest as Settings; },
    merge: (persisted, current) => ({ ...current, ...DEFAULT_SETTINGS, ...(persisted as Partial<Settings>) }),
  },
));
