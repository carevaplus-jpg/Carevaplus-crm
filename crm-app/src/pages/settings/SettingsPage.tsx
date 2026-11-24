import { useState } from 'react';
import { Plus, Trash2, Crown, Shield, UserCircle2, GripVertical, Bell, MessageCircle, MessageSquareText, Mail, Smartphone, HardDrive } from 'lucide-react';
import { useStore } from '@/store';
import { useCurrentProfile, useDefaultPipelineId, useOrgId, useStages, useTeam } from '@/store/selectors';
import { usePrefs } from '@/store/prefs';
import { notificationsSupported, requestNotificationPermission } from '@/lib/notifications';
import { uid, nowIso } from '@/lib/id';
import type { Role } from '@/types';
import { BackupButton, RestoreBackupButton } from '@/components/BackupButtons';
import { Avatar, Badge, Button, Card, CardHeader, Input, PageHeader, PageShell, Select, Switch, confirm } from '@/ui';

const PRIVACY_URL = 'https://github.com/carevaplus-jpg/Carevaplus-crm/blob/main/crm-app/PRIVACY.md';

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', executive: 'Executive', sales_rep: 'Sales Rep' };
const ROLE_ICON: Record<Role, typeof Crown> = { admin: Crown, executive: Shield, sales_rep: UserCircle2 };

