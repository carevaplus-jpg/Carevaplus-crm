import type { Deal, PipelineStage, Task } from '@/types';

export function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function lastNMonths(n: number): { key: string; label: string; date: Date }[] {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: MONTH_LABELS[d.getMonth()], date: d });
  }
  return out;
}

export function revenueTrend(deals: Deal[], months = 6) {
  const span = lastNMonths(months);
  return span.map(({ key, label }) => {
    const won = deals.filter((d) => d.status === 'won' && d.closedAt && monthKey(d.closedAt) === key).reduce((s, d) => s + d.amount, 0);
    const lost = deals.filter((d) => d.status === 'lost' && d.closedAt && monthKey(d.closedAt) === key).reduce((s, d) => s + d.amount, 0);
    return { month: label, won, lost };
  });
}

export function pipelineByStage(deals: Deal[], stages: PipelineStage[]) {
  const open = stages.filter((s) => !s.isWon && !s.isLost).sort((a, b) => a.order - b.order);
  return open.map((s) => ({
    stage: s.name,
    color: s.color,
    value: deals.filter((d) => d.stageId === s.id && d.status === 'open').reduce((sum, d) => sum + d.amount, 0),
    count: deals.filter((d) => d.stageId === s.id && d.status === 'open').length,
  }));
}

export function winRate(deals: Deal[]): number {
  const won = deals.filter((d) => d.status === 'won').length;
  const lost = deals.filter((d) => d.status === 'lost').length;
  const total = won + lost;
  return total === 0 ? 0 : won / total;
}

export function isOverdue(t: Task, now = new Date()): boolean {
  return !t.done && new Date(t.dueAt) < now;
}
export function isDueToday(t: Task, now = new Date()): boolean {
  const d = new Date(t.dueAt);
  return !t.done && d.toDateString() === now.toDateString();
}
