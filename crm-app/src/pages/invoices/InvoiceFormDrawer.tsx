import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store';
import { useCompanies, useContacts, useInvoices, useOrgId } from '@/store/selectors';
import type { LineItem } from '@/types';
import { uid, nowIso } from '@/lib/id';
import { Button, Drawer, Input, Select } from '@/ui';
import { LineItemsEditor } from '@/components/billing/LineItemsEditor';

export function InvoiceFormDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const upsert = useStore((s) => s.upsert);
  const notify = useStore((s) => s.notify);
  const orgId = useOrgId();
  const companies = useCompanies();
  const contacts = useContacts();
  const invoices = useInvoices();

  const [companyId, setCompanyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [taxPct, setTaxPct] = useState(18);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!open) return;
    setCompanyId('');
    setContactId('');
    setItems([]);
    setTaxPct(18);
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setDueDate(d.toISOString().slice(0, 10));
  }, [open]);

  const contactsForCompany = useMemo(() => contacts.filter((c) => !companyId || c.companyId === companyId), [contacts, companyId]);

  const save = () => {
    if (items.length === 0 || !dueDate) return;
    const id = uid('inv_');
    upsert('invoices', {
      id,
      orgId,
      number: `INV-${3200 + invoices.length}`,
      companyId: companyId || undefined,
      contactId: contactId || undefined,
      status: 'draft',
      items,
      taxPct,
      dueDate: new Date(dueDate).toISOString(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    notify({ kind: 'success', title: 'Invoice created' });
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New invoice"
      width={640}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={items.length === 0 || !dueDate}>Create invoice</Button>
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
        <Input label="Due date" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <div>
          <p className="text-xs font-medium text-ink-600 mb-1.5">Line items</p>
          <LineItemsEditor items={items} onChange={setItems} taxPct={taxPct} onTaxChange={setTaxPct} />
        </div>
      </div>
    </Drawer>
  );
}
