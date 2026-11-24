import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useStore } from '@/store';
import { useDeals, useDefaultPipelineId, useStages, useTeam } from '@/store/selectors';
import { useUi } from '@/store/ui';
import type { Deal } from '@/types';
import { money } from '@/lib/format';
import { Button, PageHeader, PageShell } from '@/ui';
import { KanbanColumn } from './KanbanColumn';
import { DealCard } from './DealCard';
import { DealFormDrawer } from './DealFormDrawer';

export function DealsPage() {
  const navigate = useNavigate();
  const pipelineId = useDefaultPipelineId();
  const stages = useStages(pipelineId);
  const deals = useDeals();
  const upsert = useStore((s) => s.upsert);
  const notify = useStore((s) => s.notify);
  const team = useTeam();
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [newStageId, setNewStageId] = useState<string | undefined>();
  const requestNew = useUi((s) => s.requestNew);
  const setRequestNew = useUi((s) => s.setRequestNew);

  useEffect(() => {
    if (requestNew === 'deal') {
      setNewStageId(undefined);
      setFormOpen(true);
      setRequestNew(null);
    }
  }, [requestNew, setRequestNew]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filteredDeals = useMemo(() => (ownerFilter === 'all' ? deals : deals.filter((d) => d.ownerId === ownerFilter)), [deals, ownerFilter]);

  const byStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const s of stages) map.set(s.id, []);
    for (const d of filteredDeals) {
      if (!map.has(d.stageId)) continue;
      map.get(d.stageId)!.push(d);
    }
    for (const list of map.values()) list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return map;
  }, [filteredDeals, stages]);

  const openTotal = filteredDeals.filter((d) => d.status === 'open').reduce((s, d) => s + d.amount, 0);

  const onDragStart = (e: DragStartEvent) => {
    const deal = deals.find((d) => d.id === e.active.id);
    setActiveDeal(deal ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = e;
    if (!over) return;
    const deal = deals.find((d) => d.id === active.id);
    const targetStage = stages.find((s) => s.id === over.id);
    if (!deal || !targetStage || deal.stageId === targetStage.id) return;
    upsert('deals', {
      ...deal,
      stageId: targetStage.id,
      status: targetStage.isWon ? 'won' : targetStage.isLost ? 'lost' : 'open',
      closedAt: targetStage.isWon || targetStage.isLost ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    });
    if (targetStage.isWon) notify({ kind: 'success', title: '🎉 Deal won!', subtitle: `${deal.name} — ${money(deal.amount, deal.currency)}` });
    else if (targetStage.isLost) notify({ kind: 'warning', title: 'Deal marked lost', subtitle: deal.name });
  };

  return (
    <PageShell>
      <PageHeader
        title="Deals"
        subtitle={`${filteredDeals.filter((d) => d.status === 'open').length} open deals · ${money(openTotal)} in pipeline`}
        action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => { setNewStageId(undefined); setFormOpen(true); }}>New deal</Button>}
      />

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setOwnerFilter('all')} className={`h-8 px-3 rounded-full text-xs font-medium ${ownerFilter === 'all' ? 'bg-navy-900 text-white' : 'bg-white ring-1 ring-surface-300 text-ink-600 hover:bg-surface-50'}`}>
          Everyone
        </button>
        {team.map((p) => (
          <button key={p.id} onClick={() => setOwnerFilter(p.id)} className={`h-8 px-3 rounded-full text-xs font-medium ${ownerFilter === p.id ? 'bg-navy-900 text-white' : 'bg-white ring-1 ring-surface-300 text-ink-600 hover:bg-surface-50'}`}>
            {p.name.split(' ')[0]}
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ height: 'calc(100vh - 230px)' }}>
          {stages.map((s) => (
            <KanbanColumn
              key={s.id}
              stage={s}
              deals={byStage.get(s.id) ?? []}
              onAdd={() => { setNewStageId(s.id); setFormOpen(true); }}
              onOpen={(d) => navigate(`/deals/${d.id}`)}
            />
          ))}
        </div>
        <DragOverlay>{activeDeal && <div className="w-[254px]"><DealCard deal={activeDeal} overlay /></div>}</DragOverlay>
      </DndContext>

      <DealFormDrawer open={formOpen} onClose={() => setFormOpen(false)} initialStageId={newStageId} />
    </PageShell>
  );
}
