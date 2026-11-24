import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCompanies, useContacts, useDeals, useTeam } from '@/store/selectors';
import { money, moneyCompact, pct } from '@/lib/format';
import { revenueTrend, winRate } from '@/lib/stats';
import { CONTACT_STATUS } from '@/lib/status';
import { Card, CardHeader, KpiCard, PageHeader, PageShell } from '@/ui';
import { Wallet, Trophy, Target, Users2 } from 'lucide-react';

const PIE_COLORS = ['#8babff', '#3461ef', '#17a356', '#e0394d'];

export function ReportsPage() {
  const deals = useDeals();
  const contacts = useContacts();
  const companies = useCompanies();
  const team = useTeam();

  const trend = useMemo(() => revenueTrend(deals, 6), [deals]);
  const rate = useMemo(() => winRate(deals), [deals]);
  const wonDeals = deals.filter((d) => d.status === 'won');
  const avgDealSize = wonDeals.length ? wonDeals.reduce((s, d) => s + d.amount, 0) / wonDeals.length : 0;
  const totalWon = wonDeals.reduce((s, d) => s + d.amount, 0);

  const statusBreakdown = useMemo(
    () => (Object.keys(CONTACT_STATUS) as (keyof typeof CONTACT_STATUS)[]).map((k) => ({ name: CONTACT_STATUS[k].label, value: contacts.filter((c) => c.status === k).length })),
    [contacts],
  );

  const repPerformance = useMemo(
    () =>
      team
        .filter((p) => p.role !== 'admin')
        .map((p) => {
          const mine = deals.filter((d) => d.ownerId === p.id);
          const won = mine.filter((d) => d.status === 'won');
          const lost = mine.filter((d) => d.status === 'lost');
          const open = mine.filter((d) => d.status === 'open');
          const total = won.length + lost.length;
          return {
            name: p.name,
            won: won.reduce((s, d) => s + d.amount, 0),
            lost: lost.length,
            openCount: open.length,
            openValue: open.reduce((s, d) => s + d.amount, 0),
            winRate: total ? won.length / total : 0,
          };
        })
        .sort((a, b) => b.won - a.won),
    [team, deals],
  );

  return (
    <PageShell>
      <PageHeader title="Reports" subtitle="Deeper insight into revenue and team performance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total Won Revenue" value={moneyCompact(totalWon)} icon={Trophy} tint="gold" />
        <KpiCard label="Avg Deal Size" value={moneyCompact(avgDealSize)} icon={Wallet} tint="brand" />
        <KpiCard label="Overall Win Rate" value={pct(rate)} icon={Target} tint="success" />
        <KpiCard label="Companies" value={String(companies.length)} icon={Users2} tint="navy" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Won vs. lost revenue" subtitle="Last 6 months" />
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ left: -16, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e7ee" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#8691a8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8691a8' }} tickFormatter={(v) => moneyCompact(v)} width={56} />
                <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 10, border: '1px solid #e3e7ee', fontSize: 13 }} />
                <Bar dataKey="won" fill="#17a356" radius={[4, 4, 0, 0]} name="Won" />
                <Bar dataKey="lost" fill="#e0394d" radius={[4, 4, 0, 0]} name="Lost" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Contacts by status" />
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
                  {statusBreakdown.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e3e7ee', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
            {statusBreakdown.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-ink-600">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {s.name} ({s.value})
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <div className="p-5 pb-0">
          <CardHeader title="Rep performance" subtitle="This cycle" />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-500 border-b border-surface-200">
              <th className="text-left font-semibold px-5 py-2.5">Rep</th>
              <th className="text-right font-semibold px-3 py-2.5">Won revenue</th>
              <th className="text-right font-semibold px-3 py-2.5">Win rate</th>
              <th className="text-right font-semibold px-3 py-2.5">Open deals</th>
              <th className="text-right font-semibold px-5 py-2.5">Open value</th>
            </tr>
          </thead>
          <tbody>
            {repPerformance.map((r) => (
              <tr key={r.name} className="border-b border-surface-100 last:border-0">
                <td className="px-5 py-2.5 font-medium text-ink-900">{r.name}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-800">{money(r.won)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-600">{pct(r.winRate)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-600">{r.openCount}</td>
                <td className="px-5 py-2.5 text-right tabular-nums text-ink-800">{money(r.openValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </PageShell>
  );
}
