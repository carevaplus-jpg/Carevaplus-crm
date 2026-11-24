import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Receipt } from 'lucide-react';
import { useCompany, useContact, useInvoices } from '@/store/selectors';
import type { Invoice } from '@/types';
import { fullName, fmtDate, money, daysUntil } from '@/lib/format';
import { lineItemsTotal } from '@/store/selectors';
import { INVOICE_STATUS } from '@/lib/status';
import { Badge, Button, DataTable, EmptyState, PageHeader, PageShell, type Column, cn } from '@/ui';
import { InvoiceFormDrawer } from './InvoiceFormDrawer';

function RowCompany({ invoice }: { invoice: Invoice }) {
  const company = useCompany(invoice.companyId);
  const contact = useContact(invoice.contactId);
  return <span className="text-ink-700">{company?.name ?? (contact ? fullName(contact) : '—')}</span>;
}

export function InvoicesPage() {
  const invoices = useInvoices();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);

  const { totalOutstanding, totalOverdue } = useMemo(() => {
    let out = 0;
    let overdue = 0;
    for (const inv of invoices) {
      if (inv.status === 'paid' || inv.status === 'void') continue;
      const t = lineItemsTotal(inv.items, inv.taxPct).total;
      out += t;
      if (daysUntil(inv.dueDate) < 0) overdue += t;
    }
    return { totalOutstanding: out, totalOverdue: overdue };
  }, [invoices]);

  const columns: Column<Invoice>[] = [
    { key: 'number', header: 'Invoice', sortValue: (i) => i.number, render: (i) => <span className="font-medium text-ink-900">{i.number}</span> },
    { key: 'company', header: 'Billed to', render: (i) => <RowCompany invoice={i} /> },
    { key: 'total', header: 'Amount', align: 'right', sortValue: (i) => lineItemsTotal(i.items, i.taxPct).total, render: (i) => <span className="font-medium text-ink-800 tabular-nums">{money(lineItemsTotal(i.items, i.taxPct).total)}</span> },
    {
      key: 'due',
      header: 'Due',
      sortValue: (i) => i.dueDate,
      render: (i) => {
        const d = daysUntil(i.dueDate);
        return <span className={cn('text-sm', d < 0 && i.status !== 'paid' ? 'text-danger-500 font-medium' : 'text-ink-500')}>{fmtDate(i.dueDate)}</span>;
      },
    },
    { key: 'status', header: 'Status', sortValue: (i) => i.status, render: (i) => <Badge tone={INVOICE_STATUS[i.status].tone}>{INVOICE_STATUS[i.status].label}</Badge> },
  ];

  return (
    <PageShell>
      <PageHeader title="Invoices" subtitle={`${money(totalOutstanding)} outstanding · ${money(totalOverdue)} overdue`} action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>New invoice</Button>} />
      <div className="bg-surface-0 rounded-xl ring-1 ring-surface-200 shadow-card">
        {invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices yet" body="Convert an accepted quote, or create one manually." action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>New invoice</Button>} />
        ) : (
          <DataTable columns={columns} rows={invoices} rowKey={(i) => i.id} onRowClick={(i) => navigate(`/invoices/${i.id}`)} />
        )}
      </div>
      <InvoiceFormDrawer open={formOpen} onClose={() => setFormOpen(false)} />
    </PageShell>
  );
}
