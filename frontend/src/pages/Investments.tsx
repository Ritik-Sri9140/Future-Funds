import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, Metric } from '../components/ui/Card';
import { SelectField, Slider } from '../components/ui/Inputs';
import { ASSET_COLORS, AXIS, GRID } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { ASSETS } from '../data/assets';
import { CURRENT_YEAR, allocationFor, portfolioStats } from '../engine/finance';
import { NextStep } from '../components/ui/NextStep';
import { pct } from '../utils/format';
import type { Allocation } from '../types';

const toRows = (a: Allocation) => [
  { name: 'Equity', value: a.equity }, { name: 'Debt', value: a.debt }, { name: 'Gold', value: a.gold }, { name: 'FD', value: a.fd },
].filter((r) => r.value > 0);

export default function Investments() {
  const plan = usePlan({ mc: false });
  const assumptions = useStore((s) => s.assumptions);
  const [years, setYears] = useState(5);
  const [goalId, setGoalId] = useState('');
  const alloc = allocationFor(years);
  const stats = portfolioStats(alloc, assumptions);
  const goal = plan.goals.find((g) => g.goal.id === goalId) ?? plan.goals.find((g) => g.years > 3) ?? plan.goals[0];

  const perGoal = plan.goals.map((g) => ({ name: g.goal.name, Equity: g.allocation.equity, Debt: g.allocation.debt, Gold: g.allocation.gold, FD: g.allocation.fd }));
  const glide = goal
    ? Array.from({ length: goal.years + 1 }, (_, i) => {
        const left = goal.years - i;
        const a = allocationFor(left);
        return { year: CURRENT_YEAR + i, Equity: a.equity, Debt: a.debt, Gold: a.gold, FD: a.fd };
      })
    : [];

  return (
    <>
      <Card title="Asset classes compared" subtitle="Rule: the closer the goal, the safer the asset">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Category</th><th>Risk</th><th>Best horizon</th><th>Liquidity</th><th>Expected return</th><th>Fits goals</th><th>Note</th></tr></thead>
            <tbody>
              {ASSETS.map((a) => (
                <tr key={a.name} className={years >= a.minYears && (a.minYears >= 3 || years <= 3) ? 'hl' : ''}>
                  <td><b>{a.name}</b></td>
                  <td><Badge tone={a.risk.startsWith('High') ? 'red' : a.risk.startsWith('Medium') ? 'amber' : 'green'}>{a.risk}</Badge></td>
                  <td>{a.horizon}</td>
                  <td>{a.liquidity}</td>
                  <td>{a.returnKey ? pct(Number(assumptions[a.returnKey]), 1) : 'Varies'}</td>
                  <td>{a.fits}</td>
                  <td className="muted">{a.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>Highlighted rows suit the horizon chosen below.</p>
      </Card>

      <div className="grid g2 mt">
        <Card title="Recommended mix by horizon">
          <Slider label="Years to goal" min={0} max={30} value={years} onChange={setYears} format={(v) => `${v} yrs`} />
          <div className="grid g2">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={toRows(alloc)} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {toRows(alloc).map((r) => <Cell key={r.name} fill={ASSET_COLORS[r.name as keyof typeof ASSET_COLORS]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gap: 12, alignContent: 'center' }}>
              <Metric label="Expected return" value={pct(stats.ret, 1)} />
              <Metric label="Volatility" value={pct(stats.vol, 1)} sub="Typical yearly swing" />
            </div>
          </div>
        </Card>
        <Card title="Each goal's allocation">
          {perGoal.length ? <ResponsiveContainer width="100%" height={280}>
            <BarChart data={perGoal} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={AXIS} />
              <YAxis type="category" dataKey="name" tick={AXIS} width={120} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {(Object.keys(ASSET_COLORS) as (keyof typeof ASSET_COLORS)[]).map((k) => <Bar key={k} dataKey={k} stackId="a" fill={ASSET_COLORS[k]} />)}
            </BarChart>
          </ResponsiveContainer> : <NextStep page="goals" action="Add a goal">The comparison above already uses your return assumptions. A goal adds its own mix.</NextStep>}
        </Card>
      </div>

      {goal && (
        <Card title="Automatic glide path" subtitle="How the mix shifts safer as the deadline approaches" className="mt"
          actions={<div style={{ width: 240 }}><SelectField label="Goal" value={goal.goal.id} options={plan.goals.map((g) => ({ value: g.goal.id, label: g.goal.name }))} onChange={setGoalId} /></div>}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={glide}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="year" tick={AXIS} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={AXIS} width={44} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {(Object.keys(ASSET_COLORS) as (keyof typeof ASSET_COLORS)[]).map((k) => (
                <Area key={k} type="stepAfter" dataKey={k} stackId="1" stroke={ASSET_COLORS[k]} fill={ASSET_COLORS[k]} fillOpacity={0.7} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}
    </>
  );
}
