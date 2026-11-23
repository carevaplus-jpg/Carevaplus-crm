import { useState } from 'react';
import { Plus, Trash2, Crown, Shield, UserCircle2, RotateCcw, CloudOff, GripVertical, Bell, MessageCircle, MessageSquareText, Mail, Smartphone } from 'lucide-react';
import { useStore } from '@/store';
import { useCurrentProfile, useDefaultPipelineId, useOrgId, useStages, useTeam } from '@/store/selectors';
import { usePrefs } from '@/store/prefs';
import { notificationsSupported, requestNotificationPermission } from '@/lib/notifications';
import { cloudEnabled } from '@/lib/supabase';
import { uid, nowIso } from '@/lib/id';
import type { Role } from '@/types';
import { Avatar, Badge, Button, Card, CardHeader, Input, PageHeader, PageShell, Select, Switch, confirm } from '@/ui';

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
  const resetDemoData = useStore((s) => s.resetDemoData);
  const setCurrentProfile = useStore((s) => s.setCurrentProfile);
  const taskReminders = usePrefs((s) => s.taskReminders);
  const setTaskReminders = usePrefs((s) => s.setTaskReminders);

  const isAdmin = profile?.role === 'admin';
  const [newStage, setNewStage] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
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
    const slug = newMemberName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.');
    upsert('profiles', {
      id: uid('profile_'),
      orgId,
      email: `${slug}@carevaplus.example`,
      name: newMemberName.trim(),
      role: newMemberRole,
      avatarHue: Math.floor(Math.random() * 360),
      createdAt: nowIso(),
    });
    notify({ kind: 'success', title: 'Team member added', subtitle: newMemberName });
    setNewMemberName('');
    setShowAddMember(false);
  };

  const changeRole = (id: string, role: Role) => {
    const p = team.find((t) => t.id === id);
    if (p) upsert('profiles', { ...p, role });
  };

  const removeMember = async (id: string) => {
    if (id === profile?.id) return;
    const ok = await confirm({ title: 'Remove team member?', body: 'They will lose access to this CRM.', danger: true, confirmLabel: 'Remove' });
    if (ok) remove('profiles', id);
  };

  const doReset = async () => {
    const ok = await confirm({ title: 'Reset demo data?', body: 'This replaces all contacts, deals, tasks and everything else with a fresh sample dataset. This cannot be undone.', danger: true, confirmLabel: 'Reset everything' });
    if (ok) {
      resetDemoData();
      notify({ kind: 'success', title: 'Demo data reset' });
    }
  };

  const toggleReminders = async (v: boolean) => {
    if (v) {
      const perm = await requestNotificationPermission();
      if (perm !== 'granted') {
        notify({ kind: 'warning', title: 'Notifications blocked', subtitle: 'Allow notifications for this site in your browser settings to enable reminders.' });
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
            <div className="flex gap-2 mb-3 p-3 bg-surface-50 rounded-lg">
              <Input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Full name" className="flex-1" />
              <Select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as Role)} className="w-32">
                <option value="sales_rep">Sales Rep</option>
                <option value="executive">Executive</option>
                <option value="admin">Admin</option>
              </Select>
              <Button size="sm" onClick={addMember} disabled={!newMemberName.trim()}>Add</Button>
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
                    <p className="text-xs text-ink-500 truncate">{p.title ?? p.email}</p>
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
                  {p.id !== profile?.id && (
                    <button onClick={() => setCurrentProfile(p.id)} className="text-xs text-brand-600 hover:underline shrink-0">
                      View as
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
                <button onClick={() => deleteStage(s.id)} className="opacity-0 group-hover:opacity-100 text-ink-300 hover:text-danger-500">
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
          <CardHeader title="Data & sync" />
          <div className="flex items-start gap-3 p-3 bg-surface-50 rounded-lg mb-4">
            {cloudEnabled ? (
              <Badge tone="success">Cloud sync connected</Badge>
            ) : (
              <>
                <CloudOff className="size-4 text-ink-400 mt-0.5 shrink-0" />
                <p className="text-sm text-ink-600">
                  You're in <strong>demo mode</strong> — everything is saved only on this device. To enable multi-user accounts with real-time sync, connect a Supabase project (see <code className="text-xs bg-white px-1 py-0.5 rounded ring-1 ring-surface-300">README.md</code>) and set its URL + anon key as build environment variables.
                </p>
              </>
            )}
          </div>
          <Button variant="secondary" icon={<RotateCcw className="size-4" />} onClick={doReset}>Reset to fresh demo data</Button>
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
