import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Building2, KanbanSquare, ArrowRight } from 'lucide-react';
import { useCompanies, useContacts, useDeals } from '@/store/selectors';
import { fullName, money } from '@/lib/format';
import { Avatar } from '@/ui';

interface Hit {
  id: string;
  kind: 'contact' | 'company' | 'deal';
  title: string;
  subtitle: string;
  to: string;
  avatarHue?: number;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const contacts = useContacts();
  const companies = useCompanies();
  const deals = useDeals();

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) {
      return [
        ...deals.slice(0, 3).map((d) => ({ id: d.id, kind: 'deal' as const, title: d.name, subtitle: money(d.amount, d.currency), to: `/deals/${d.id}` })),
        ...contacts.slice(0, 4).map((c) => ({ id: c.id, kind: 'contact' as const, title: fullName(c), subtitle: c.title ?? c.email ?? '', to: `/contacts/${c.id}`, avatarHue: c.avatarHue })),
      ];
    }
    const out: Hit[] = [];
    for (const c of contacts) {
      if (`${fullName(c)} ${c.email ?? ''} ${c.title ?? ''}`.toLowerCase().includes(needle)) {
        out.push({ id: c.id, kind: 'contact', title: fullName(c), subtitle: c.title ?? c.email ?? '', to: `/contacts/${c.id}`, avatarHue: c.avatarHue });
      }
    }
    for (const co of companies) {
      if (`${co.name} ${co.industry ?? ''}`.toLowerCase().includes(needle)) {
        out.push({ id: co.id, kind: 'company', title: co.name, subtitle: [co.industry, co.city].filter(Boolean).join(' · '), to: `/companies/${co.id}` });
      }
    }
    for (const d of deals) {
      if (d.name.toLowerCase().includes(needle)) {
        out.push({ id: d.id, kind: 'deal', title: d.name, subtitle: money(d.amount, d.currency), to: `/deals/${d.id}` });
      }
    }
    return out.slice(0, 20);
  }, [q, contacts, companies, deals]);

  useEffect(() => setActive(0), [hits.length]);

  const go = (hit?: Hit) => {
    const h = hit ?? hits[active];
    if (!h) return;
    navigate(h.to);
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-[3px] animate-[fadeIn_.15s_ease-out]" onClick={onClose} />
      <div
        className="glass-panel glass-sheen relative w-full max-w-lg rounded-2xl overflow-hidden animate-[pop_.2s_var(--ease-spring)]"
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(hits.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            go();
          } else if (e.key === 'Escape') {
            onClose();
          }
        }}
      >
        <div className="flex items-center gap-2.5 px-4 h-13 border-b border-white/50" style={{ height: 52 }}>
          <Search className="size-4 text-ink-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search contacts, companies, deals…"
            className="flex-1 outline-none text-sm placeholder:text-ink-400 bg-transparent"
          />
          <kbd className="text-[10px] text-ink-400 bg-surface-100 rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-1.5">
          {hits.length === 0 && <p className="text-sm text-ink-400 text-center py-8">No matches.</p>}
          {hits.map((h, i) => (
            <button
              key={`${h.kind}-${h.id}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(h)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === active ? 'bg-brand-50/80' : ''}`}
            >
              {h.kind === 'contact' ? (
                <Avatar name={h.title} hue={h.avatarHue} size={28} />
              ) : (
                <div className="h-7 w-7 rounded-lg bg-surface-100 flex items-center justify-center text-ink-500">
                  {h.kind === 'company' ? <Building2 className="size-3.5" /> : <KanbanSquare className="size-3.5" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-900 truncate">{h.title}</p>
                {h.subtitle && <p className="text-xs text-ink-500 truncate">{h.subtitle}</p>}
              </div>
              {i === active && <ArrowRight className="size-3.5 text-brand-400" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 px-4 py-2 border-t border-white/50 text-[11px] text-ink-400 bg-white/30">
          <span className="flex items-center gap-1"><Users className="size-3" /> {contacts.length} contacts</span>
          <span className="flex items-center gap-1"><Building2 className="size-3" /> {companies.length} companies</span>
          <span className="flex items-center gap-1"><KanbanSquare className="size-3" /> {deals.length} deals</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
