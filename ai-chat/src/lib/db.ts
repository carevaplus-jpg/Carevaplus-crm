// Conversations live in IndexedDB (room for images); settings use localStorage via zustand.
import type { Conversation } from './types';

const DB_NAME = 'careva-ai';
const STORE = 'conversations';
let dbPromise: Promise<IDBDatabase> | null = null;

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return db().then((d) => new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r ? r.result : undefined);
    t.onerror = () => reject(t.error);
  }));
}

export async function listConversations(): Promise<Conversation[]> {
  const all = ((await tx<Conversation[]>('readonly', (s) => s.getAll())) || []) as Conversation[];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}
export const putConversation = (c: Conversation) => tx('readwrite', (s) => s.put(structuredClone(c)));
export const deleteConversation = (id: string) => tx('readwrite', (s) => s.delete(id));
export const clearConversations = () => tx('readwrite', (s) => s.clear());
