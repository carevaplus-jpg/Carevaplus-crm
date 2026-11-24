import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, Phone, Building2, Pencil, Trash2, Plus, ArrowLeft, KanbanSquare, MessageCircle, MessageSquareText } from 'lucide-react';
import { useStore } from '@/store';
import { useCompany, useContact, useCurrentProfile, useDealsForContact, useOrgId } from '@/store/selectors';
import { fullName, money, fmtDate } from '@/lib/format';
import { CONTACT_STATUS } from '@/lib/status';
import { Avatar, Badge, Button, Card, EmptyState, IconButton, Menu, Tabs, PageShell, confirm } from '@/ui';
import { AvatarOf, ActivityTimeline } from '@/components/record/ActivityTimeline';
import { RecordTasks } from '@/components/record/RecordTasks';
import { ContactFormDrawer } from './ContactFormDrawer';
import { uid, nowIso } from '@/lib/id';
import { mailLink, smsLink, waLink } from '@/lib/comms';
import type { MessageChannel } from '@/types';

export function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contact = useContact(id);
  const company = useCompany(contact?.companyId);
  const deals = useDealsForContact(id);
  const remove = useStore((s) => s.remove);
  const upsert = useStore((s) => s.upsert);
  const notify = useStore((s) => s.notify);
  const orgId = useOrgId();
  const me = useCurrentProfile();
  const [tab, setTab] = useState<'activity' | 'deals' | 'tasks'>('activity');
  const [editOpen, setEditOpen] = useState(false);

  if (!contact) {
    return (
      <PageShell>
        <EmptyState icon={Building2} title="Contact not found" action={<Button onClick={() => navigate('/contacts')}>Back to contacts</Button>} />
      </PageShell>
    );
  }

  const sendMessage = (channel: MessageChannel) => {
    const greeting = `Hi ${contact.firstName},\n\n`;
    if (channel === 'email' && contact.email) {
      window.open(mailLink(contact.email, 'Following up', greeting), '_blank');
      upsert('messageLog', {
        id: uid('msg_'),
        orgId,
        channel: 'email',
        direction: 'outbound',
        subject: 'Following up',
        body: '(composed in mail client)',
        to: contact.email,
        from: me?.email || undefined,
        contactId: contact.id,
        authorId: me?.id,
        at: nowIso(),
      });
      notify({ kind: 'info', title: 'Draft opened in your mail app', subtitle: 'Logged on this contact' });
    } else if (channel === 'whatsapp' && contact.phone) {
      window.open(waLink(contact.phone, greeting), '_blank');
      upsert('messageLog', {
        id: uid('msg_'),
        orgId,
        channel: 'whatsapp',
        direction: 'outbound',
        body: '(composed in WhatsApp)',
        to: contact.phone,
        contactId: contact.id,
        authorId: me?.id,
        at: nowIso(),
      });
      notify({ kind: 'info', title: 'WhatsApp opened', subtitle: 'Logged on this contact' });
    } else if (channel === 'sms' && contact.phone) {
      window.open(smsLink(contact.phone, greeting), '_blank');
      upsert('messageLog', {
        id: uid('msg_'),
        orgId,
        channel: 'sms',
        direction: 'outbound',
        body: '(composed as a text message)',
        to: contact.phone,
        contactId: contact.id,
        authorId: me?.id,
        at: nowIso(),
      });
      notify({ kind: 'info', title: 'Text message app opened', subtitle: 'Logged on this contact' });
    }
  };

  const del = async () => {
    const ok = await confirm({ title: 'Delete contact?', body: `${fullName(contact)} will be permanently removed.`, danger: true, confirmLabel: 'Delete' });
    if (ok) {
      remove('contacts', contact.id);
      notify({ kind: 'success', title: 'Contact deleted' });
      navigate('/contacts');
    }
  };

  return (
    <PageShell>
      <button onClick={() => navigate('/contacts')} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 mb-4">
        <ArrowLeft className="size-4" /> Contacts
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-[320px] shrink-0 space-y-4">
          <Card>
            <div className="flex items-start justify-between">
              <Avatar name={fullName(contact)} hue={contact.avatarHue} size={56} />
              <Menu
                trigger={<IconButton icon={<Pencil className="size-4" />} label="Options" />}
                items={[
                  { label: 'Edit contact', icon: <Pencil className="size-4" />, onClick: () => setEditOpen(true) },
                  { label: 'Delete contact', icon: <Trash2 className="size-4" />, onClick: del, danger: true },
                ]}
              />
            </div>
            <h1 className="font-display text-lg font-bold text-ink-900 mt-3">{fullName(contact)}</h1>
            {contact.title && <p className="text-sm text-ink-500">{contact.title}</p>}
            <div className="mt-2">
              <Badge tone={CONTACT_STATUS[contact.status].tone}>{CONTACT_STATUS[contact.status].label}</Badge>
            </div>

            <div className="mt-4 pt-4 border-t border-surface-200 space-y-2.5 text-sm">
              {contact.email && (
                <div className="flex items-center gap-2 text-ink-600">
                  <Mail className="size-3.5 text-ink-400" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-ink-600">
                  <Phone className="size-3.5 text-ink-400" />
                  {contact.phone}
                </div>
              )}
              {company && (
                <button onClick={() => navigate(`/companies/${company.id}`)} className="flex items-center gap-2 text-brand-600 hover:underline">
                  <Building2 className="size-3.5" />
                  {company.name}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              {contact.email && (
                <Button size="sm" variant="secondary" icon={<Mail className="size-3.5" />} onClick={() => sendMessage('email')}>
                  Email
                </Button>
              )}
              {contact.phone && (
                <Button size="sm" variant="secondary" icon={<Phone className="size-3.5" />} onClick={() => window.open(`tel:${contact.phone}`)}>
                  Call
                </Button>
              )}
              {contact.phone && (
                <Button size="sm" variant="secondary" icon={<MessageCircle className="size-3.5 text-success-600" />} onClick={() => sendMessage('whatsapp')}>
                  WhatsApp
                </Button>
              )}
              {contact.phone && (
                <Button size="sm" variant="secondary" icon={<MessageSquareText className="size-3.5" />} onClick={() => sendMessage('sms')}>
                  Text / SMS
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <p className="text-xs font-semibold text-ink-500 mb-2">Owner</p>
            <div className="flex items-center gap-2">
              <AvatarOf id={contact.ownerId} size={28} />
            </div>
            <p className="text-xs font-semibold text-ink-500 mt-4 mb-1">Added</p>
            <p className="text-sm text-ink-700">{fmtDate(contact.createdAt)}</p>
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          <Tabs value={tab} onChange={setTab} options={[{ value: 'activity', label: 'Activity' }, { value: 'deals', label: 'Deals' }, { value: 'tasks', label: 'Tasks' }]} counts={{ deals: deals.length }} />
          <div className="mt-5">
            {tab === 'activity' && <ActivityTimeline contactId={contact.id} />}
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
            {tab === 'tasks' && <RecordTasks contactId={contact.id} />}
          </div>
        </div>
      </div>

      <ContactFormDrawer open={editOpen} onClose={() => setEditOpen(false)} contact={contact} />
    </PageShell>
  );
}
