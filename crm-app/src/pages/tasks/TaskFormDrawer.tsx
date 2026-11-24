import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { useContacts, useDeals, useOrgId, useTeam } from '@/store/selectors';
import type { Task, TaskPriority, TaskType } from '@/types';
import { uid, nowIso } from '@/lib/id';
import { Button, Drawer, Input, Select, Textarea } from '@/ui';

const TYPES: { value: TaskType; label: string }[] = [
  { value: 'todo', label: 'To-do' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'follow_up', label: 'Follow-up' },
];

export function TaskFormDrawer({ open, onClose, task }: { open: boolean; onClose: () => void; task?: Task }) {
  const upsert = useStore((s) => s.upsert);
  const notify = useStore((s) => s.notify);
  const orgId = useOrgId();
  const team = useTeam();
  const contacts = useContacts();
  const deals = useDeals();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueAt, setDueAt] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setType(task?.type ?? 'todo');
    setPriority(task?.priority ?? 'medium');
    setDueAt(task ? task.dueAt.slice(0, 16) : new Date(Date.now() + 3600000).toISOString().slice(0, 16));
    setAssigneeId(task?.assigneeId ?? team[0]?.id ?? '');
    setContactId(task?.contactId ?? '');
    setDealId(task?.dealId ?? '');
    setNotes(task?.notes ?? '');
  }, [open, task, team]);

  const save = () => {
    if (!title.trim() || !dueAt) return;
    const contact = contacts.find((c) => c.id === contactId);
    upsert('tasks', {
      id: task?.id ?? uid('task_'),
      orgId,
      title: title.trim(),
      type,
      priority,
      dueAt: new Date(dueAt).toISOString(),
      done: task?.done ?? false,
      doneAt: task?.doneAt,
      assigneeId: assigneeId || undefined,
      contactId: contactId || undefined,
      companyId: contact?.companyId,
      dealId: dealId || undefined,
      notes: notes.trim() || undefined,
      createdAt: task?.createdAt ?? nowIso(),
    });
    notify({ kind: 'success', title: task ? 'Task updated' : 'Task created', subtitle: title });
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!title.trim() || !dueAt}>{task ? 'Save changes' : 'Create task'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value as TaskType)}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
          <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>
        <Input label="Due" type="datetime-local" required value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        <Select label="Assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
          {team.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
        <Select label="Related contact" value={contactId} onChange={(e) => setContactId(e.target.value)}>
          <option value="">None</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
          ))}
        </Select>
        <Select label="Related deal" value={dealId} onChange={(e) => setDealId(e.target.value)}>
          <option value="">None</option>
          {deals.filter((d) => d.status === 'open').map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Drawer>
  );
}
