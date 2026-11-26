import { useChat } from '../../stores/chat';
import { toast, useUI } from '../../stores/ui';
import { APP_NAME } from '../../lib/openrouter';
import { shortName } from '../../stores/models';
import { download } from '../../lib/utils';
import type { Conversation } from '../../lib/types';
import { ask, confirmDelete } from '../dialogs/askStore';

export async function renameChat(c: Conversation) {
  const t = await ask({ title: 'Rename chat', value: c.title, input: true, ok: 'Save' });
  if (typeof t === 'string' && t.trim()) await useChat.getState().save({ ...c, title: t.trim().slice(0, 120) }, false);
}
export async function toggleStar(c: Conversation) {
  await useChat.getState().save({ ...c, starred: !c.starred }, false);
  toast(c.starred ? 'Removed from Starred' : 'Added to Starred');
}
export async function deleteChat(c: Conversation) {
  if (!(await confirmDelete('Delete chat?', `"${c.title}" will be permanently deleted from this device.`))) return;
  if (useUI.getState().artifactKey && useChat.getState().currentId === c.id) useUI.getState().set({ artifactKey: null });
  await useChat.getState().remove(c.id);
  toast('Chat deleted');
}
export function exportChat(c: Conversation) {
  const md = `# ${c.title}\n\n` + c.messages.map((m) => (m.role === 'user'
    ? `**You:**\n\n${m.content}${(m.files || []).map((f) => `\n\n_(attached: ${f.name})_`).join('')}`
    : `**${APP_NAME}** _(${shortName(m.model)})_:\n\n${m.content}`)).join('\n\n---\n\n');
  download(`${c.title.replace(/[^\w\- ]+/g, '').trim() || 'chat'}.md`, md, 'text/markdown');
}
