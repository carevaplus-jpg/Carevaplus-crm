import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Mail, Phone } from 'lucide-react';
import { useCompanies, useContacts } from '@/store/selectors';
import { useUi } from '@/store/ui';
import type { Contact, ContactStatus } from '@/types';
import { fullName } from '@/lib/format';
import { CONTACT_STATUS } from '@/lib/status';
import { Avatar, Badge, Button, DataTable, EmptyState, Input, PageHeader, PageShell, type Column } from '@/ui';
import { AvatarOf } from '@/components/record/ActivityTimeline';
import { ContactFormDrawer } from './ContactFormDrawer';

export function ContactsPage() {
  const contacts = useContacts();
  const companies = useCompanies();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ContactStatus | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const requestNew = useUi((s) => s.requestNew);
  const setRequestNew = useUi((s) => s.setRequestNew);

  useEffect(() => {
    if (requestNew === 'contact') {
      setFormOpen(true);
      setRequestNew(null);
    }
  }, [requestNew, setRequestNew]);

  const companyName = (id?: string) => companies.find((c) => c.id === id)?.name;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return contacts.filter((c) => {
      if (status !== 'all' && c.status !== status) return false;
      if (!needle) return true;
      return `${fullName(c)} ${c.email ?? ''} ${companyName(c.companyId) ?? ''}`.toLowerCase().includes(needle);
    });
  }, [contacts, q, status, companies]);

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (c) => fullName(c),
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={fullName(c)} hue={c.avatarHue} size={32} />
          <div className="min-w-0">
            <p className="font-medium text-ink-900 truncate">{fullName(c)}</p>
            <p className="text-xs text-ink-500 truncate">{c.title}</p>
          </div>
        </div>
      ),
    },
    { key: 'company', header: 'Company', sortValue: (c) => companyName(c.companyId) ?? '', render: (c) => <span className="text-ink-600">{companyName(c.companyId) ?? '—'}</span> },
    {
      key: 'contact',
      header: 'Contact info',
      render: (c) => (
        <div className="text-xs text-ink-500 space-y-0.5">
          {c.email && <div className="flex items-center gap-1.5"><Mail className="size-3" />{c.email}</div>}
          {c.phone && <div className="flex items-center gap-1.5"><Phone className="size-3" />{c.phone}</div>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', sortValue: (c) => c.status, render: (c) => <Badge tone={CONTACT_STATUS[c.status].tone}>{CONTACT_STATUS[c.status].label}</Badge> },
    { key: 'owner', header: 'Owner', render: (c) => <AvatarOf id={c.ownerId} /> },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} ${contacts.length === 1 ? 'person' : 'people'} across ${companies.length} ${companies.length === 1 ? 'company' : 'companies'}`}
        action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>New contact</Button>}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input icon={<Search className="size-4" />} placeholder="Search contacts…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        {(['all', ...Object.keys(CONTACT_STATUS)] as (ContactStatus | 'all')[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`h-8 px-3 rounded-full text-xs font-medium transition-colors ${status === s ? 'bg-navy-900 text-white' : 'bg-white ring-1 ring-surface-300 text-ink-600 hover:bg-surface-50'}`}
          >
            {s === 'all' ? 'All' : CONTACT_STATUS[s].label}
          </button>
        ))}
      </div>

      <div className="bg-surface-0 rounded-xl ring-1 ring-surface-200 shadow-card">
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="No contacts found" body="Try a different search or add your first contact." action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>New contact</Button>} />
        ) : (
          <DataTable columns={columns} rows={filtered} rowKey={(c) => c.id} onRowClick={(c) => navigate(`/contacts/${c.id}`)} />
        )}
      </div>

      <ContactFormDrawer open={formOpen} onClose={() => setFormOpen(false)} />
    </PageShell>
  );
}
