import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Globe, Phone, MapPin, Pencil, Trash2, Plus, ArrowLeft, Users, KanbanSquare, Building2 } from 'lucide-react';
import { useStore } from '@/store';
import { useCompany, useContactsForCompany, useDealsForCompany } from '@/store/selectors';
import { fullName, money } from '@/lib/format';
import { Avatar, Badge, Button, Card, EmptyState, IconButton, Menu, Tabs, PageShell, confirm } from '@/ui';
import { AvatarOf, ActivityTimeline } from '@/components/record/ActivityTimeline';
import { RecordTasks } from '@/components/record/RecordTasks';
import { CONTACT_STATUS } from '@/lib/status';
import { CompanyFormDrawer } from './CompanyFormDrawer';

export function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const company = useCompany(id);
  const contacts = useContactsForCompany(id);
  const deals = useDealsForCompany(id);
  const remove = useStore((s) => s.remove);
  const notify = useStore((s) => s.notify);
  const [tab, setTab] = useState<'activity' | 'contacts' | 'deals' | 'tasks'>('activity');
  const [editOpen, setEditOpen] = useState(false);

  if (!company) {
    return (
      <PageShell>
        <EmptyState icon={Building2} title="Company not found" action={<Button onClick={() => navigate('/companies')}>Back to companies</Button>} />
      </PageShell>
    );
  }

  const del = async () => {
    const ok = await confirm({ title: 'Delete company?', body: `${company.name} will be permanently removed. Contacts stay, but lose this company link.`, danger: true, confirmLabel: 'Delete' });
    if (ok) {
      remove('companies', company.id);
      notify({ kind: 'success', title: 'Company deleted' });
      navigate('/companies');
    }
  };

  const openValue = deals.filter((d) => d.status === 'open').reduce((s, d) => s + d.amount, 0);
  const wonValue = deals.filter((d) => d.status === 'won').reduce((s, d) => s + d.amount, 0);

  return (
    <PageShell>
      <button onClick={() => navigate('/companies')} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 mb-4">
        <ArrowLeft className="size-4" /> Companies
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-[320px] shrink-0 space-y-4">
          <Card>
            <div className="flex items-start justify-between">
              <div className="h-14 w-14 rounded-xl bg-navy-900 flex items-center justify-center font-display font-bold text-gold-400 text-lg">{company.name.slice(0, 2).toUpperCase()}</div>
              <Menu
                trigger={<IconButton icon={<Pencil className="size-4" />} label="Options" />}
                items={[
                  { label: 'Edit company', icon: <Pencil className="size-4" />, onClick: () => setEditOpen(true) },
                  { label: 'Delete company', icon: <Trash2 className="size-4" />, onClick: del, danger: true },
                ]}
              />
            </div>
            <h1 className="font-display text-lg font-bold text-ink-900 mt-3">{company.name}</h1>
            {company.industry && <p className="text-sm text-ink-500">{company.industry}</p>}

            <div className="mt-4 pt-4 border-t border-surface-200 space-y-2.5 text-sm">
              {company.city && (
                <div className="flex items-center gap-2 text-ink-600">
                  <MapPin className="size-3.5 text-ink-400" />
                  {company.city}, {company.country}
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-2 text-ink-600">
                  <Phone className="size-3.5 text-ink-400" />
                  {company.phone}
                </div>
              )}
              {company.website && (
                <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand-600 hover:underline">
                  <Globe className="size-3.5" />
                  {company.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
            {company.notes && <p className="text-sm text-ink-600 mt-4 pt-4 border-t border-surface-200">{company.notes}</p>}
          </Card>

          <Card>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="font-display text-xl font-bold text-ink-900 tabular-nums">{money(openValue)}</p>
                <p className="text-xs text-ink-500 mt-0.5">Open pipeline</p>
              </div>
              <div>
                <p className="font-display text-xl font-bold text-success-600 tabular-nums">{money(wonValue)}</p>
                <p className="text-xs text-ink-500 mt-0.5">Won revenue</p>
              </div>
            </div>
            <p className="text-xs font-semibold text-ink-500 mt-4 mb-1">Owner</p>
            <AvatarOf id={company.ownerId} size={28} />
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          <Tabs
            value={tab}
            onChange={setTab}
            options={[{ value: 'activity', label: 'Activity' }, { value: 'contacts', label: 'Contacts' }, { value: 'deals', label: 'Deals' }, { value: 'tasks', label: 'Tasks' }]}
            counts={{ contacts: contacts.length, deals: deals.length }}
          />
          <div className="mt-5">
            {tab === 'activity' && <ActivityTimeline companyId={company.id} />}
            {tab === 'contacts' && (
              <div className="space-y-2">
                {contacts.length === 0 ? (
                  <EmptyState icon={Users} title="No contacts yet" />
                ) : (
                  contacts.map((c) => (
                    <button key={c.id} onClick={() => navigate(`/contacts/${c.id}`)} className="w-full text-left flex items-center gap-3 p-3 rounded-xl ring-1 ring-surface-200 bg-white hover:ring-brand-300 transition-colors">
                      <Avatar name={fullName(c)} hue={c.avatarHue} size={34} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ink-900 text-sm truncate">{fullName(c)}</p>
                        <p className="text-xs text-ink-500 truncate">{c.title}</p>
                      </div>
                      <Badge tone={CONTACT_STATUS[c.status].tone}>{CONTACT_STATUS[c.status].label}</Badge>
                    </button>
                  ))
                )}
              </div>
            )}
            {tab === 'deals' && (
              <div className="space-y-2">
                {deals.length === 0 ? (
                  <EmptyState icon={KanbanSquare} title="No deals yet" action={<Button size="sm" onClick={() => navigate('/deals')} icon={<Plus className="size-3.5" />}>Create a deal</Button>} />
                ) : (
                  deals.map((d) => (
                    <button key={d.id} onClick={() => navigate(`/deals/${d.id}`)} className="w-full text-left flex items-center justify-between p-3.5 rounded-xl ring-1 ring-surface-200 bg-white hover:ring-brand-300 transition-colors">
                      <span className="font-medium text-ink-900 text-sm">{d.name}</span>
                      <span className="text-sm font-semibold text-ink-700 tabular-nums">{money(d.amount, d.currency)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {tab === 'tasks' && <RecordTasks companyId={company.id} />}
          </div>
        </div>
      </div>

      <CompanyFormDrawer open={editOpen} onClose={() => setEditOpen(false)} company={company} />
    </PageShell>
  );
}
