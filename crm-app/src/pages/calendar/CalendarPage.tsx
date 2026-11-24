import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useTasks } from '@/store/selectors';
import { TASK_PRIORITY } from '@/lib/status';
import { Badge, Button, Card, PageHeader, PageShell, cn } from '@/ui';
import { TaskFormDrawer } from '@/pages/tasks/TaskFormDrawer';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarPage() {
  const navigate = useNavigate();
  const tasks = useTasks();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(new Date());
  const [formOpen, setFormOpen] = useState(false);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const t of tasks) {
      const key = format(new Date(t.dueAt), 'yyyy-MM-dd');
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return map;
  }, [tasks]);

  const selectedTasks = (tasksByDay.get(format(selected, 'yyyy-MM-dd')) ?? []).slice().sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  return (
    <PageShell>
      <PageHeader title="Calendar" subtitle="Tasks and meetings by day" action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>New task</Button>} />

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
            <h2 className="font-display font-semibold text-ink-900">{format(month, 'MMMM yyyy')}</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setMonth(addMonths(month, -1))} className="h-7 w-7 rounded-md hover:bg-surface-100 flex items-center justify-center text-ink-500"><ChevronLeft className="size-4" /></button>
              <button onClick={() => setMonth(startOfMonth(new Date()))} className="text-xs font-medium text-ink-500 hover:text-ink-800 px-2">Today</button>
              <button onClick={() => setMonth(addMonths(month, 1))} className="h-7 w-7 rounded-md hover:bg-surface-100 flex items-center justify-center text-ink-500"><ChevronRight className="size-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-ink-400 border-b border-surface-200">
            {DOW.map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const key = format(d, 'yyyy-MM-dd');
              const dayTasks = tasksByDay.get(key) ?? [];
              const inMonth = isSameMonth(d, month);
              const sel = isSameDay(d, selected);
              return (
                <button
                  key={key}
                  onClick={() => setSelected(d)}
                  className={cn('min-h-[86px] border-b border-r border-surface-100 p-1.5 text-left align-top flex flex-col gap-1', !inMonth && 'bg-surface-50/60', sel && 'ring-2 ring-inset ring-brand-400')}
                >
                  <span className={cn('h-6 w-6 flex items-center justify-center rounded-full text-xs', isToday(d) ? 'bg-brand-600 text-white font-semibold' : inMonth ? 'text-ink-700' : 'text-ink-300')}>{format(d, 'd')}</span>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div key={t.id} className={cn('text-[10px] px-1 py-0.5 rounded truncate', t.done ? 'bg-surface-100 text-ink-400 line-through' : 'bg-brand-50 text-brand-700')}>{t.title}</div>
                    ))}
                    {dayTasks.length > 2 && <p className="text-[10px] text-ink-400 px-1">+{dayTasks.length - 2} more</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <h3 className="font-display font-semibold text-ink-900 mb-1">{format(selected, 'EEEE, d MMMM')}</h3>
          <p className="text-xs text-ink-500 mb-3">{selectedTasks.length} {selectedTasks.length === 1 ? 'item' : 'items'}</p>
          {selectedTasks.length === 0 ? (
            <p className="text-sm text-ink-400 py-6 text-center">Nothing scheduled.</p>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map((t) => (
                <div key={t.id} onClick={() => t.dealId ? navigate(`/deals/${t.dealId}`) : t.contactId ? navigate(`/contacts/${t.contactId}`) : navigate('/tasks')} className="p-2.5 rounded-lg ring-1 ring-surface-200 cursor-pointer hover:ring-brand-300">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink-900 truncate">{t.title}</p>
                    <Badge tone={TASK_PRIORITY[t.priority].tone}>{TASK_PRIORITY[t.priority].label}</Badge>
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">{format(new Date(t.dueAt), 'h:mm a')}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <TaskFormDrawer open={formOpen} onClose={() => setFormOpen(false)} />
    </PageShell>
  );
}
