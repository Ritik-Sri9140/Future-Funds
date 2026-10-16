import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, Metric } from '../components/ui/Card';
import { Slider } from '../components/ui/Inputs';
import { AXIS, COLORS, GRID, money } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { buildPlan } from '../engine/plan';
import { DEFAULT_SCENARIO } from '../data/templates';
import { NextStep } from '../components/ui/NextStep';
import { inr } from '../utils/format';

const sign = (v: number, unit: string) => `${v > 0 ? '+' : ''}${v}${unit}`;

function Compare({ label, base, cur, fmt, higherIsBetter }: { label: string; base: number; cur: number; fmt: (v: number) => string; higherIsBetter: boolean }) {
  const d = cur - base;
  const good = Math.abs(d) < 0.5 ? undefined : (d > 0) === higherIsBetter ? 'green' : 'red';
  return <Metric label={label} value={fmt(cur)} sub={<span className={good ? `tone-${good}` : ''}>Baseline {fmt(base)} ({d >= 0 ? '+' : ''}{fmt(d)})</span>} />;
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

  const base = usePlan({ scenario: DEFAULT_SCENARIO, mc: false });
  const cur = usePlan({ mc: false });

  const projection = base.projection.map((p, i) => ({ year: p.year, Baseline: p.corpus, Scenario: cur.projection[i]?.corpus ?? 0 }));
  const perGoal = base.goals.map((g) => ({
    name: g.goal.name, Baseline: Math.round(g.sip), Scenario: Math.round(cur.goals.find((c) => c.goal.id === g.goal.id)?.sip ?? 0),
  }));
  const savedPlans = useMemo(
    () => saved.map((s) => ({ s, plan: buildPlan({ profile: state.profile, goals: state.goals, assumptions: state.assumptions, scenario: s.scenario, weights: state.weights, monteCarlo: false }) })),
    [saved, state.profile, state.goals, state.assumptions, state.weights]
  );

  return (
    <>
      <div className="grid g2">
        <Card title="Adjust the future" subtitle="Everything recalculates as you drag"
          actions={<button className="btn sm" onClick={resetScenario}>Reset</button>}>
          <Slider label="Income change" min={-50} max={100} step={5} value={scenario.incomeChange} onChange={(v) => setScenario({ incomeChange: v })} format={(v) => sign(v, '%')} />
          <Slider label="Expense change" min={-50} max={50} step={5} value={scenario.expenseChange} onChange={(v) => setScenario({ expenseChange: v })} format={(v) => sign(v, '%')} />
          <Slider label="Inflation shift" min={-3} max={5} step={0.5} value={scenario.inflationDelta} onChange={(v) => setScenario({ inflationDelta: v })} format={(v) => sign(v, ' pp')} />
          <Slider label="Equity return shift" min={-6} max={4} step={0.5} value={scenario.returnDelta} onChange={(v) => setScenario({ returnDelta: v })} format={(v) => sign(v, ' pp')} />
          <div className="row" style={{ marginTop: 12 }}>
            <input placeholder="Job switch, recession, baby…" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
            <button className="btn primary" onClick={() => { saveScenario(name.trim()); setName(''); }}>Save scenario</button>
          </div>
        </Card>
        <Card title="Scenario vs baseline">
          <div className="grid g2">
            <Compare label="Monthly surplus" base={base.surplus} cur={cur.surplus} fmt={inr} higherIsBetter />
            <Compare label="SIP needed" base={base.totalSip} cur={cur.totalSip} fmt={inr} higherIsBetter={false} />
            <Compare label="Monthly gap" base={Math.max(base.gap, 0)} cur={Math.max(cur.gap, 0)} fmt={inr} higherIsBetter={false} />
            <Compare label="Health score" base={base.health.score} cur={cur.health.score} fmt={(v) => `${Math.round(v)}`} higherIsBetter />
          </div>
        </Card>
      </div>

      <div className="grid g2 mt">
        <Card title="Wealth projection" subtitle="Baseline vs this scenario">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={projection}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="year" tick={AXIS} />
              <YAxis tickFormatter={money} tick={AXIS} width={72} />
              <Tooltip formatter={money} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line dataKey="Baseline" stroke={COLORS.slate} strokeWidth={2} dot={false} />
              <Line dataKey="Scenario" stroke={COLORS.primary} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="SIP needed per goal">
          {perGoal.length ? <ResponsiveContainer width="100%" height={280}>
            <BarChart data={perGoal}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tickFormatter={money} tick={AXIS} width={64} />
              <Tooltip formatter={money} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Baseline" fill={COLORS.slate} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Scenario" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer> : <NextStep page="goals" action="Add a goal">Income and expense sliders already move the surplus. Goal SIPs appear here after you add one.</NextStep>}
        </Card>
      </div>

      <Card title="Saved scenarios" subtitle="Compare different futures side by side" className="mt">
        {savedPlans.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Income</th><th>Expenses</th><th>Inflation</th><th>Return</th><th>Surplus</th><th>Gap</th><th>Health</th><th /></tr></thead>
              <tbody>
                {savedPlans.map(({ s, plan }) => (
                  <tr key={s.id}>
                    <td><b>{s.name}</b></td>
                    <td>{sign(s.scenario.incomeChange, '%')}</td>
                    <td>{sign(s.scenario.expenseChange, '%')}</td>
                    <td>{sign(s.scenario.inflationDelta, ' pp')}</td>
                    <td>{sign(s.scenario.returnDelta, ' pp')}</td>
                    <td>{inr(plan.surplus)}</td>
                    <td className={plan.gap > 0 ? 'tone-red' : 'tone-green'}>{plan.gap > 0 ? inr(plan.gap) : 'None'}</td>
                    <td>{plan.health.score}</td>
                    <td className="row">
                      <button className="btn sm" onClick={() => loadScenario(s.id)}>Load</button>
                      <button className="btn sm danger" onClick={() => deleteScenario(s.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">Save a scenario above to compare it here.</p>}
      </Card>
    </>
  );
}
