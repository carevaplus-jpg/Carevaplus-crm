import { create } from 'zustand';
import { fetchFreeModels } from '../lib/openrouter';
import type { ModelInfo } from '../lib/types';

interface ModelsStore {
  models: ModelInfo[];
  error: string | null;
  loaded: boolean;
  load: (force?: boolean) => Promise<void>;
}

export const useModels = create<ModelsStore>()((set) => ({
  models: [], error: null, loaded: false,
  load: async (force = false) => {
    try { set({ models: await fetchFreeModels({ force }), error: null, loaded: true }); }
    catch (e) { set({ error: (e as Error).message, loaded: true }); }
  },
}));

export const ROUTER = 'openrouter/free';
export const chatModels = (ms: ModelInfo[]) => ms.filter((m) => m.id !== ROUTER);
export const modelById = (id?: string) => useModels.getState().models.find((m) => m.id === id);
export function shortName(id?: string) {
  const m = modelById(id);
  if (m) return m.name.replace(/^[^:]+:\s*/, '');
  return String(id || '').split('/').pop()!.replace(/:free$/, '');
}
export function rankedCandidates(needVision: boolean, limit = 6) {
  const all = useModels.getState().models;
  let list = chatModels(all);
  if (needVision) { const v = list.filter((m) => m.vision); if (v.length) list = v; }
  const out = list.slice(0, limit);
  const router = all.find((m) => m.id === ROUTER);
  if (router) out.push(router);
  return out;
}
export const audioModels = () => chatModels(useModels.getState().models).filter((m) => m.audio);
