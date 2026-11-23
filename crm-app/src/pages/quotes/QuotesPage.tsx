import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';
import { useCompany, useContact, useQuotes } from '@/store/selectors';
import { useUi } from '@/store/ui';
import type { Quote } from '@/types';
import { fullName, fmtDate, money } from '@/lib/format';
import { lineItemsTotal } from '@/store/selectors';
import { QUOTE_STATUS } from '@/lib/status';
import { Badge, Button, DataTable, EmptyState, PageHeader, PageShell, type Column } from '@/ui';
import { QuoteFormDrawer } from './QuoteFormDrawer';

function RowCompany({ quote }: { quote: Quote }) {
  const company = useCompany(quote.companyId);
  const contact = useContact(quote.contactId);
  return <span className="text-ink-700">{company?.name ?? (contact ? fullName(contact) : '—')}</span>;
}

export function QuotesPage() {
  const quotes = useQuotes();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const requestNew = useUi((s) => s.requestNew);
  const setRequestNew = useUi((s) => s.setRequestNew);

  useEffect(() => {
    if (requestNew === 'quote') {
      setFormOpen(true);
      setRequestNew(null);
    }
  }, [requestNew, setRequestNew]);

  const columns: Column<Quote>[] = useMemo(
    () => [
      { key: 'number', header: 'Quote', sortValue: (q) => q.number, render: (q) => <span className="font-medium text-ink-900">{q.number}</span> },
      { key: 'company', header: 'To', render: (q) => <RowCompany quote={q} /> },
      { key: 'total', header: 'Amount', align: 'right', sortValue: (q) => lineItemsTotal(q.items, q.taxPct).total, render: (q) => <span className="font-medium text-ink-800 tabular-nums">{money(lineItemsTotal(q.items, q.taxPct).total)}</span> },
      { key: 'status', header: 'Status', sortValue: (q) => q.status, render: (q) => <Badge tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}</Badge> },
      { key: 'date', header: 'Created', sortValue: (q) => q.createdAt, render: (q) => <span className="text-ink-500 text-sm">{fmtDate(q.createdAt)}</span> },
    ],
    [],
  );

  return (
    <PageShell>
      <PageHeader title="Quotes" subtitle={`${quotes.length} quotes`} action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>New quote</Button>} />
      <div className="bg-surface-0 rounded-xl ring-1 ring-surface-200 shadow-card">
        {quotes.length === 0 ? (
          <EmptyState icon={FileText} title="No quotes yet" action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>New quote</Button>} />
        ) : (
          <DataTable columns={columns} rows={quotes} rowKey={(q) => q.id} onRowClick={(q) => navigate(`/quotes/${q.id}`)} />
        )}
      </div>
      <QuoteFormDrawer open={formOpen} onClose={() => setFormOpen(false)} />
    </PageShell>
  );
}
