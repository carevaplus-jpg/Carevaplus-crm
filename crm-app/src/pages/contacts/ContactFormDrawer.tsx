import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { useCompanies, useOrgId, useTeam } from '@/store/selectors';
import type { Contact, ContactStatus } from '@/types';
import { uid, nowIso } from '@/lib/id';
import { CONTACT_STATUS } from '@/lib/status';
import { Button, Drawer, Input, Select } from '@/ui';

export function ContactFormDrawer({ open, onClose, contact }: { open: boolean; onClose: () => void; contact?: Contact }) {
  const upsert = useStore((s) => s.upsert);
  const notify = useStore((s) => s.notify);
  const orgId = useOrgId();
  const companies = useCompanies();
  const team = useTeam();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [status, setStatus] = useState<ContactStatus>('lead');
  const [ownerId, setOwnerId] = useState('');

  useEffect(() => {
    if (!open) return;
    setFirstName(contact?.firstName ?? '');
    setLastName(contact?.lastName ?? '');
    setEmail(contact?.email ?? '');
    setPhone(contact?.phone ?? '');
    setTitle(contact?.title ?? '');
    setCompanyId(contact?.companyId ?? '');
    setStatus(contact?.status ?? 'lead');
    setOwnerId(contact?.ownerId ?? team[0]?.id ?? '');
  }, [open, contact, team]);

  const save = () => {
    if (!firstName.trim()) return;
    const id = contact?.id ?? uid('con_');
    upsert('contacts', {
      id,
      orgId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      title: title.trim() || undefined,
      companyId: companyId || undefined,
      status,
      ownerId: ownerId || undefined,
      tags: contact?.tags ?? [],
      avatarHue: contact?.avatarHue ?? Math.floor(Math.random() * 360),
      createdAt: contact?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });
    notify({ kind: 'success', title: contact ? 'Contact updated' : 'Contact created', subtitle: `${firstName} ${lastName}` });
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={contact ? 'Edit contact' : 'New contact'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!firstName.trim()}>{contact ? 'Save changes' : 'Create contact'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
          <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
        <Input label="Job title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Operations Manager" />
        <Select label="Company" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          <option value="">No company</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as ContactStatus)}>
            {Object.entries(CONTACT_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
          <Select label="Owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            {team.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
      </div>
    </Drawer>
  );
}
