import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, Metric, type Tone } from '../components/ui/Card';
import { AXIS, COLORS, GRID, money } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { NextStep } from '../components/ui/NextStep';
import { inr, pct } from '../utils/format';
import type { Fix } from '../types';

const TYPE_META: Record<Fix['type'], { label: string; tone: Tone }> = {
  cut: { label: 'Spend less', tone: 'blue' }, stepup: { label: 'Save smarter', tone: 'purple' },
  delay: { label: 'Extend timeline', tone: 'amber' }, reduce: { label: 'Reduce target', tone: 'amber' },
  info: { label: 'Tip', tone: 'gray' }, warning: { label: 'Warning', tone: 'red' },
};

export default function GapFix() {
  const plan = usePlan({ mc: false });
  const applyPatch = useStore((s) => s.applyPatch);
  const hasGoals = plan.goals.length > 0;
  const coverage = !hasGoals ? null : plan.totalSip > 0 ? Math.min(100, (plan.investable / plan.totalSip) * 100) : 100;
  const data = plan.goals.map((g) => ({ name: g.goal.name, Funded: Math.round(g.funded), Shortfall: Math.round(Math.max(g.sip - g.funded, 0)) }));

  return (
    <>
      <div className="grid g4">
        <Card><Metric label="SIP needed for all goals" value={inr(plan.totalSip)} /></Card>
        <Card><Metric label="Available each month" value={inr(plan.investable)} /></Card>
        <Card><Metric label="Monthly gap" value={!hasGoals ? '—' : plan.gap > 0 ? inr(plan.gap) : 'None'} sub={!hasGoals ? 'Add a goal' : undefined} tone={!hasGoals ? undefined : plan.gap > 0 ? 'red' : 'green'} /></Card>
        <Card><Metric label="Plan coverage" value={coverage == null ? '—' : pct(coverage)} sub={coverage == null ? 'Add a goal' : undefined} tone={coverage == null ? undefined : coverage >= 100 ? 'green' : coverage >= 70 ? 'amber' : 'red'} /></Card>
      </div>
      <div className="grid g2 mt">
        <Card title="Suggested fixes" subtitle="Apply one, and the whole plan recalculates">
          {plan.fixes.length ? plan.fixes.map((f) => (
            <div key={f.id} className="list-item">
              <Badge tone={TYPE_META[f.type].tone}>{TYPE_META[f.type].label}</Badge>
              <div style={{ flex: 1 }}>
                <b>{f.title}</b>
                <p className="muted">{f.detail}</p>
              </div>
              {f.patch && <button className="btn primary sm" onClick={() => applyPatch(f.patch!)}>Apply</button>}
            </div>
          )) : plan.goals.length ? <p className="muted">Nothing to fix. Your plan is on track.</p> : <NextStep page="goals" action="Add a goal">Tips from your income and spending still show here. The SIP gap needs a goal.</NextStep>}
        </Card>
        <Card title="Funding by goal" subtitle="In priority order: the surplus fills top goals first">
          {data.length ? <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" tickFormatter={money} tick={AXIS} />
              <YAxis type="category" dataKey="name" tick={AXIS} width={120} />
              <Tooltip formatter={money} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Funded" stackId="a" fill={COLORS.green} />
              <Bar dataKey="Shortfall" stackId="a" fill={COLORS.red} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer> : <NextStep page="goals" action="Add a goal">Funding bars appear once a goal is on the plan.</NextStep>}
        </Card>
      </div>
    </>
  );
}
