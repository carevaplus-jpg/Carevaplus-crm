import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store';
import { useCompanies, useContacts, useDefaultPipelineId, useOrgId, useStages, useTeam } from '@/store/selectors';
import type { Deal } from '@/types';
import { uid, nowIso } from '@/lib/id';
import { Button, Drawer, Input, Select } from '@/ui';

export function DealFormDrawer({ open, onClose, deal, initialStageId }: { open: boolean; onClose: () => void; deal?: Deal; initialStageId?: string }) {
  const upsert = useStore((s) => s.upsert);
  const notify = useStore((s) => s.notify);
  const orgId = useOrgId();
  const pipelineId = useDefaultPipelineId();
  const stages = useStages(pipelineId);
  const companies = useCompanies();
  const contacts = useContacts();
  const team = useTeam();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [stageId, setStageId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(deal?.name ?? '');
    setAmount(deal ? String(deal.amount) : '');
    setStageId(deal?.stageId ?? initialStageId ?? stages[0]?.id ?? '');
    setCompanyId(deal?.companyId ?? '');
    setContactId(deal?.contactId ?? '');
    setOwnerId(deal?.ownerId ?? team[0]?.id ?? '');
    setExpectedCloseDate(deal?.expectedCloseDate?.slice(0, 10) ?? '');
  }, [open, deal, initialStageId, stages, team]);

  const contactsForCompany = useMemo(() => contacts.filter((c) => !companyId || c.companyId === companyId), [contacts, companyId]);

  const save = () => {
    if (!name.trim() || !pipelineId || !stageId) return;
    const stage = stages.find((s) => s.id === stageId);
    const id = deal?.id ?? uid('deal_');
    upsert('deals', {
      id,
      orgId,
      name: name.trim(),
      pipelineId,
      stageId,
      amount: Number(amount) || 0,
      currency: deal?.currency ?? 'INR',
      contactId: contactId || undefined,
      companyId: companyId || undefined,
      ownerId: ownerId || undefined,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate).toISOString() : undefined,
      closedAt: stage?.isWon || stage?.isLost ? (deal?.closedAt ?? nowIso()) : undefined,
      status: stage?.isWon ? 'won' : stage?.isLost ? 'lost' : 'open',
      createdAt: deal?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });
    notify({ kind: 'success', title: deal ? 'Deal updated' : 'Deal created', subtitle: name });
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={deal ? 'Edit deal' : 'New deal'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!name.trim()}>{deal ? 'Save changes' : 'Create deal'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Deal name" required value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Acme Corp — Annual Contract" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Amount (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="150000" />
          <Select label="Stage" value={stageId} onChange={(e) => setStageId(e.target.value)}>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
        <Select label="Company" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setContactId(''); }}>
          <option value="">No company</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select label="Primary contact" value={contactId} onChange={(e) => setContactId(e.target.value)}>
          <option value="">No contact</option>
          {contactsForCompany.map((c) => (
            <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Expected close" type="date" value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} />
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
