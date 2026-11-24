import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, User, CheckCircle2, Send, Receipt } from 'lucide-react';
import { useStore } from '@/store';
import { useCompany, useContact, useInvoices } from '@/store/selectors';
import { lineItemsTotal } from '@/store/selectors';
import { fmtDate, fullName, money, daysUntil } from '@/lib/format';
import { INVOICE_STATUS } from '@/lib/status';
import { Badge, Button, Card, EmptyState, PageShell, cn } from '@/ui';
import { nowIso } from '@/lib/id';
import type { InvoiceStatus } from '@/types';

export function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoices = useInvoices();
  const invoice = invoices.find((i) => i.id === id);
  const company = useCompany(invoice?.companyId);
  const contact = useContact(invoice?.contactId);
  const upsert = useStore((s) => s.upsert);
  const notify = useStore((s) => s.notify);

  if (!invoice) {
    return (
      <PageShell>
        <EmptyState icon={Receipt} title="Invoice not found" action={<Button onClick={() => navigate('/invoices')}>Back to invoices</Button>} />
      </PageShell>
    );
  }

  const totals = lineItemsTotal(invoice.items, invoice.taxPct);
  const overdue = daysUntil(invoice.dueDate) < 0 && invoice.status !== 'paid';

  const setStatus = (status: InvoiceStatus) => {
    upsert('invoices', { ...invoice, status, paidAt: status === 'paid' ? nowIso() : invoice.paidAt, updatedAt: nowIso() });
    notify({ kind: 'success', title: `Invoice marked ${status}` });
  };

  return (
    <PageShell>
      <button onClick={() => navigate('/invoices')} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 mb-4">
        <ArrowLeft className="size-4" /> Invoices
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="font-display text-xl font-bold text-ink-900">{invoice.number}</h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge tone={INVOICE_STATUS[invoice.status].tone}>{INVOICE_STATUS[invoice.status].label}</Badge>
                  {overdue && <Badge tone="danger">Overdue</Badge>}
                </div>
              </div>
              <div className="text-right text-sm">
                {company && <p className="font-medium text-ink-900 flex items-center justify-end gap-1.5"><Building2 className="size-3.5 text-ink-400" />{company.name}</p>}
                {contact && <p className="text-ink-500 flex items-center justify-end gap-1.5 mt-0.5"><User className="size-3.5 text-ink-400" />{fullName(contact)}</p>}
                <p className={cn('text-xs mt-1', overdue ? 'text-danger-500 font-medium' : 'text-ink-400')}>Due {fmtDate(invoice.dueDate)}</p>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-500 border-b border-surface-200">
                  <th className="text-left font-semibold pb-2">Item</th>
                  <th className="text-right font-semibold pb-2 pl-3 whitespace-nowrap">Qty</th>
                  <th className="text-right font-semibold pb-2 pl-3 whitespace-nowrap">Price</th>
                  <th className="text-right font-semibold pb-2 pl-3 whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-surface-100">
                    <td className="py-2.5 text-ink-800">{item.name}</td>
                    <td className="py-2.5 pl-3 whitespace-nowrap text-right text-ink-600">{item.qty}</td>
                    <td className="py-2.5 pl-3 whitespace-nowrap text-right text-ink-600 tabular-nums">{money(item.unitPrice)}</td>
                    <td className="py-2.5 pl-3 whitespace-nowrap text-right font-medium text-ink-900 tabular-nums">{money(item.qty * item.unitPrice * (1 - item.discountPct / 100))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mt-4">
              <div className="w-56 space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-500"><span>Subtotal</span><span className="tabular-nums">{money(totals.subtotal)}</span></div>
                <div className="flex justify-between text-ink-500"><span>Tax ({invoice.taxPct}%)</span><span className="tabular-nums">{money(totals.tax)}</span></div>
                <div className="flex justify-between font-bold text-ink-900 pt-1.5 border-t border-surface-200 text-base"><span>Total due</span><span className="tabular-nums">{money(totals.total)}</span></div>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:w-[260px] shrink-0">
          <Card>
            <p className="text-xs font-semibold text-ink-500 mb-2">Actions</p>
            <div className="space-y-2">
              {invoice.status === 'draft' && <Button size="sm" variant="primary" icon={<Send className="size-3.5" />} className="w-full" onClick={() => setStatus('sent')}>Mark as sent</Button>}
              {invoice.status !== 'paid' && invoice.status !== 'void' && <Button size="sm" variant="gold" icon={<CheckCircle2 className="size-3.5" />} className="w-full" onClick={() => setStatus('paid')}>Mark as paid</Button>}
              {invoice.status === 'paid' && <p className="text-xs text-success-600 font-medium">✓ Paid{invoice.paidAt ? ` on ${fmtDate(invoice.paidAt)}` : ''}</p>}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
