import { useMemo, useState } from 'react';
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, Metric } from '../components/ui/Card';
import { SelectField, Slider } from '../components/ui/Inputs';
import { AXIS, COLORS, GRID } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { simulateGoal } from '../engine/montecarlo';
import { CURRENT_YEAR } from '../engine/finance';
import { NextStep } from '../components/ui/NextStep';
import { pct } from '../utils/format';
import { useI18n } from '../i18n/useI18n';

const probColor = (p: number) => (p >= 0.75 ? COLORS.green : p >= 0.5 ? COLORS.amber : COLORS.red);

export default function MonteCarlo() {
  const plan = usePlan();
  const stepUp = useStore((s) => s.assumptions.sipStepUp);
  const { t, money, moneyTip, goalName, locale } = useI18n();
  const [goalId, setGoalId] = useState('');
  const [runs, setRuns] = useState(1000);
  const [mode, setMode] = useState<'funded' | 'required'>('funded');
  const r = plan.goals.find((g) => g.goal.id === goalId) ?? plan.goals.find((g) => g.years > 0) ?? plan.goals[0];

  const sim = useMemo(() => r && simulateGoal({
    start: r.goal.saved, monthly: mode === 'funded' ? r.funded : r.sip, stepUp, months: r.years * 12,
    ret: r.expectedReturn, vol: r.volatility, target: r.futureCost, runs, seed: 7, withBands: true,
  }), [r, mode, runs, stepUp]);

  if (!r || !sim) return <Card title={t('mc.title')}><NextStep page="goals" action={t('goals.add')}>{t('mc.empty')}</NextStep></Card>;
  const data = sim.bands.map((b) => ({ year: CURRENT_YEAR + b.year, range: [Math.round(b.p10), Math.round(b.p90)], Median: Math.round(b.p50) }));
  const all = plan.goals.filter((g) => !isNaN(g.successProb)).map((g) => ({ name: goalName(g.goal.name, g.goal.category), p: Math.round(g.successProb * 100) }));

  return (
    <>
      <div className="grid g3">
        <Card title={t('mc.settings')}>
          <SelectField label={t('mc.goal')} value={r.goal.id} options={plan.goals.map((g) => ({ value: g.goal.id, label: goalName(g.goal.name, g.goal.category) }))} onChange={setGoalId} />
          <div style={{ marginTop: 12 }}>
            <SelectField label={t('mc.contribution')} value={mode} onChange={(v) => setMode(v as 'funded' | 'required')}
              options={[{ value: 'funded', label: t('mc.funded', { amount: r.funded }) }, { value: 'required', label: t('mc.required', { amount: r.sip }) }]} />
          </div>
          <Slider label={t('mc.paths')} min={200} max={5000} step={200} value={runs} onChange={setRuns} />
        </Card>
        <Card>
          <Metric label={t('mc.chance')} value={<span className="big" style={{ color: probColor(sim.prob) }}>{pct(sim.prob * 100)}</span>} />
          <div className="stats">
            <span>{t('mc.target')} <b>{money(r.futureCost)}</b></span>
            <span>{t('mc.median')} <b>{money(sim.median)}</b></span>
            <span>{t('mc.return')} <b>{pct(r.expectedReturn, 1)}</b></span>
            <span>{t('mc.volatility')} <b>{pct(r.volatility, 1)}</b></span>
          </div>
        </Card>
        <Card title={t('mc.odds')} subtitle={t('mc.oddsSub')}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={all} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" domain={[0, 100]} tick={AXIS} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={AXIS} width={110} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="p" name={t('chart.success')} radius={[0, 4, 4, 0]}>{all.map((a) => <Cell key={a.name} fill={probColor(a.p / 100)} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card title={t('mc.range')} subtitle={t('mc.rangeSub')} className="mt">
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="year" tick={AXIS} />
            <YAxis tickFormatter={(v) => money(Number(v))} tick={AXIS} width={locale === 'en' ? 72 : 88} />
            <Tooltip formatter={moneyTip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area dataKey="range" name={t('mc.band')} stroke="none" fill={COLORS.primary} fillOpacity={0.18} />
            <Line dataKey="Median" name={t('mc.medianName')} stroke={COLORS.primary} strokeWidth={2} dot={false} />
            <ReferenceLine y={r.futureCost} stroke={COLORS.red} strokeDasharray="6 3" label={{ value: t('mc.targetName'), position: 'insideTopLeft', fill: COLORS.red, fontSize: 11 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}
