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
import { useI18n } from '../i18n/useI18n';
import type { Allocation } from '../types';

const toRows = (a: Allocation) => [
  { name: 'Equity', value: a.equity }, { name: 'Debt', value: a.debt }, { name: 'Gold', value: a.gold }, { name: 'FD', value: a.fd },
].filter((r) => r.value > 0);

const ASSET_NAME: Record<string, string> = { Equity: 'asset.equity', Debt: 'asset.debt', Gold: 'asset.gold', FD: 'asset.fd' };

export default function Investments() {
  const plan = usePlan({ mc: false });
  const assumptions = useStore((s) => s.assumptions);
  const { t, goalName } = useI18n();
  const [years, setYears] = useState(5);
  const [goalId, setGoalId] = useState('');
  const alloc = allocationFor(years);
  const stats = portfolioStats(alloc, assumptions);
  const goal = plan.goals.find((g) => g.goal.id === goalId) ?? plan.goals.find((g) => g.years > 3) ?? plan.goals[0];

  const perGoal = plan.goals.map((g) => ({ name: goalName(g.goal.name, g.goal.category), Equity: g.allocation.equity, Debt: g.allocation.debt, Gold: g.allocation.gold, FD: g.allocation.fd }));
  const glide = goal
    ? Array.from({ length: goal.years + 1 }, (_, i) => {
        const left = goal.years - i;
        const a = allocationFor(left);
        return { year: CURRENT_YEAR + i, Equity: a.equity, Debt: a.debt, Gold: a.gold, FD: a.fd };
      })
    : [];

  return (
    <>
      <Card title={t('invest.compare')} subtitle={t('invest.compareSub')}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t('invest.category')}</th><th>{t('invest.risk')}</th><th>{t('invest.horizon')}</th><th>{t('invest.liquidity')}</th><th>{t('invest.return')}</th><th>{t('invest.fits')}</th><th>{t('invest.note')}</th></tr></thead>
            <tbody>
              {ASSETS.map((a) => (
                <tr key={a.id} className={years >= a.minYears && (a.minYears >= 3 || years <= 3) ? 'hl' : ''}>
                  <td><b>{t(`asset.${a.id}.name`)}</b></td>
                  <td><Badge tone={a.risk === 'high' ? 'red' : a.risk === 'medium' ? 'amber' : 'green'}>{t(`risk.${a.risk}`)}</Badge></td>
                  <td>{t(`asset.${a.id}.horizon`)}</td>
                  <td>{t(`asset.${a.id}.liquidity`)}</td>
                  <td>{a.returnKey ? pct(Number(assumptions[a.returnKey]), 1) : t('invest.varies')}</td>
                  <td>{t(`asset.${a.id}.fits`)}</td>
                  <td className="muted">{t(`asset.${a.id}.note`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>{t('invest.highlight')}</p>
      </Card>

      <div className="grid g2 mt">
        <Card title={t('invest.mix')}>
          <Slider label={t('invest.years')} min={0} max={30} value={years} onChange={setYears} format={(v) => t('unit.yrs', { n: v })} />
          <div className="grid g2">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={toRows(alloc).map((r) => ({ value: r.value, name: t(ASSET_NAME[r.name]) }))} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {toRows(alloc).map((r) => <Cell key={r.name} fill={ASSET_COLORS[r.name as keyof typeof ASSET_COLORS]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gap: 12, alignContent: 'center' }}>
              <Metric label={t('invest.expected')} value={pct(stats.ret, 1)} />
              <Metric label={t('invest.volatility')} value={pct(stats.vol, 1)} sub={t('invest.volSub')} />
            </div>
          </div>
        </Card>
        <Card title={t('invest.each')}>
          {perGoal.length ? <ResponsiveContainer width="100%" height={280}>
            <BarChart data={perGoal} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={AXIS} />
              <YAxis type="category" dataKey="name" tick={AXIS} width={120} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {(Object.keys(ASSET_COLORS) as (keyof typeof ASSET_COLORS)[]).map((k) => <Bar key={k} dataKey={k} name={t(ASSET_NAME[k])} stackId="a" fill={ASSET_COLORS[k]} />)}
            </BarChart>
          </ResponsiveContainer> : <NextStep page="goals" action={t('dashboard.addGoal')}>{t('invest.eachEmpty')}</NextStep>}
        </Card>
      </div>

      {goal && (
        <Card title={t('invest.glide')} subtitle={t('invest.glideSub')} className="mt"
          actions={<div style={{ width: 240 }}><SelectField label={t('invest.goal')} value={goal.goal.id} options={plan.goals.map((g) => ({ value: g.goal.id, label: goalName(g.goal.name, g.goal.category) }))} onChange={setGoalId} /></div>}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={glide}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="year" tick={AXIS} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={AXIS} width={44} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {(Object.keys(ASSET_COLORS) as (keyof typeof ASSET_COLORS)[]).map((k) => (
                <Area key={k} type="stepAfter" dataKey={k} name={t(ASSET_NAME[k])} stackId="1" stroke={ASSET_COLORS[k]} fill={ASSET_COLORS[k]} fillOpacity={0.7} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}
    </>
  );
}
