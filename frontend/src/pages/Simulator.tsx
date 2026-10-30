import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, Metric } from '../components/ui/Card';
import { Slider } from '../components/ui/Inputs';
import { AXIS, COLORS, GRID } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { buildPlan } from '../engine/plan';
import { DEFAULT_SCENARIO } from '../data/templates';
import { NextStep } from '../components/ui/NextStep';
import { useI18n } from '../i18n/useI18n';

const sign = (v: number, unit: string) => `${v > 0 ? '+' : ''}${v}${unit}`;

function Compare({ label, base, cur, fmt, higherIsBetter, baseline }: {
  label: string; base: number; cur: number; fmt: (v: number) => string; higherIsBetter: boolean;
  baseline: (base: string, delta: string) => string;
}) {
  const d = cur - base;
  const good = Math.abs(d) < 0.5 ? undefined : (d > 0) === higherIsBetter ? 'green' : 'red';
  const delta = `${d >= 0 ? '+' : ''}${fmt(d)}`;
  return <Metric label={label} value={fmt(cur)} sub={<span className={good ? `tone-${good}` : ''}>{baseline(fmt(base), delta)}</span>} />;
}

export default function Simulator() {
  const scenario = useStore((s) => s.scenario);
  const setScenario = useStore((s) => s.setScenario);
  const resetScenario = useStore((s) => s.resetScenario);
  const saved = useStore((s) => s.savedScenarios);
  const saveScenario = useStore((s) => s.saveScenario);
  const loadScenario = useStore((s) => s.loadScenario);
  const deleteScenario = useStore((s) => s.deleteScenario);
  const state = useStore();
  const [name, setName] = useState('');
  const { t, money, moneyTip, goalName, locale } = useI18n();
  const baseline = (base: string, delta: string) => t('simulator.baseline', { base, delta });

  const base = usePlan({ scenario: DEFAULT_SCENARIO, mc: false });
  const cur = usePlan({ mc: false });

  const projection = base.projection.map((p, i) => ({ year: p.year, Baseline: p.corpus, Scenario: cur.projection[i]?.corpus ?? 0 }));
  const perGoal = base.goals.map((g) => ({
    name: goalName(g.goal.name, g.goal.category), Baseline: Math.round(g.sip), Scenario: Math.round(cur.goals.find((c) => c.goal.id === g.goal.id)?.sip ?? 0),
  }));
  const savedPlans = useMemo(
    () => saved.map((s) => ({ s, plan: buildPlan({ profile: state.profile, goals: state.goals, assumptions: state.assumptions, scenario: s.scenario, weights: state.weights, monteCarlo: false }) })),
    [saved, state.profile, state.goals, state.assumptions, state.weights]
  );
  const axisW = locale === 'en' ? 72 : 88;

  return (
    <>
      <div className="grid g2">
        <Card title={t('simulator.adjust')} subtitle={t('simulator.adjustSub')}
          actions={<button className="btn sm" onClick={resetScenario}>{t('common.reset')}</button>}>
          <Slider label={t('simulator.income')} min={-50} max={100} step={5} value={scenario.incomeChange} onChange={(v) => setScenario({ incomeChange: v })} format={(v) => sign(v, '%')} />
          <Slider label={t('simulator.expense')} min={-50} max={50} step={5} value={scenario.expenseChange} onChange={(v) => setScenario({ expenseChange: v })} format={(v) => sign(v, '%')} />
          <Slider label={t('simulator.inflation')} min={-3} max={5} step={0.5} value={scenario.inflationDelta} onChange={(v) => setScenario({ inflationDelta: v })} format={(v) => sign(v, t('unit.pp'))} />
          <Slider label={t('simulator.equity')} min={-6} max={4} step={0.5} value={scenario.returnDelta} onChange={(v) => setScenario({ returnDelta: v })} format={(v) => sign(v, t('unit.pp'))} />
          <div className="row" style={{ marginTop: 12 }}>
            <input placeholder={t('simulator.placeholder')} value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
            <button className="btn primary" onClick={() => { saveScenario(name.trim()); setName(''); }}>{t('common.save')}</button>
          </div>
        </Card>
        <Card title={t('simulator.vs')}>
          <div className="grid g2">
            <Compare label={t('simulator.surplus')} base={base.surplus} cur={cur.surplus} fmt={money} higherIsBetter baseline={baseline} />
            <Compare label={t('simulator.sip')} base={base.totalSip} cur={cur.totalSip} fmt={money} higherIsBetter={false} baseline={baseline} />
            <Compare label={t('simulator.gap')} base={Math.max(base.gap, 0)} cur={Math.max(cur.gap, 0)} fmt={money} higherIsBetter={false} baseline={baseline} />
            <Compare label={t('simulator.health')} base={base.health.score} cur={cur.health.score} fmt={(v) => `${Math.round(v)}`} higherIsBetter baseline={baseline} />
          </div>
        </Card>
      </div>

      <div className="grid g2 mt">
        <Card title={t('simulator.projection')} subtitle={t('simulator.projectionSub')}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={projection}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="year" tick={AXIS} />
              <YAxis tickFormatter={(v) => money(Number(v))} tick={AXIS} width={axisW} />
              <Tooltip formatter={moneyTip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line dataKey="Baseline" name={t('chart.baseline')} stroke={COLORS.slate} strokeWidth={2} dot={false} />
              <Line dataKey="Scenario" name={t('chart.scenario')} stroke={COLORS.primary} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title={t('simulator.perGoal')}>
          {perGoal.length ? <ResponsiveContainer width="100%" height={280}>
            <BarChart data={perGoal}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tickFormatter={(v) => money(Number(v))} tick={AXIS} width={locale === 'en' ? 64 : 80} />
              <Tooltip formatter={moneyTip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Baseline" name={t('chart.baseline')} fill={COLORS.slate} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Scenario" name={t('chart.scenario')} fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer> : <NextStep page="goals" action={t('goals.add')}>{t('simulator.perGoalEmpty')}</NextStep>}
        </Card>
      </div>

      <Card title={t('simulator.saved')} subtitle={t('simulator.savedSub')} className="mt">
        {savedPlans.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('simulator.name')}</th><th>{t('simulator.incomeCol')}</th><th>{t('simulator.expensesCol')}</th><th>{t('simulator.inflationCol')}</th><th>{t('simulator.returnCol')}</th><th>{t('simulator.surplusCol')}</th><th>{t('simulator.gapCol')}</th><th>{t('simulator.healthCol')}</th><th /></tr></thead>
              <tbody>
                {savedPlans.map(({ s, plan }) => (
                  <tr key={s.id}>
                    <td><b>{s.name}</b></td>
                    <td>{sign(s.scenario.incomeChange, '%')}</td>
                    <td>{sign(s.scenario.expenseChange, '%')}</td>
                    <td>{sign(s.scenario.inflationDelta, t('unit.pp'))}</td>
                    <td>{sign(s.scenario.returnDelta, t('unit.pp'))}</td>
                    <td>{money(plan.surplus)}</td>
                    <td className={plan.gap > 0 ? 'tone-red' : 'tone-green'}>{plan.gap > 0 ? money(plan.gap) : t('common.none')}</td>
                    <td>{plan.health.score}</td>
                    <td className="row">
                      <button className="btn sm" onClick={() => loadScenario(s.id)}>{t('common.load')}</button>
                      <button className="btn sm danger" onClick={() => deleteScenario(s.id)}>{t('common.delete')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">{t('simulator.empty')}</p>}
      </Card>
    </>
  );
}
