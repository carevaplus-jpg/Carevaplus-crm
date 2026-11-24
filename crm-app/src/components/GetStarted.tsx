import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Circle, KanbanSquare, Package, UserPlus, Sparkles } from 'lucide-react';
import { useStore } from '@/store';
import { useUi, type QuickAddKind } from '@/store/ui';
import { Card } from '@/ui';

const STEPS: { label: string; hint: string; icon: typeof UserPlus; route: string; kind?: QuickAddKind; done: (n: Record<string, number>) => boolean }[] = [
  { label: 'Add your first contact', hint: 'Customers, leads and partners', icon: UserPlus, route: '/contacts', kind: 'contact', done: (n) => n.contacts > 0 },
  { label: 'Add a company', hint: 'Group contacts by account', icon: Building2, route: '/companies', kind: 'company', done: (n) => n.companies > 0 },
  { label: 'Create a deal', hint: 'Track it through your pipeline', icon: KanbanSquare, route: '/deals', kind: 'deal', done: (n) => n.deals > 0 },
  { label: 'Add your products', hint: 'Used to build quotes & invoices', icon: Package, route: '/products', done: (n) => n.products > 0 },
];

/** First-run checklist on the dashboard — hides itself once every step is done. */
export function GetStarted() {
  const navigate = useNavigate();
  const setRequestNew = useUi((s) => s.setRequestNew);
  const data = useStore((s) => s.data);
  const n = { contacts: Object.keys(data.contacts).length, companies: Object.keys(data.companies).length, deals: Object.keys(data.deals).length, products: Object.keys(data.products).length };
  const doneCount = STEPS.filter((s) => s.done(n)).length;
  if (doneCount === STEPS.length) return null;

  return (
    <Card glass className="mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display font-semibold text-ink-900 text-[15px] flex items-center gap-2">
            <Sparkles className="size-4 text-gold-600" /> Get started
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">A few quick steps to set up your CRM</p>
        </div>
        <span className="text-xs font-semibold text-brand-700 bg-brand-50 rounded-full px-2.5 py-1 tabular-nums">
          {doneCount}/{STEPS.length}
        </span>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {STEPS.map((s) => {
          const done = s.done(n);
          return (
            <button
              key={s.label}
              disabled={done}
              onClick={() => {
                navigate(s.route);
                if (s.kind) setRequestNew(s.kind);
              }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/60 ring-1 ring-white/70 text-left press-scale enabled:hover:bg-white/90 disabled:opacity-60 transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <s.icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? 'text-ink-500 line-through' : 'text-ink-900'}`}>{s.label}</p>
                <p className="text-xs text-ink-500 truncate">{s.hint}</p>
              </div>
              {done ? <CheckCircle2 className="size-5 text-success-500 shrink-0" /> : <Circle className="size-5 text-ink-300 shrink-0" />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
