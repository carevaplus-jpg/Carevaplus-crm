import { useState } from 'react';
import { StickyNote, Phone, Mail, Users as UsersIcon, ArrowRightLeft, Trophy, XCircle, CheckSquare, Send } from 'lucide-react';
import { useStore } from '@/store';
import { useActivitiesFor, useCurrentProfile, useOrgId, useTeam } from '@/store/selectors';
import type { Activity, ActivityType } from '@/types';
import { timeAgo } from '@/lib/format';
import { uid } from '@/lib/id';
import { Avatar, Button, Textarea, EmptyState } from '@/ui';

const ICONS: Record<ActivityType, typeof StickyNote> = {
  note: StickyNote,
  call: Phone,
  email: Mail,
  meeting: UsersIcon,
  stage_change: ArrowRightLeft,
  task_done: CheckSquare,
  deal_created: ArrowRightLeft,
  deal_won: Trophy,
  deal_lost: XCircle,
};

const TONE: Record<ActivityType, string> = {
  note: 'bg-surface-100 text-ink-500',
  call: 'bg-brand-50 text-brand-600',
  email: 'bg-info-50 text-info-500',
  meeting: 'bg-gold-400/15 text-gold-700',
  stage_change: 'bg-surface-100 text-ink-500',
  task_done: 'bg-success-50 text-success-600',
  deal_created: 'bg-surface-100 text-ink-500',
  deal_won: 'bg-success-50 text-success-600',
  deal_lost: 'bg-danger-50 text-danger-600',
};

const LOG_TYPES: { type: ActivityType; label: string }[] = [
  { type: 'note', label: 'Note' },
  { type: 'call', label: 'Call' },
  { type: 'meeting', label: 'Meeting' },
  { type: 'email', label: 'Email' },
];

function Row({ activity }: { activity: Activity }) {
  const team = useTeam();
  const author = team.find((p) => p.id === activity.authorId);
  const Icon = ICONS[activity.type];
  return (
    <div className="flex gap-3">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${TONE[activity.type]}`}>
        <Icon className="size-4" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0 pb-5 border-l border-surface-200 -ml-[17px] pl-[21px] -mt-1 pt-1">
        <p className="text-sm text-ink-800 whitespace-pre-wrap break-words">{activity.body}</p>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-ink-400">
          {author && <span className="font-medium text-ink-500">{author.name}</span>}
          <span>·</span>
          <span>{timeAgo(activity.at)}</span>
        </div>
      </div>
    </div>
  );
}

export function ActivityTimeline({ contactId, companyId, dealId }: { contactId?: string; companyId?: string; dealId?: string }) {
  const activities = useActivitiesFor({ contactId, companyId, dealId });
  const upsert = useStore((s) => s.upsert);
  const profile = useCurrentProfile();
  const orgId = useOrgId();
  const [body, setBody] = useState('');
  const [type, setType] = useState<ActivityType>('note');

  const submit = () => {
    if (!body.trim()) return;
    upsert('activities', {
      id: uid('act_'),
      orgId,
      type,
      body: body.trim(),
      authorId: profile?.id,
      contactId,
      companyId,
      dealId,
      at: new Date().toISOString(),
    });
    setBody('');
  };

  return (
    <div>
      <div className="mb-5">
        <div className="flex gap-1.5 mb-2">
          {LOG_TYPES.map((l) => (
            <button
              key={l.type}
              onClick={() => setType(l.type)}
              className={`px-2.5 h-7 rounded-full text-xs font-medium transition-colors ${type === l.type ? 'bg-navy-900 text-white' : 'bg-surface-100 text-ink-500 hover:bg-surface-200'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <Textarea placeholder={`Log a ${type}…`} value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[72px]" />
        <div className="flex justify-end mt-2">
          <Button size="sm" variant="primary" icon={<Send className="size-3.5" />} onClick={submit} disabled={!body.trim()}>
            Log {type}
          </Button>
        </div>
      </div>

      {activities.length === 0 ? (
        <EmptyState icon={StickyNote} title="No activity yet" body="Calls, meetings and notes you log will show up here." />
      ) : (
        <div>
          {activities.map((a) => (
            <Row key={a.id} activity={a} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AvatarOf({ id, size = 24 }: { id?: string; size?: number }) {
  const team = useTeam();
  const p = team.find((t) => t.id === id);
  if (!p) return null;
  return <Avatar name={p.name} hue={p.avatarHue} size={size} />;
}
