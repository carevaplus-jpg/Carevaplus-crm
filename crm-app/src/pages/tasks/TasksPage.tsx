import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckSquare, Phone, Mail, Users as UsersIcon, ListTodo, ArrowRightLeft } from 'lucide-react';
import { useStore } from '@/store';
import { useCompany, useContact, useCurrentProfile, useDeal, useTasks } from '@/store/selectors';
import { useUi } from '@/store/ui';
import type { Task } from '@/types';
import { fmtDateTime, timeAgo } from '@/lib/format';
import { isDueToday, isOverdue } from '@/lib/stats';
import { TASK_PRIORITY } from '@/lib/status';
import { AvatarOf } from '@/components/record/ActivityTimeline';
import { Badge, Button, EmptyState, PageHeader, PageShell, Tabs, cn } from '@/ui';
import { TaskFormDrawer } from './TaskFormDrawer';

const ICONS = { call: Phone, email: Mail, meeting: UsersIcon, follow_up: ArrowRightLeft, todo: ListTodo };

function TaskRow({ task }: { task: Task }) {
  const upsert = useStore((s) => s.upsert);
  const navigate = useNavigate();
  const contact = useContact(task.contactId);
  const company = useCompany(task.companyId);
  const deal = useDeal(task.dealId);
  const Icon = ICONS[task.type];
  const overdue = isOverdue(task);

  const toggle = () => upsert('tasks', { ...task, done: !task.done, doneAt: !task.done ? new Date().toISOString() : undefined });

  return (
    <div className="flex items-start gap-3 py-3 px-1 border-b border-surface-100 last:border-0">
      <button onClick={toggle} className="mt-0.5">
        <input type="checkbox" checked={task.done} readOnly className="size-4 rounded accent-brand-600 cursor-pointer" />
      </button>
      <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', 'bg-surface-100 text-ink-500')}>
        <Icon className="size-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', task.done ? 'line-through text-ink-400' : 'text-ink-900')}>{task.title}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-xs text-ink-500">
          <span className={cn(overdue && 'text-danger-500 font-medium')}>{task.done ? `Done ${timeAgo(task.doneAt ?? task.dueAt)}` : fmtDateTime(task.dueAt)}</span>
          {contact && <button onClick={() => navigate(`/contacts/${contact.id}`)} className="hover:underline text-brand-600">{contact.firstName} {contact.lastName}</button>}
          {company && <span>· {company.name}</span>}
          {deal && <button onClick={() => navigate(`/deals/${deal.id}`)} className="hover:underline text-brand-600">· {deal.name}</button>}
        </div>
      </div>
      <Badge tone={TASK_PRIORITY[task.priority].tone}>{TASK_PRIORITY[task.priority].label}</Badge>
      <AvatarOf id={task.assigneeId} size={26} />
    </div>
  );
}

type Filter = 'mine' | 'all' | 'overdue' | 'today' | 'upcoming' | 'done';

export function TasksPage() {
  const tasks = useTasks();
  const profile = useCurrentProfile();
  const [filter, setFilter] = useState<Filter>('mine');
  const [formOpen, setFormOpen] = useState(false);
  const requestNew = useUi((s) => s.requestNew);
  const setRequestNew = useUi((s) => s.setRequestNew);

  useEffect(() => {
    if (requestNew === 'task') {
      setFormOpen(true);
      setRequestNew(null);
    }
  }, [requestNew, setRequestNew]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (filter === 'mine') list = list.filter((t) => t.assigneeId === profile?.id && !t.done);
    else if (filter === 'overdue') list = list.filter((t) => isOverdue(t));
    else if (filter === 'today') list = list.filter((t) => isDueToday(t));
    else if (filter === 'upcoming') list = list.filter((t) => !t.done && new Date(t.dueAt) > new Date() && !isDueToday(t));
    else if (filter === 'done') list = list.filter((t) => t.done);
    else list = list.filter((t) => !t.done);
    return [...list].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }, [tasks, filter, profile]);

  const counts = useMemo(
    () => ({
      mine: tasks.filter((t) => t.assigneeId === profile?.id && !t.done).length,
      overdue: tasks.filter((t) => isOverdue(t)).length,
      today: tasks.filter((t) => isDueToday(t)).length,
    }),
    [tasks, profile],
  );

  return (
    <PageShell>
      <PageHeader title="Tasks" subtitle="Calls, follow-ups and to-dos across the team" action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>New task</Button>} />

      <Tabs
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'mine', label: 'My tasks' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'today', label: 'Today' },
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'all', label: 'All open' },
          { value: 'done', label: 'Completed' },
        ]}
        counts={{ mine: counts.mine, overdue: counts.overdue, today: counts.today }}
      />

      <div className="bg-surface-0 rounded-xl ring-1 ring-surface-200 shadow-card mt-4 px-3">
        {filtered.length === 0 ? (
          <EmptyState icon={CheckSquare} title="All clear" body="No tasks match this filter." action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>New task</Button>} />
        ) : (
          filtered.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </div>

      <TaskFormDrawer open={formOpen} onClose={() => setFormOpen(false)} />
    </PageShell>
  );
}
