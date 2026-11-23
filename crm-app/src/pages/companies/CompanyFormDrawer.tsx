import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { useOrgId, useTeam } from '@/store/selectors';
import type { Company, CompanySize } from '@/types';
import { uid, nowIso } from '@/lib/id';
import { Button, Drawer, Input, Select, Textarea } from '@/ui';

const SIZES: CompanySize[] = ['1-10', '11-50', '51-200', '201-1000', '1000+'];

export function CompanyFormDrawer({ open, onClose, company }: { open: boolean; onClose: () => void; company?: Company }) {
  const upsert = useStore((s) => s.upsert);
  const notify = useStore((s) => s.notify);
  const orgId = useOrgId();
  const team = useTeam();

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState<CompanySize | ''>('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [ownerId, setOwnerId] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(company?.name ?? '');
    setIndustry(company?.industry ?? '');
    setSize(company?.size ?? '');
    setPhone(company?.phone ?? '');
    setCity(company?.city ?? '');
    setWebsite(company?.website ?? '');
    setNotes(company?.notes ?? '');
    setOwnerId(company?.ownerId ?? team[0]?.id ?? '');
  }, [open, company, team]);

  const save = () => {
    if (!name.trim()) return;
    const id = company?.id ?? uid('cmp_');
    upsert('companies', {
      id,
      orgId,
      name: name.trim(),
      domain: company?.domain,
      industry: industry.trim() || undefined,
      size: size || undefined,
      phone: phone.trim() || undefined,
      city: city.trim() || undefined,
      country: company?.country ?? 'India',
      website: website.trim() || undefined,
      notes: notes.trim() || undefined,
      ownerId: ownerId || undefined,
      tags: company?.tags ?? [],
      createdAt: company?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });
    notify({ kind: 'success', title: company ? 'Company updated' : 'Company created', subtitle: name });
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={company ? 'Edit company' : 'New company'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!name.trim()}>{company ? 'Save changes' : 'Create company'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Company name" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Beauty & Wellness" />
          <Select label="Company size" value={size} onChange={(e) => setSize(e.target.value as CompanySize)}>
            <option value="">—</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>{s} employees</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
        <Select label="Owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          {team.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Drawer>
  );
}
