import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Wallet, Trophy, Target, AlarmClock, ArrowRight, Flame } from 'lucide-react';
import { useCurrentProfile, useDeals, useDefaultPipelineId, useStages, useTasks, useTeam } from '@/store/selectors';
import { ActivityTimeline, AvatarOf } from '@/components/record/ActivityTimeline';
import { GetStarted } from '@/components/GetStarted';
import { money, moneyCompact, pct } from '@/lib/format';
import { isDueToday, isOverdue, pipelineByStage, revenueTrend, winRate } from '@/lib/stats';
import { Avatar, Badge, Card, CardHeader, KpiCard, PageShell } from '@/ui';
import type { Deal } from '@/types';

function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const navigate = useNavigate();
  const profile = useCurrentProfile();
  const deals = useDeals();
  const pipelineId = useDefaultPipelineId();
  const stages = useStages(pipelineId);
  const tasks = useTasks();
  const team = useTeam();

  const openPipeline = useMemo(() => deals.filter((d) => d.status === 'open').reduce((s, d) => s + d.amount, 0), [deals]);
  const wonThisMonth = useMemo(() => {
    const now = new Date();
    return deals.filter((d) => d.status === 'won' && d.closedAt && new Date(d.closedAt).getMonth() === now.getMonth() && new Date(d.closedAt).getFullYear() === now.getFullYear()).reduce((s, d) => s + d.amount, 0);
  }, [deals]);
  const rate = useMemo(() => winRate(deals), [deals]);
  const tasksToday = useMemo(() => tasks.filter((t) => isDueToday(t) || isOverdue(t)), [tasks]);

  const trend = useMemo(() => revenueTrend(deals, 6), [deals]);
  const funnel = useMemo(() => pipelineByStage(deals, stages), [deals, stages]);
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value));

  const leaderboard = useMemo(() => {
    const now = new Date();
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    return team
      .filter((p) => p.role !== 'admin')
      .map((p) => {
        const won = deals.filter((d) => d.ownerId === p.id && d.status === 'won' && d.closedAt && new Date(d.closedAt) >= qStart);
        const open = deals.filter((d) => d.ownerId === p.id && d.status === 'open');
        return { profile: p, won: won.reduce((s, d) => s + d.amount, 0), dealsWon: won.length, openValue: open.reduce((s, d) => s + d.amount, 0) };
      })
      .sort((a, b) => b.won - a.won);
  }, [team, deals]);

  const recentDeals = useMemo(() => [...deals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5), [deals]);

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-ink-500">{greetingWord()}{profile ? `, ${profile.name.split(' ')[0]}` : ''}</p>
          <h1 className="font-display text-xl font-bold text-ink-900 tracking-tight mt-0.5">Executive Dashboard</h1>
        </div>
        {profile && <Avatar name={profile.name} hue={profile.avatarHue} size={44} ring />}
      </div>

      <GetStarted />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Open Pipeline" value={moneyCompact(openPipeline)} icon={Wallet} tint="brand" />
        <KpiCard label="Won This Month" value={moneyCompact(wonThisMonth)} icon={Trophy} tint="gold" />
        <KpiCard label="Win Rate" value={pct(rate)} icon={Target} tint="success" />
        <KpiCard label="Due Today" value={String(tasksToday.length)} icon={AlarmClock} tint="navy" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue, last 6 months" subtitle="Won vs. lost deal value" />
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -16, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="won" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3461ef" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3461ef" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e7ee" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#8691a8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8691a8' }} tickFormatter={(v) => moneyCompact(v)} width={56} />
                <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 10, border: '1px solid #e3e7ee', fontSize: 13 }} />
                <Area type="monotone" dataKey="won" stroke="#3461ef" strokeWidth={2.5} fill="url(#won)" name="Won" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Pipeline by stage" />
          <div className="space-y-3">
            {funnel.map((f) => (
              <div key={f.stage}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-ink-700">{f.stage}</span>
                  <span className="text-ink-500 tabular-nums">{moneyCompact(f.value)}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(f.value / maxFunnel) * 100}%`, background: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Team leaderboard" subtitle="Revenue won this quarter" />
          <div className="space-y-1">
            {leaderboard.map((row, i) => (
              <div key={row.profile.id} className="flex items-center gap-3 py-2 px-1">
                <span className="text-xs font-semibold text-ink-400 w-4">{i + 1}</span>
                <Avatar name={row.profile.name} hue={row.profile.avatarHue} size={30} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{row.profile.name}</p>
                  <p className="text-xs text-ink-500">{row.dealsWon} deals won</p>
                </div>
                {i === 0 && row.won > 0 && <Flame className="size-4 text-gold-600" />}
                <span className="text-sm font-semibold text-ink-800 tabular-nums">{moneyCompact(row.won)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent deals" action={<button onClick={() => navigate('/deals')} className="text-xs text-brand-600 font-medium flex items-center gap-0.5">All <ArrowRight className="size-3" /></button>} />
          <div className="space-y-2.5">
            {recentDeals.map((d: Deal) => (
              <button key={d.id} onClick={() => navigate(`/deals/${d.id}`)} className="w-full text-left flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900 truncate">{d.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {d.status === 'won' && <Badge tone="success">Won</Badge>}
                    {d.status === 'lost' && <Badge tone="danger">Lost</Badge>}
                    {d.status === 'open' && <AvatarOf id={d.ownerId} size={16} />}
                  </div>
                </div>
                <span className="text-sm font-semibold text-ink-700 tabular-nums ml-2">{moneyCompact(d.amount)}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Organization activity" subtitle="What the team has been up to" />
        <div className="max-h-[360px] overflow-y-auto pr-1">
          <ActivityTimeline />
        </div>
      </Card>
    </PageShell>
  );
}
