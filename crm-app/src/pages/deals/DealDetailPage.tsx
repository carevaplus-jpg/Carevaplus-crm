import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, User, CalendarClock, Pencil, Trash2, Trophy, XCircle, FileText, KanbanSquare } from 'lucide-react';
import { useStore } from '@/store';
import { useCompany, useContact, useDeal, useOrgId, useQuotes, useStages } from '@/store/selectors';
import { fullName, money, fmtDate } from '@/lib/format';
import { Badge, Button, Card, EmptyState, IconButton, Menu, Tabs, PageShell, confirm, cn } from '@/ui';
import { AvatarOf, ActivityTimeline } from '@/components/record/ActivityTimeline';
import { RecordTasks } from '@/components/record/RecordTasks';
import { DealFormDrawer } from './DealFormDrawer';
import { uid, nowIso } from '@/lib/id';

export function DealDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const deal = useDeal(id);
  const company = useCompany(deal?.companyId);
  const contact = useContact(deal?.contactId);
  const stages = useStages(deal?.pipelineId);
  const quotes = useQuotes().filter((q) => q.dealId === id);
  const remove = useStore((s) => s.remove);
  const upsert = useStore((s) => s.upsert);
  const notify = useStore((s) => s.notify);
  const orgId = useOrgId();
  const [tab, setTab] = useState<'activity' | 'tasks' | 'quotes'>('activity');
  const [editOpen, setEditOpen] = useState(false);

  if (!deal) {
    return (
      <PageShell>
        <EmptyState icon={KanbanSquare} title="Deal not found" action={<Button onClick={() => navigate('/deals')}>Back to deals</Button>} />
      </PageShell>
    );
  }

  const currentStage = stages.find((s) => s.id === deal.stageId);
  const openStages = stages.filter((s) => !s.isWon && !s.isLost);

  const moveStage = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return;
    upsert('deals', { ...deal, stageId, status: stage.isWon ? 'won' : stage.isLost ? 'lost' : 'open', closedAt: stage.isWon || stage.isLost ? nowIso() : undefined, updatedAt: nowIso() });
    upsert('activities', { id: uid('act_'), orgId, type: 'stage_change', body: `Moved to ${stage.name}`, dealId: deal.id, contactId: deal.contactId, companyId: deal.companyId, at: nowIso() });
  };

  const markWon = () => {
    const won = stages.find((s) => s.isWon);
    if (won) {
      moveStage(won.id);
      notify({ kind: 'success', title: '🎉 Deal won!', subtitle: money(deal.amount, deal.currency) });
    }
  };
  const markLost = () => {
    const lost = stages.find((s) => s.isLost);
    if (lost) {
      moveStage(lost.id);
      notify({ kind: 'warning', title: 'Deal marked lost' });
    }
  };

  const del = async () => {
    const ok = await confirm({ title: 'Delete deal?', body: `${deal.name} will be permanently removed.`, danger: true, confirmLabel: 'Delete' });
    if (ok) {
      remove('deals', deal.id);
      notify({ kind: 'success', title: 'Deal deleted' });
      navigate('/deals');
    }
  };

  return (
    <PageShell>
      <button onClick={() => navigate('/deals')} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 mb-4">
        <ArrowLeft className="size-4" /> Deals
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-[320px] shrink-0 space-y-4">
          <Card>
            <div className="flex items-start justify-between">
              <p className="font-display text-2xl font-bold text-ink-900 tabular-nums">{money(deal.amount, deal.currency)}</p>
              <Menu
                trigger={<IconButton icon={<Pencil className="size-4" />} label="Options" />}
                items={[
                  { label: 'Edit deal', icon: <Pencil className="size-4" />, onClick: () => setEditOpen(true) },
                  { label: 'Delete deal', icon: <Trash2 className="size-4" />, onClick: del, danger: true },
                ]}
              />
            </div>
            <h1 className="font-display font-semibold text-ink-900 mt-1 leading-snug">{deal.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              {deal.status === 'won' && <Badge tone="success">Won</Badge>}
              {deal.status === 'lost' && <Badge tone="danger">Lost</Badge>}
              {deal.status === 'open' && currentStage && <Badge tone="brand">{currentStage.name}</Badge>}
            </div>

            {deal.status === 'open' && (
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="primary" icon={<Trophy className="size-3.5" />} onClick={markWon} className="flex-1">Won</Button>
                <Button size="sm" variant="danger" icon={<XCircle className="size-3.5" />} onClick={markLost} className="flex-1">Lost</Button>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-surface-200 space-y-2.5 text-sm">
              {company && (
                <button onClick={() => navigate(`/companies/${company.id}`)} className="flex items-center gap-2 text-brand-600 hover:underline">
                  <Building2 className="size-3.5" />
                  {company.name}
                </button>
              )}
              {contact && (
                <button onClick={() => navigate(`/contacts/${contact.id}`)} className="flex items-center gap-2 text-brand-600 hover:underline">
                  <User className="size-3.5" />
                  {fullName(contact)}
                </button>
              )}
              {deal.expectedCloseDate && (
                <div className="flex items-center gap-2 text-ink-600">
                  <CalendarClock className="size-3.5 text-ink-400" />
                  Expected {fmtDate(deal.expectedCloseDate)}
                </div>
              )}
            </div>

            <p className="text-xs font-semibold text-ink-500 mt-4 mb-1">Owner</p>
            <AvatarOf id={deal.ownerId} size={28} />
          </Card>

          {deal.status === 'open' && (
            <Card>
              <p className="text-xs font-semibold text-ink-500 mb-2.5">Pipeline stage</p>
              <div className="space-y-1">
                {openStages.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => moveStage(s.id)}
                    className={cn('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition-colors', s.id === deal.stageId ? 'bg-navy-900 text-white font-medium' : 'text-ink-600 hover:bg-surface-100')}
                  >
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.id === deal.stageId ? '#fff' : s.color }} />
                    {s.name}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <Tabs value={tab} onChange={setTab} options={[{ value: 'activity', label: 'Activity' }, { value: 'tasks', label: 'Tasks' }, { value: 'quotes', label: 'Quotes' }]} counts={{ quotes: quotes.length }} />
          <div className="mt-5">
            {tab === 'activity' && <ActivityTimeline dealId={deal.id} />}
            {tab === 'tasks' && <RecordTasks dealId={deal.id} />}
            {tab === 'quotes' && (
              <div className="space-y-2">
                {quotes.length === 0 ? (
                  <EmptyState icon={FileText} title="No quotes yet" action={<Button size="sm" onClick={() => navigate('/quotes')}>Create a quote</Button>} />
                ) : (
                  quotes.map((q) => (
                    <button key={q.id} onClick={() => navigate(`/quotes/${q.id}`)} className="w-full text-left flex items-center justify-between p-3.5 rounded-xl ring-1 ring-surface-200 bg-white hover:ring-brand-300">
                      <span className="font-medium text-ink-900 text-sm">{q.number}</span>
                      <Badge tone="neutral">{q.status}</Badge>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <DealFormDrawer open={editOpen} onClose={() => setEditOpen(false)} deal={deal} />
    </PageShell>
  );
}