export function SettingsPage() {
  const profile = useCurrentProfile();
  const team = useTeam();
  const orgId = useOrgId();
  const pipelineId = useDefaultPipelineId();
  const stages = useStages(pipelineId);
  const upsert = useStore((s) => s.upsert);
  const remove = useStore((s) => s.remove);
  const notify = useStore((s) => s.notify);
  const eraseAllData = useStore((s) => s.eraseAllData);
  const orgName = useStore((s) => s.orgName);
  const renameWorkspace = useStore((s) => s.renameWorkspace);
  const taskReminders = usePrefs((s) => s.taskReminders);
  const setTaskReminders = usePrefs((s) => s.setTaskReminders);

  const isAdmin = profile?.role === 'admin';
  const [newStage, setNewStage] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<Role>('sales_rep');
  const [showAddMember, setShowAddMember] = useState(false);

  const addStage = () => {
    if (!newStage.trim() || !pipelineId) return;
    const openStages = stages.filter((s) => !s.isWon && !s.isLost);
    upsert('stages', {
      id: uid('stg_'),
      orgId,
      pipelineId,
      name: newStage.trim(),
      order: openStages.length,
      color: 'var(--color-stage-2)',
      probability: 0.4,
    });
    setNewStage('');
  };

  const renameStage = (id: string, name: string) => {
    const stage = stages.find((s) => s.id === id);
    if (stage) upsert('stages', { ...stage, name });
  };

  const deleteStage = async (id: string) => {
    const ok = await confirm({ title: 'Delete stage?', body: 'Deals in this stage will need to be moved manually.', danger: true, confirmLabel: 'Delete' });
    if (ok) remove('stages', id);
  };

  const addMember = () => {
    if (!newMemberName.trim()) return;
    upsert('profiles', {
      id: uid('profile_'),
      orgId,
      email: newMemberEmail.trim(),
      name: newMemberName.trim(),
      role: newMemberRole,
      avatarHue: Math.floor(Math.random() * 360),
      createdAt: nowIso(),
    });
    notify({ kind: 'success', title: 'Team member added', subtitle: newMemberName });
    setNewMemberName('');
    setNewMemberEmail('');
    setShowAddMember(false);
  };

  const changeRole = (id: string, role: Role) => {
    const p = team.find((t) => t.id === id);
    if (p) upsert('profiles', { ...p, role });
  };

  const removeMember = async (id: string) => {
    if (id === profile?.id) return;
    const ok = await confirm({ title: 'Remove team member?', body: 'They will be removed from your team list. Contacts, deals and tasks assigned to them are kept.', danger: true, confirmLabel: 'Remove' });
    if (ok) remove('profiles', id);
  };

  const doErase = async () => {
    const ok = await confirm({ title: 'Erase all data?', body: 'Every contact, company, deal, task, quote, invoice and message log on this device will be permanently deleted, and you will start setup again. This cannot be undone.', danger: true, confirmLabel: 'Erase everything' });
    if (ok) eraseAllData();
  };

  const toggleReminders = async (v: boolean) => {
    if (v) {
      const perm = await requestNotificationPermission();
      if (perm !== 'granted') {
        notify({ kind: 'warning', title: 'Notifications blocked', subtitle: 'Allow notifications for Careva+ CRM in your phone or browser settings to enable reminders.' });
        return;
      }
    }
    setTaskReminders(v);
    notify({ kind: 'success', title: v ? 'Task reminders enabled' : 'Task reminders disabled' });
  };

  const openStages = stages.filter((s) => !s.isWon && !s.isLost).sort((a, b) => a.order - b.order);
  const closedStages = stages.filter((s) => s.isWon || s.isLost);

  return (
    <PageShell>
      <PageHeader title="Settings & Team" subtitle="Manage your pipeline, team and workspace" />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Team" subtitle={`${team.length} members`} action={isAdmin && <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setShowAddMember((v) => !v)}>Add</Button>} />

          {showAddMember && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 p-3 bg-surface-50 rounded-lg">
              <Input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Full name" />
              <Input type="email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="Email (optional)" />
              <Select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as Role)}>
                <option value="sales_rep">Sales Rep</option>
                <option value="executive">Executive</option>
                <option value="admin">Admin</option>
              </Select>
              <Button size="md" variant="primary" onClick={addMember} disabled={!newMemberName.trim()}>Add member</Button>
            </div>
          )}

          <div className="space-y-1">
            {team.map((p) => {
              const RoleIcon = ROLE_ICON[p.role];
              return (
                <div key={p.id} className="flex items-center gap-3 py-2 px-1">
                  <Avatar name={p.name} hue={p.avatarHue} size={34} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate flex items-center gap-1.5">
                      {p.name}
                      {p.id === profile?.id && <Badge tone="brand">You</Badge>}
                    </p>
                    <p className="text-xs text-ink-500 truncate">{p.title || p.email || ROLE_LABEL[p.role]}</p>
                  </div>
                  {isAdmin && p.id !== profile?.id ? (
                    <Select value={p.role} onChange={(e) => changeRole(p.id, e.target.value as Role)} className="w-32 h-8 text-xs">
                      <option value="sales_rep">Sales Rep</option>
                      <option value="executive">Executive</option>
                      <option value="admin">Admin</option>
                    </Select>
                  ) : (
                    <Badge tone="neutral"><RoleIcon className="size-3" />{ROLE_LABEL[p.role]}</Badge>
                  )}
                  {isAdmin && p.id !== profile?.id && (
                    <button onClick={() => removeMember(p.id)} className="text-ink-300 hover:text-danger-500">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Sales pipeline" subtitle="Stages your deals move through" />
          <div className="space-y-1.5 mb-3">
            {openStages.map((s) => (
              <div key={s.id} className="flex items-center gap-2 group">
                <GripVertical className="size-3.5 text-ink-300" />
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
                <input
                  defaultValue={s.name}
                  onBlur={(e) => renameStage(s.id, e.target.value)}
                  className="flex-1 text-sm bg-transparent outline-none focus:bg-surface-50 rounded px-1.5 py-1"
                />
                <button onClick={() => deleteStage(s.id)} aria-label={`Delete ${s.name} stage`} className="p-1 text-ink-300 hover:text-danger-500 lg:opacity-0 lg:group-hover:opacity-100">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            {closedStages.map((s) => (
              <div key={s.id} className="flex items-center gap-2 opacity-60">
                <GripVertical className="size-3.5 text-ink-300" />
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="flex-1 text-sm px-1.5 py-1">{s.name}</span>
                <Badge tone="neutral">Fixed</Badge>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newStage} onChange={(e) => setNewStage(e.target.value)} placeholder="New stage name" onKeyDown={(e) => e.key === 'Enter' && addStage()} />
            <Button size="sm" icon={<Plus className="size-3.5" />} onClick={addStage} disabled={!newStage.trim()}>Add</Button>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Workspace & data" />
          <Input label="Company name" defaultValue={orgName} onBlur={(e) => e.target.value.trim() && renameWorkspace(e.target.value.trim())} disabled={!isAdmin} />
          <div className="flex items-start gap-3 p-3 bg-surface-50 rounded-lg my-4">
            <HardDrive className="size-4 text-ink-400 mt-0.5 shrink-0" />
            <p className="text-sm text-ink-600">
              Everything is saved privately on this device and works fully offline. Tap <strong>Back up now</strong> regularly to save a copy to Google Drive, WhatsApp or email — and use <strong>Restore</strong> to bring it back on a new phone. Uninstalling the app without a backup deletes your data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BackupButton />
            <RestoreBackupButton />
            {isAdmin && (
              <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={doErase}>Erase all data</Button>
            )}
          </div>
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="inline-block text-xs text-brand-600 hover:underline mt-4">
            Privacy policy
          </a>
        </Card>

        <Card>
          <CardHeader title="Notifications" subtitle="Local reminders for tasks that come due" />
          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Bell className="size-4" /></div>
              <div>
                <p className="text-sm font-medium text-ink-800">Task due reminders</p>
                <p className="text-xs text-ink-500">{notificationsSupported() ? 'Pings this device when one of your tasks is due.' : 'Not supported in this browser.'}</p>
              </div>
            </div>
            <Switch checked={taskReminders} onChange={toggleReminders} disabled={!notificationsSupported()} label="Task due reminders" />
          </div>

          <div className="mt-4 pt-4 border-t border-surface-200">
            <p className="text-xs font-semibold text-ink-500 mb-2.5">Outreach channels</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-sm text-ink-600">
                <Mail className="size-4 text-ink-400" /> Email — opens a pre-filled draft in your mail app, logged on the contact
              </div>
              <div className="flex items-center gap-2.5 text-sm text-ink-600">
                <MessageCircle className="size-4 text-success-500" /> WhatsApp — opens a pre-filled chat via <code className="text-xs bg-surface-50 px-1 py-0.5 rounded">wa.me</code>, logged on the contact
              </div>
              <div className="flex items-center gap-2.5 text-sm text-ink-600">
                <MessageSquareText className="size-4 text-brand-500" /> SMS — opens your phone's texting app, logged on the contact
              </div>
            </div>
            <p className="text-[11px] text-ink-400 mt-3 flex items-start gap-1.5">
              <Smartphone className="size-3.5 shrink-0 mt-0.5" />
              No account linking required — sends go through apps already on your device. Automated bulk sending (Twilio / WhatsApp Business API) can be wired in later if you need it.
            </p>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
