import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { buildDemoSeed, DEMO_ORG_ID } from '@/lib/demo-seed';
import { nowIso, uid } from '@/lib/id';
import { cloudEnabled } from '@/lib/supabase';
import type { Collections, CollectionName } from '@/types';
import { COLLECTIONS } from '@/types';

type Base = { id: string; createdAt?: string; updatedAt?: string };

const emptyCollections = (): Collections =>
  Object.fromEntries(COLLECTIONS.map((c) => [c, {}])) as unknown as Collections;

export interface Toast {
  id: string;
  kind: 'success' | 'info' | 'warning' | 'danger';
  title: string;
  subtitle?: string;
}

export interface StoreState {
  hydrated: boolean;
  orgId: string;
  /** In demo mode there's no password auth — pick which seeded teammate you are. Cloud mode uses real Supabase auth instead. */
  currentProfileId: string | null;
  data: Collections;
  toasts: Toast[];

  setCurrentProfile: (id: string) => void;
  upsert: <K extends CollectionName>(col: K, rec: Collections[K][string]) => void;
  remove: (col: CollectionName, id: string) => void;
  notify: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  resetDemoData: () => void;
}

function withTimestamps<T extends Base>(rec: T): T {
  const existingCreatedAt = rec.createdAt;
  return { ...rec, createdAt: existingCreatedAt ?? nowIso(), updatedAt: nowIso() };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      orgId: DEMO_ORG_ID,
      currentProfileId: null,
      data: emptyCollections(),
      toasts: [],

      setCurrentProfile: (id) => set({ currentProfileId: id }),

      upsert: (col, rec) =>
        set((s) => ({
          data: { ...s.data, [col]: { ...s.data[col], [rec.id]: withTimestamps(rec as Base) as never } },
        })),

      remove: (col, id) =>
        set((s) => {
          const next = { ...s.data[col] };
          delete next[id];
          return { data: { ...s.data, [col]: next } };
        }),

      notify: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: uid('toast_') }].slice(-4) })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      resetDemoData: () => {
        const seed = buildDemoSeed();
        set({ data: seed.collections, currentProfileId: get().currentProfileId ?? seed.teamProfiles[0].id });
      },
    }),
    {
      name: 'careva-crm-store-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ orgId: s.orgId, currentProfileId: s.currentProfileId, data: s.data }),
    },
  ),
);

// Finish hydration *after* `useStore` itself has finished being assigned (the
// persist middleware can rehydrate synchronously from localStorage, which
// would otherwise run this callback while `useStore` is still in its
// temporal dead zone). First run — or an empty persisted store — gets the
// demo dataset so the app is immediately useful. `cloudEnabled` governs
// whether Settings offers switching to a real multi-user Supabase account.
function finishHydration(state: StoreState | undefined) {
  const hasData = state && Object.values(state.data.companies).length > 0;
  if (!hasData) {
    const seed = buildDemoSeed();
    useStore.setState({ data: seed.collections, currentProfileId: seed.teamProfiles[0].id, hydrated: true });
  } else {
    useStore.setState({ hydrated: true });
  }
  void cloudEnabled;
}

if (useStore.persist.hasHydrated()) {
  finishHydration(useStore.getState());
} else {
  useStore.persist.onFinishHydration(finishHydration);
}
