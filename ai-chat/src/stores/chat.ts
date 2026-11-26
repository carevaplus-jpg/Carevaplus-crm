import { create } from 'zustand';
import * as db from '../lib/db';
import type { Attachment, Conversation, Message } from '../lib/types';
import { uid } from '../lib/utils';

interface ChatStore {
  convos: Conversation[];
  currentId: string | null;
  draft: string;
  attachments: Attachment[];
  generating: boolean;
  init: () => Promise<void>;
  current: () => Conversation | null;
  setDraft: (d: string) => void;
  setAttachments: (a: Attachment[]) => void;
  open: (id: string | null) => void;
  ensureCurrent: () => Conversation;
  save: (c: Conversation, touch?: boolean) => Promise<void>;
  patchMessage: (convId: string, msg: Message) => void;
  patchConversation: (c: Conversation) => void;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const byUpdated = (a: Conversation, b: Conversation) => b.updatedAt - a.updatedAt;

export const useChat = create<ChatStore>()((set, get) => ({
  convos: [], currentId: null, draft: '', attachments: [], generating: false,

  init: async () => {
    let convos: Conversation[] = [];
    try { convos = await db.listConversations(); } catch { /* private mode */ }
    for (const c of convos) for (const m of c.messages) if (m.status === 'streaming') { m.status = 'done'; m.stopped = true; }
    const hashId = new URLSearchParams(location.hash.slice(1)).get('c');
    set({ convos, currentId: convos.some((c) => c.id === hashId) ? hashId : null });
  },
  current: () => get().convos.find((c) => c.id === get().currentId) ?? null,
  setDraft: (draft) => set({ draft }),
  setAttachments: (attachments) => set({ attachments }),
  open: (id) => {
    set({ currentId: id });
    history.replaceState(null, '', id ? `#c=${id}` : location.pathname);
  },
  ensureCurrent: () => {
    const cur = get().current();
    if (cur) return cur;
    const c: Conversation = { id: uid(), title: 'New chat', createdAt: Date.now(), updatedAt: Date.now(), starred: false, messages: [] };
    set({ convos: [c, ...get().convos], currentId: c.id });
    history.replaceState(null, '', `#c=${c.id}`);
    return c;
  },
  save: async (c, touch = true) => {
    const next = { ...c, messages: [...c.messages], updatedAt: touch ? Date.now() : c.updatedAt };
    set({ convos: [next, ...get().convos.filter((x) => x.id !== c.id)].sort(byUpdated) });
    try { await db.putConversation(next); } catch { /* storage full */ }
  },
  patchMessage: (convId, msg) => set({
    convos: get().convos.map((c) => (c.id !== convId ? c : { ...c, messages: c.messages.map((m) => (m.id === msg.id ? { ...msg } : m)) })),
  }),
  patchConversation: (conv) => set({ convos: get().convos.map((c) => (c.id === conv.id ? { ...conv, messages: [...conv.messages] } : c)) }),
  remove: async (id) => {
    await db.deleteConversation(id);
    set({ convos: get().convos.filter((c) => c.id !== id) });
    if (get().currentId === id) get().open(null);
  },
  clearAll: async () => { await db.clearConversations(); set({ convos: [] }); get().open(null); },
}));
