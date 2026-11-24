import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useStore } from '@/store';
import { COLLECTIONS, type BaseRecord, type CollectionName, type Profile } from '@/store/types';

import { streak, totalXp } from './progress';
import { supabase } from './supabase';

interface Row {
  collection: string;
  id: string;
  data: Record<string, unknown>;
  client_updated_at: number;
  deleted: boolean;
  server_updated_at?: string;
}

let running: Promise<void> | null = null;

/**
 * Offline-first, last-write-wins sync.
 * Push: every local record changed since the last push goes to `push_records` (server keeps the newer one).
 * Pull: every row the server changed since our cursor is merged locally if it is newer.
 */
export function syncNow(): Promise<void> {
  if (running) return running;
  running = doSync().finally(() => {
    running = null;
  });
  return running;
}

async function doSync() {
  const store = useStore.getState();
  if (!supabase) return store.setSync({ status: 'offline' });
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return store.setSync({ status: 'offline' });

  store.setSync({ status: 'syncing', error: undefined });
  try {
    const pushStart = Date.now();
    const st = useStore.getState();
    const since = st.sync.lastPushedAt;
    const rows: Row[] = [];
    for (const col of COLLECTIONS) {
      for (const rec of Object.values(st.data[col]) as BaseRecord[]) {
        if (rec.updatedAt > since) {
          rows.push({ collection: col, id: rec.id, data: rec as unknown as Record<string, unknown>, client_updated_at: rec.updatedAt, deleted: !!rec.deleted });
        }
      }
    }
    if (st.profile && st.profile.updatedAt > since) {
      rows.push({ collection: 'profile', id: 'me', data: st.profile as unknown as Record<string, unknown>, client_updated_at: st.profile.updatedAt, deleted: false });
    }
    for (let i = 0; i < rows.length; i += 400) {
      const { error } = await supabase.rpc('push_records', { records: rows.slice(i, i + 400) });
      if (error) throw error;
    }

    // Pull
    let cursor = st.sync.cursor;
    // Re-read a small overlap on the first page: concurrent writes can commit slightly out of
    // timestamp order. Merging is idempotent (last-write-wins), so re-reading is harmless.
    let pullFrom = cursor ? new Date(Date.parse(cursor) - 5000).toISOString() : null;
    for (;;) {
      let q = supabase
        .from('sync_records')
        .select('collection,id,data,client_updated_at,deleted,server_updated_at')
        .order('server_updated_at', { ascending: true })
        .limit(1000);
      if (pullFrom) q = q.gt('server_updated_at', pullFrom);
      const { data, error } = await q;
      if (error) throw error;
      const pulled = (data ?? []) as Row[];
      if (!pulled.length) break;

      const grouped = new Map<CollectionName, BaseRecord[]>();
      for (const r of pulled) {
        if (r.collection === 'profile') {
          const local = useStore.getState().profile;
          if (!local || r.client_updated_at > local.updatedAt) {
            useStore.setState({ profile: { ...(r.data as unknown as Profile), updatedAt: r.client_updated_at } });
          }
          continue;
        }
        if (!(COLLECTIONS as string[]).includes(r.collection)) continue;
        const list = grouped.get(r.collection as CollectionName) ?? [];
        list.push({ ...(r.data as unknown as BaseRecord), id: r.id, updatedAt: r.client_updated_at, deleted: r.deleted });
        grouped.set(r.collection as CollectionName, list);
      }
      grouped.forEach((recs, col) => useStore.getState().mergeRemote(col, recs));
      cursor = pulled[pulled.length - 1].server_updated_at ?? cursor;
      pullFrom = cursor;
      if (pulled.length < 1000) break;
    }

    // Public profile summary (for future leaderboards / parent view)
    const now = useStore.getState();
    if (now.profile) {
      await supabase.from('profiles').upsert({
        id: auth.session.user.id,
        display_name: now.profile.name,
        class_level: now.profile.classLevel,
        xp: totalXp(now.data.days),
        streak: streak(now.data.days),
        updated_at: new Date().toISOString(),
      });
    }

    useStore.getState().setSync({ cursor, lastPushedAt: pushStart, lastSyncedAt: Date.now(), status: 'idle' });
  } catch (e) {
    useStore.getState().setSync({ status: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

/** Mount once at the root: syncs on launch, foreground, sign-in, and a few seconds after edits. */
export function useAutoSync() {
  useEffect(() => {
    if (!supabase) return;
    syncNow();
    const appSub = AppState.addEventListener('change', (s) => s === 'active' && syncNow());
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') syncNow();
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useStore.subscribe((s, prev) => {
      if (s.data === prev.data && s.profile === prev.profile) return;
      clearTimeout(timer);
      timer = setTimeout(syncNow, 4000);
    });
    return () => {
      appSub.remove();
      authSub.subscription.unsubscribe();
      unsub();
      clearTimeout(timer);
    };
  }, []);
}
