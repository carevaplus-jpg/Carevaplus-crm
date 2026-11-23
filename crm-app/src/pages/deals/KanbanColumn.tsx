import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import type { Deal, PipelineStage } from '@/types';
import { money, moneyCompact } from '@/lib/format';
import { DealCard } from './DealCard';
import { cn } from '@/ui';

export function KanbanColumn({ stage, deals, onAdd, onOpen }: { stage: PipelineStage; deals: Deal[]; onAdd: () => void; onOpen: (d: Deal) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="flex flex-col w-[270px] shrink-0 h-full">
      <div className="flex items-center justify-between px-1 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: stage.color }} />
          <h3 className="text-sm font-semibold text-ink-800 truncate">{stage.name}</h3>
          <span className="text-xs text-ink-400">{deals.length}</span>
        </div>
        <button onClick={onAdd} className="h-6 w-6 flex items-center justify-center rounded-md text-ink-400 hover:bg-surface-200 hover:text-ink-700 shrink-0">
          <Plus className="size-3.5" />
        </button>
      </div>
      <p className="text-xs text-ink-500 font-medium px-1 mb-2 tabular-nums" title={money(total)}>{moneyCompact(total)}</p>

      <div ref={setNodeRef} className={cn('flex-1 rounded-xl p-1.5 space-y-2 overflow-y-auto min-h-[120px] transition-colors', isOver ? 'bg-brand-50 ring-2 ring-brand-300' : 'bg-surface-100/70')}>
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} onOpen={() => onOpen(d)} />
        ))}
      </div>
    </div>
  );
}
