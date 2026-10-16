import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, Metric } from '../components/ui/Card';
import ProgressRing from '../components/ui/ProgressRing';
import { AXIS, COLORS, GRID, PALETTE, STATUS_META, healthColor, healthTone, money } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { generateInsights } from '../engine/insights';
import { EXPENSE_LABELS, GOAL_TEMPLATES } from '../data/templates';
import { NextStep } from '../components/ui/NextStep';
import { HEALTH_STRONG, suggestHealthActions } from '../engine/healthActions';
import { inr, pct } from '../utils/format';
import type { ExpenseKey, Page } from '../types';

function openLabel(page: Page): string {
  if (page === 'profile') return 'Open profile';
  if (page === 'gap') return 'Open fixes';
  if (page === 'goals') return 'Open goals';
  return 'Open';
}

export default function Dashboard() {
  const plan = usePlan();
  const profile = useStore((s) => s.profile);
  const goals = useStore((s) => s.goals);
  const assumptions = useStore((s) => s.assumptions);
  const scenario = useStore((s) => s.scenario);
  const weights = useStore((s) => s.weights);
  const setPage = useStore((s) => s.setPage);
  const applyPatch = useStore((s) => s.applyPatch);
  const insights = useMemo(() => generateInsights(plan, profile), [plan, profile]);
  const healthActions = useMemo(
    () => suggestHealthActions({ profile, goals, assumptions, scenario, weights }, plan),
    [profile, goals, assumptions, scenario, weights, plan],
  );
  const retirement = plan.goals.find((g) => g.goal.category === 'retirement');

  const flow = [
    ...(Object.keys(profile.expenses) as ExpenseKey[]).filter((k) => profile.expenses[k] > 0)
      .map((k) => ({ name: EXPENSE_LABELS[k], value: profile.expenses[k] })),
    ...(profile.emis > 0 ? [{ name: 'EMIs', value: profile.emis }] : []),
    ...(plan.surplus > 0 ? [{ name: 'Investable surplus', value: Math.round(plan.surplus) }] : []),
  ];
  const sipData = plan.goals.map((g) => ({ name: g.goal.name, Needed: Math.round(g.sip), Funded: Math.round(g.funded) }));
  const sr = plan.savingsRate * 100;
  const hasProjection = plan.investable > 0 || plan.projection.some((p) => p.corpus > 0);
  const knownHealth = plan.health.parts.filter((p) => p.known);

  return (
    <>
      <div className="grid g4">
        <Card><Metric label="Net worth" value={inr(plan.netWorth)} sub={`Assets ${inr(plan.totalAssets)}`} tone={plan.netWorth < 0 ? 'red' : undefined} /></Card>
        <Card><Metric label="Monthly surplus" value={inr(plan.surplus)} sub={`Income ${inr(plan.income)}`} tone={plan.surplus < 0 ? 'red' : undefined} /></Card>
        <Card><Metric label="Savings rate" value={plan.income > 0 ? pct(sr) : '—'} sub={plan.income > 0 ? 'Aim for 30% or more' : 'Add monthly income'} tone={plan.income > 0 ? (sr >= 30 ? 'green' : sr >= 15 ? 'amber' : 'red') : undefined} /></Card>
        <Card>
          <div className="row spread">
            <Metric label="Financial health" value={knownHealth.length ? `${plan.health.score}/100` : '—'} tone={knownHealth.length ? healthTone(plan.health.score) : undefined}
              sub={!knownHealth.length ? 'Add income or spending' : plan.health.score >= 70 ? 'Strong' : plan.health.score >= 45 ? 'Needs attention' : 'At risk'} />
            {knownHealth.length > 0 && <ProgressRing pct={plan.health.score} color={healthColor(plan.health.score)} size={64} />}
          </div>
          {healthActions.length > 0 && (
            <button className="btn primary sm" style={{ marginTop: 12 }} onClick={() => document.getElementById('health-improve')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}>
              Improve health
            </button>
          )}
        </Card>
      </div>

      {healthActions.length > 0 && (
        <div id="health-improve" className="mt" style={{ scrollMarginTop: 12 }}>
          <Card
            title="Improve your health"
            subtitle={healthActions.some((a) => a.patch)
              ? `Your score is below ${HEALTH_STRONG}. Apply one option and the plan recalculates.`
              : `Your score is below ${HEALTH_STRONG}. This is where you can raise it.`}
          >
            {healthActions.map((action) => (
              <div key={action.id} className="list-item">
                {action.points > 0 && <Badge tone="green">+{action.points}</Badge>}
                <div style={{ flex: 1 }}>
                  <b>{action.title}</b>
                  <p className="muted">{action.detail}</p>
                </div>
                {action.patch && <button className="btn primary sm" onClick={() => applyPatch(action.patch!)}>Apply</button>}
                {action.page && <button className="btn sm" onClick={() => setPage(action.page!)}>{openLabel(action.page)}</button>}
              </div>
            ))}
          </Card>
        </div>
      )}

      <div className="grid g3 mt">
        <Card title="Wealth projection" subtitle="Investable corpus after funded goal withdrawals" className="span2">
          {hasProjection ? <ResponsiveContainer width="100%" height={290}>
            <AreaChart data={plan.projection} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="year" tick={AXIS} />
              <YAxis tickFormatter={money} tick={AXIS} width={72} />
              <Tooltip formatter={money} labelFormatter={(l) => `Year ${l}`} />
              {plan.goals.filter((g) => g.goal.category !== 'retirement' && g.years > 0).map((g) => (
                <ReferenceLine key={g.goal.id} x={g.goal.targetYear} stroke={GOAL_TEMPLATES[g.goal.category].color} strokeDasharray="4 4" />
              ))}
              {retirement && (
                <ReferenceLine y={retirement.futureCost} stroke={COLORS.purple} strokeDasharray="6 3"
                  label={{ value: 'Retirement target', position: 'insideTopLeft', fontSize: 11, fill: COLORS.purple }} />
              )}
              <Area type="monotone" dataKey="corpus" name="Corpus" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer> : <NextStep page="profile" action="Add your finances">Add income, spending, or savings to plot a corpus.</NextStep>}
        </Card>
        <Card title="Where your money goes" subtitle="Monthly">
          {flow.length ? <ResponsiveContainer width="100%" height={290}>
            <PieChart>
              <Pie data={flow} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {flow.map((f, i) => <Cell key={f.name} fill={f.name === 'Investable surplus' ? COLORS.green : PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip formatter={money} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer> : <NextStep page="profile" action="Add income and spending">This chart uses your monthly income, expenses, and EMIs.</NextStep>}
        </Card>
      </div>

      <div className="grid g2 mt">
        <Card title="Goal progress" subtitle="Share of each goal's required SIP you can fund today"
          actions={<button className="btn sm" onClick={() => setPage('goals')}>Manage goals</button>}>
          <div className="rings">
            {plan.goals.map((g) => (
              <div key={g.goal.id} className="ring-item">
                <ProgressRing pct={g.fundedPct} color={STATUS_META[g.status].color} />
                <div><b>{g.goal.name}</b><span>{g.goal.targetYear} · {inr(g.sip)}/mo</span></div>
              </div>
            ))}
            {!plan.goals.length && <NextStep page="goals" action="Add a goal">Goal rings use the goals you add.</NextStep>}
          </div>
        </Card>
        <Card title="Monthly SIP: needed vs funded">
          {sipData.length ? <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sipData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tickFormatter={money} tick={AXIS} width={64} />
              <Tooltip formatter={money} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Needed" fill={COLORS.slate} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Funded" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer> : <NextStep page="goals" action="Add a goal">SIP bars appear once a goal is on the plan.</NextStep>}
        </Card>
      </div>

      <div className="grid g2 mt">
        <Card title="Automatic insights" subtitle="Updated every time your numbers change">
          {insights.map((s, i) => <div key={i} className="insight"><span className="dot" />{s}</div>)}
        </Card>
        <Card title="Health score breakdown">
          {knownHealth.length ? <ResponsiveContainer width="100%" height={240}>
            <BarChart data={knownHealth.map((p) => ({ name: p.label, Score: Math.round(p.value), Max: p.max }))} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={AXIS} />
              <YAxis type="category" dataKey="name" tick={AXIS} width={110} />
              <Tooltip />
              <Bar dataKey="Max" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Score" fill={healthColor(plan.health.score)} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer> : <NextStep page="profile" action="Add your finances">Health uses income, spending, and goals as you add them.</NextStep>}
          {knownHealth.length > 0 && plan.health.parts.some((p) => !p.known) && (
            <p className="muted" style={{ marginTop: 8 }}>Scored from the data you have. Still open: {plan.health.parts.filter((p) => !p.known).map((p) => p.label).join(', ')}.</p>
          )}
        </Card>
      </div>
    </>
  );
}
