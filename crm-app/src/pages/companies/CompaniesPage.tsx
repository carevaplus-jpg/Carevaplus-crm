import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, MapPin } from 'lucide-react';
import { useCompanies, useContacts, useDeals } from '@/store/selectors';
import { useUi } from '@/store/ui';
import type { Company } from '@/types';
import { moneyCompact } from '@/lib/format';
import { Badge, Button, DataTable, EmptyState, Input, PageHeader, PageShell, type Column } from '@/ui';
import { AvatarOf } from '@/components/record/ActivityTimeline';
import { CompanyFormDrawer } from './CompanyFormDrawer';

export function CompaniesPage() {
  const companies = useCompanies();
  const contacts = useContacts();
  const deals = useDeals();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const requestNew = useUi((s) => s.requestNew);
  const setRequestNew = useUi((s) => s.setRequestNew);

  useEffect(() => {
    if (requestNew === 'company') {
      setFormOpen(true);
      setRequestNew(null);
    }
  }, [requestNew, setRequestNew]);

  const contactCount = (id: string) => contacts.filter((c) => c.companyId === id).length;
  const openValue = (id: string) => deals.filter((d) => d.companyId === id && d.status === 'open').reduce((s, d) => s + d.amount, 0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return companies;
    return companies.filter((c) => `${c.name} ${c.industry ?? ''} ${c.city ?? ''}`.toLowerCase().includes(needle));
  }, [companies, q]);

  const columns: Column<Company>[] = [
    {
      key: 'name',
      header: 'Company',
      sortValue: (c) => c.name,
      render: (c) => (
        <div className="min-w-0">
          <p className="font-medium text-ink-900 truncate">{c.name}</p>
          {c.industry && <p className="text-xs text-ink-500">{c.industry}</p>}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (c) => c.city ? <span className="flex items-center gap-1.5 text-ink-600 text-sm"><MapPin className="size-3.5 text-ink-400" />{c.city}</span> : <span className="text-ink-300">—</span>,
    },
    { key: 'size', header: 'Size', render: (c) => <span className="text-ink-600">{c.size ?? '—'}</span> },
    { key: 'contacts', header: 'Contacts', align: 'center', sortValue: (c) => contactCount(c.id), render: (c) => <Badge tone="neutral">{contactCount(c.id)}</Badge> },
    { key: 'pipeline', header: 'Open pipeline', align: 'right', sortValue: (c) => openValue(c.id), render: (c) => <span className="font-medium text-ink-800 tabular-nums">{moneyCompact(openValue(c.id))}</span> },
    { key: 'owner', header: 'Owner', render: (c) => <AvatarOf id={c.ownerId} /> },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Companies"
        subtitle={`${companies.length} ${companies.length === 1 ? 'company' : 'companies'}`}
        action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>New company</Button>}
      />

      <Input icon={<Search className="size-4" />} placeholder="Search companies…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs mb-4" />

      <div className="bg-surface-0 rounded-xl ring-1 ring-surface-200 shadow-card">
        {filtered.length === 0 ? (
          <EmptyState icon={Building2} title="No companies found" action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>New company</Button>} />
        ) : (
          <DataTable columns={columns} rows={filtered} rowKey={(c) => c.id} onRowClick={(c) => navigate(`/companies/${c.id}`)} />
        )}
      </div>

      <CompanyFormDrawer open={formOpen} onClose={() => setFormOpen(false)} />
    </PageShell>
  );
}
