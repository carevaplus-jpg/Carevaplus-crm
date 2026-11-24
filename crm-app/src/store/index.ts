import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { nowIso, uid } from '@/lib/id';
import { createWorkspace, emptyCollections, type WorkspaceInput } from '@/lib/workspace';
import type { Collections, CollectionName } from '@/types';

type Base = { id: string; createdAt?: string; updatedAt?: string };

export interface Toast {
  id: string;
  kind: 'success' | 'info' | 'warning' | 'danger';
  title: string;
  subtitle?: string;
}

export interface StoreState {
  hydrated: boolean;
  orgId: string;
  orgName: string;
  /** The workspace owner on this device; null until first-run setup is done. */
  currentProfileId: string | null;
  data: Collections;
  toasts: Toast[];

  setupWorkspace: (input: WorkspaceInput) => void;
  renameWorkspace: (name: string) => void;
  upsert: <K extends CollectionName>(col: K, rec: Collections[K][string]) => void;
  remove: (col: CollectionName, id: string) => void;
  notify: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  eraseAllData: () => void;
  restoreBackup: (b: { orgId: string; orgName: string; currentProfileId: string | null; data: Collections }) => void;
}

function withTimestamps<T extends Base>(rec: T): T {
  const existingCreatedAt = rec.createdAt;
  return { ...rec, createdAt: existingCreatedAt ?? nowIso(), updatedAt: nowIso() };
}

// The pre-release builds stored a seeded demo dataset under this key; drop it so
// an updated install starts clean instead of carrying sample records forward.
try {
  localStorage.removeItem('careva-crm-store-v1');
} catch {
  // storage unavailable — nothing to clean up
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      hydrated: false,
      orgId: '',
      orgName: '',
      currentProfileId: null,
      data: emptyCollections(),
      toasts: [],

      setupWorkspace: (input) => {
        const ws = createWorkspace(input);
        set({ orgId: ws.orgId, orgName: ws.orgName, currentProfileId: ws.ownerId, data: ws.data });
      },

      renameWorkspace: (orgName) => set({ orgName }),

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

      eraseAllData: () => set({ orgId: '', orgName: '', currentProfileId: null, data: emptyCollections() }),

      restoreBackup: (b) => {
        const profiles = Object.values(b.data.profiles);
        const owner = (b.currentProfileId && b.data.profiles[b.currentProfileId]) || profiles.find((p) => p.role === 'admin') || profiles[0];
        set({ orgId: b.orgId, orgName: b.orgName, currentProfileId: owner?.id ?? null, data: b.data });
      },
    }),
    {
      name: 'careva-crm-workspace-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ orgId: s.orgId, orgName: s.orgName, currentProfileId: s.currentProfileId, data: s.data }),
      // Collections added in later versions arrive empty instead of undefined.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StoreState>;
        return { ...current, ...p, data: { ...emptyCollections(), ...(p.data ?? {}) } };
      },
    },
  ),
);

// Mark hydrated *after* `useStore` itself has been assigned (persist can rehydrate
// synchronously from localStorage, which would otherwise run while `useStore` is
// still in its temporal dead zone).
if (useStore.persist.hasHydrated()) {
  useStore.setState({ hydrated: true });
} else {
  useStore.persist.onFinishHydration(() => useStore.setState({ hydrated: true }));
}
