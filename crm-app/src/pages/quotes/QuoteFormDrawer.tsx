import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store';
import { useCompanies, useContacts, useDeals, useOrgId, useQuotes, useTeam } from '@/store/selectors';
import type { LineItem, Quote } from '@/types';
import { uid, nowIso } from '@/lib/id';
import { Button, Drawer, Input, Select } from '@/ui';
import { LineItemsEditor } from '@/components/billing/LineItemsEditor';

export function QuoteFormDrawer({ open, onClose, quote }: { open: boolean; onClose: () => void; quote?: Quote }) {
  const upsert = useStore((s) => s.upsert);
  const notify = useStore((s) => s.notify);
  const orgId = useOrgId();
  const companies = useCompanies();
  const contacts = useContacts();
  const deals = useDeals();
  const team = useTeam();
  const quotes = useQuotes();

  const [companyId, setCompanyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [taxPct, setTaxPct] = useState(18);
  const [ownerId, setOwnerId] = useState('');
  const [validUntil, setValidUntil] = useState('');

  useEffect(() => {
    if (!open) return;
    setCompanyId(quote?.companyId ?? '');
    setContactId(quote?.contactId ?? '');
    setDealId(quote?.dealId ?? '');
    setItems(quote?.items ?? []);
    setTaxPct(quote?.taxPct ?? 18);
    setOwnerId(quote?.ownerId ?? team[0]?.id ?? '');
    setValidUntil(quote?.validUntil?.slice(0, 10) ?? '');
  }, [open, quote, team]);

  const contactsForCompany = useMemo(() => contacts.filter((c) => !companyId || c.companyId === companyId), [contacts, companyId]);

  const save = () => {
    if (items.length === 0) return;
    const number = quote?.number ?? `Q-${2700 + quotes.length}`;
    upsert('quotes', {
      id: quote?.id ?? uid('quo_'),
      orgId,
      number,
      companyId: companyId || undefined,
      contactId: contactId || undefined,
      dealId: dealId || undefined,
      status: quote?.status ?? 'draft',
      items,
      taxPct,
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      ownerId: ownerId || undefined,
      createdAt: quote?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });
    notify({ kind: 'success', title: quote ? 'Quote updated' : 'Quote created', subtitle: number });
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={quote ? `Edit ${quote.number}` : 'New quote'}
      width={640}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={items.length === 0}>{quote ? 'Save changes' : 'Create quote'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Company" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setContactId(''); }}>
            <option value="">—</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select label="Contact" value={contactId} onChange={(e) => setContactId(e.target.value)}>
            <option value="">—</option>
            {contactsForCompany.map((c) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Related deal" value={dealId} onChange={(e) => setDealId(e.target.value)}>
            <option value="">—</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
          <Input label="Valid until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
        <Select label="Owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          {team.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>

        <div>
          <p className="text-xs font-medium text-ink-600 mb-1.5">Line items</p>
          <LineItemsEditor items={items} onChange={setItems} taxPct={taxPct} onTaxChange={setTaxPct} />
        </div>
      </div>
    </Drawer>
  );
}
