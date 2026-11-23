import { useState } from 'react';
import { Plus, CheckSquare } from 'lucide-react';
import { useStore } from '@/store';
import { useCurrentProfile, useOrgId, useTasksFor } from '@/store/selectors';
import { fmtDateShort } from '@/lib/format';
import { uid, nowIso } from '@/lib/id';
import { Button, EmptyState, Input } from '@/ui';
import { cn } from '@/ui';

export function RecordTasks({ contactId, companyId, dealId }: { contactId?: string; companyId?: string; dealId?: string }) {
  const tasks = useTasksFor({ contactId, companyId, dealId });
  const upsert = useStore((s) => s.upsert);
  const profile = useCurrentProfile();
  const orgId = useOrgId();
  const [title, setTitle] = useState('');

  const add = () => {
    if (!title.trim()) return;
    const due = new Date();
    due.setDate(due.getDate() + 3);
    upsert('tasks', {
      id: uid('task_'),
      orgId,
      title: title.trim(),
      type: 'todo',
      priority: 'medium',
      dueAt: due.toISOString(),
      done: false,
      assigneeId: profile?.id,
      contactId,
      companyId,
      dealId,
      createdAt: nowIso(),
    });
    setTitle('');
  };

  const toggle = (id: string, done: boolean) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    upsert('tasks', { ...t, done: !done, doneAt: !done ? nowIso() : undefined });
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Input placeholder="Add a task…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button icon={<Plus className="size-4" />} onClick={add} disabled={!title.trim()}>
          Add
        </Button>
      </div>
      {tasks.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks" body="Add a follow-up task to keep this moving." />
      ) : (
        <div className="space-y-1">
          {tasks.map((t) => (
            <label key={t.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-surface-50 cursor-pointer">
              <input type="checkbox" checked={t.done} onChange={() => toggle(t.id, t.done)} className="size-4 rounded accent-brand-600" />
              <span className={cn('flex-1 text-sm', t.done ? 'line-through text-ink-400' : 'text-ink-800')}>{t.title}</span>
              <span className="text-xs text-ink-400">{fmtDateShort(t.dueAt)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
