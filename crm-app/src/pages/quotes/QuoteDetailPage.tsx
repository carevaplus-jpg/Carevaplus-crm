import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, User, Pencil, Trash2, Send, CheckCircle2, XCircle, Receipt } from 'lucide-react';
import { useStore } from '@/store';
import { useCompany, useContact, useOrgId, useQuote } from '@/store/selectors';
import { lineItemsTotal } from '@/store/selectors';
import { fmtDate, fullName, money } from '@/lib/format';
import { QUOTE_STATUS } from '@/lib/status';
import { Badge, Button, Card, EmptyState, PageShell, confirm } from '@/ui';
import { AvatarOf } from '@/components/record/ActivityTimeline';
import { QuoteFormDrawer } from './QuoteFormDrawer';
import { uid, nowIso } from '@/lib/id';
import type { QuoteStatus } from '@/types';

export function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const quote = useQuote(id);
  const company = useCompany(quote?.companyId);
  const contact = useContact(quote?.contactId);
  const upsert = useStore((s) => s.upsert);
  const remove = useStore((s) => s.remove);
  const notify = useStore((s) => s.notify);
  const orgId = useOrgId();
  const [editOpen, setEditOpen] = useState(false);

  if (!quote) {
    return (
      <PageShell>
        <EmptyState icon={Receipt} title="Quote not found" action={<Button onClick={() => navigate('/quotes')}>Back to quotes</Button>} />
      </PageShell>
    );
  }

  const totals = lineItemsTotal(quote.items, quote.taxPct);

  const setStatus = (status: QuoteStatus) => {
    upsert('quotes', { ...quote, status, updatedAt: nowIso() });
    notify({ kind: 'success', title: `Quote marked ${status}` });
  };

  const convertToInvoice = () => {
    const id = uid('inv_');
    const due = new Date();
    due.setDate(due.getDate() + 14);
    upsert('invoices', {
      id,
      orgId,
      number: `INV-${3200 + Math.floor(Math.random() * 800)}`,
      quoteId: quote.id,
      contactId: quote.contactId,
      companyId: quote.companyId,
      status: 'draft',
      items: quote.items,
      taxPct: quote.taxPct,
      dueDate: due.toISOString(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    notify({ kind: 'success', title: 'Invoice created from quote' });
    navigate(`/invoices/${id}`);
  };

  const del = async () => {
    const ok = await confirm({ title: 'Delete quote?', body: `${quote.number} will be permanently removed.`, danger: true, confirmLabel: 'Delete' });
    if (ok) {
      remove('quotes', quote.id);
      notify({ kind: 'success', title: 'Quote deleted' });
      navigate('/quotes');
    }
  };

  return (
    <PageShell>
      <button onClick={() => navigate('/quotes')} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 mb-4">
        <ArrowLeft className="size-4" /> Quotes
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="font-display text-xl font-bold text-ink-900">{quote.number}</h1>
                <Badge tone={QUOTE_STATUS[quote.status].tone} className="mt-1.5">{QUOTE_STATUS[quote.status].label}</Badge>
              </div>
              <div className="text-right text-sm">
                {company && (
                  <p className="font-medium text-ink-900 flex items-center justify-end gap-1.5">
                    <Building2 className="size-3.5 text-ink-400" />
                    {company.name}
                  </p>
                )}
                {contact && (
                  <p className="text-ink-500 flex items-center justify-end gap-1.5 mt-0.5">
                    <User className="size-3.5 text-ink-400" />
                    {fullName(contact)}
                  </p>
                )}
                <p className="text-ink-400 text-xs mt-1">Created {fmtDate(quote.createdAt)}</p>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-500 border-b border-surface-200">
                  <th className="text-left font-semibold pb-2">Item</th>
                  <th className="text-right font-semibold pb-2">Qty</th>
                  <th className="text-right font-semibold pb-2">Price</th>
                  <th className="text-right font-semibold pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => (
                  <tr key={item.id} className="border-b border-surface-100">
                    <td className="py-2.5 text-ink-800">{item.name}</td>
                    <td className="py-2.5 text-right text-ink-600">{item.qty}</td>
                    <td className="py-2.5 text-right text-ink-600 tabular-nums">{money(item.unitPrice)}</td>
                    <td className="py-2.5 text-right font-medium text-ink-900 tabular-nums">{money(item.qty * item.unitPrice * (1 - item.discountPct / 100))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mt-4">
              <div className="w-56 space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-500"><span>Subtotal</span><span className="tabular-nums">{money(totals.subtotal)}</span></div>
                <div className="flex justify-between text-ink-500"><span>Tax ({quote.taxPct}%)</span><span className="tabular-nums">{money(totals.tax)}</span></div>
                <div className="flex justify-between font-bold text-ink-900 pt-1.5 border-t border-surface-200 text-base"><span>Total</span><span className="tabular-nums">{money(totals.total)}</span></div>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:w-[260px] shrink-0 space-y-3">
          <Card>
            <p className="text-xs font-semibold text-ink-500 mb-2">Actions</p>
            <div className="space-y-2">
              {quote.status === 'draft' && <Button size="sm" variant="primary" icon={<Send className="size-3.5" />} className="w-full" onClick={() => setStatus('sent')}>Mark as sent</Button>}
              {quote.status === 'sent' && (
                <>
                  <Button size="sm" variant="primary" icon={<CheckCircle2 className="size-3.5" />} className="w-full" onClick={() => setStatus('accepted')}>Mark accepted</Button>
                  <Button size="sm" variant="danger" icon={<XCircle className="size-3.5" />} className="w-full" onClick={() => setStatus('declined')}>Mark declined</Button>
                </>
              )}
              {quote.status === 'accepted' && <Button size="sm" variant="gold" icon={<Receipt className="size-3.5" />} className="w-full" onClick={convertToInvoice}>Convert to invoice</Button>}
              <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" />} className="w-full" onClick={() => setEditOpen(true)}>Edit quote</Button>
            </div>
          </Card>
          <Card>
            <p className="text-xs font-semibold text-ink-500 mb-2">Owner</p>
            <AvatarOf id={quote.ownerId} size={28} />
            <div className="mt-4 pt-4 border-t border-surface-200">
              <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} className="text-danger-500 w-full" onClick={del}>Delete quote</Button>
            </div>
          </Card>
        </div>
      </div>

      <QuoteFormDrawer open={editOpen} onClose={() => setEditOpen(false)} quote={quote} />
    </PageShell>
  );
}
