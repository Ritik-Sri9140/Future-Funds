import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, Metric } from '../components/ui/Card';
import ProgressRing from '../components/ui/ProgressRing';
import { AXIS, COLORS, GRID, PALETTE, STATUS_META, healthColor, healthTone } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { generateInsights } from '../engine/insights';
import { emptyTax } from '../data/tax';
import { assessTax, taxGoalsFromResults } from '../engine/tax';
import { GOAL_TEMPLATES } from '../data/templates';
import { NextStep } from '../components/ui/NextStep';
import { HEALTH_STRONG, suggestHealthActions } from '../engine/healthActions';
import { pct } from '../utils/format';
import { useI18n } from '../i18n/useI18n';
import type { ExpenseKey, Page } from '../types';

export default function Dashboard() {
  const plan = usePlan();
  const profile = useStore((s) => s.profile);
  const goals = useStore((s) => s.goals);
  const assumptions = useStore((s) => s.assumptions);
  const scenario = useStore((s) => s.scenario);
  const weights = useStore((s) => s.weights);
  const taxProfile = useStore((s) => s.tax) ?? emptyTax();
  const setPage = useStore((s) => s.setPage);
  const applyPatch = useStore((s) => s.applyPatch);
  const { t, tc, money, moneyTip, goalName, locale } = useI18n();
  const insights = useMemo(() => generateInsights(plan, profile), [plan, profile]);
  const healthActions = useMemo(
    () => suggestHealthActions({ profile, goals, assumptions, scenario, weights }, plan),
    [profile, goals, assumptions, scenario, weights, plan],
  );
  const retirement = plan.goals.find((g) => g.goal.category === 'retirement');
  const openLabel = (page: Page) => (page === 'profile' ? t('health.openProfile') : page === 'gap' ? t('health.openFixes') : page === 'goals' ? t('health.openGoals') : t('health.open'));

  const flow = [
    ...(Object.keys(profile.expenses) as ExpenseKey[]).filter((k) => profile.expenses[k] > 0)
      .map((k) => ({ id: k, name: t(`expense.${k}`), value: profile.expenses[k] })),
    ...(profile.emis > 0 ? [{ id: 'emis', name: t('expense.emis'), value: profile.emis }] : []),
    ...(plan.surplus > 0 ? [{ id: 'surplus', name: t('expense.surplus'), value: Math.round(plan.surplus) }] : []),
  ];
  const sipData = plan.goals.map((g) => ({ name: goalName(g.goal.name, g.goal.category), Needed: Math.round(g.sip), Funded: Math.round(g.funded) }));
  const tax = assessTax({
    tax: taxProfile,
    monthlySurplus: plan.surplus,
    monthlySpend: plan.expenses + plan.emis,
    cashSavings: profile.cashSavings,
    goals: taxGoalsFromResults(plan.goals),
    assumptions,
  });
  const sr = plan.savingsRate * 100;
  const hasProjection = plan.investable > 0 || plan.projection.some((p) => p.corpus > 0);
  const knownHealth = plan.health.parts.filter((p) => p.known);
  const axis = locale === 'en' ? 110 : 148;

  return (
    <>
      <div className="grid g4">
        <Card><Metric label={t('dashboard.netWorth')} value={money(plan.netWorth)} sub={t('dashboard.assets', { amount: plan.totalAssets })} tone={plan.netWorth < 0 ? 'red' : undefined} /></Card>
        <Card><Metric label={t('dashboard.surplus')} value={money(plan.surplus)} sub={t('dashboard.income', { amount: plan.income })} tone={plan.surplus < 0 ? 'red' : undefined} /></Card>
        <Card><Metric label={t('dashboard.savingsRate')} value={plan.income > 0 ? pct(sr) : '—'} sub={plan.income > 0 ? t('dashboard.aim30') : t('dashboard.addIncome')} tone={plan.income > 0 ? (sr >= 30 ? 'green' : sr >= 15 ? 'amber' : 'red') : undefined} /></Card>
        <Card>
          <div className="row spread">
            <Metric label={t('dashboard.health')} value={knownHealth.length ? `${plan.health.score}/100` : '—'} tone={knownHealth.length ? healthTone(plan.health.score) : undefined}
              sub={!knownHealth.length ? t('health.addData') : plan.health.score >= 70 ? t('health.strong') : plan.health.score >= 45 ? t('health.attention') : t('health.risk')} />
            {knownHealth.length > 0 && <ProgressRing pct={plan.health.score} color={healthColor(plan.health.score)} size={64} />}
          </div>
          {healthActions.length > 0 && (
            <button className="btn primary sm" style={{ marginTop: 12 }} onClick={() => document.getElementById('health-improve')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}>
              {t('health.improve')}
            </button>
          )}
        </Card>
      </div>

      <Card className="mt" title={t('tax.cardTitle')} actions={<button className="btn sm" onClick={() => setPage('tax')}>{t('tax.open')}</button>}>
        {tax.taxApplies ? (
          <>
            <p>{t('tax.cardRoom', { room: tax.room, cap: tax.cap, fy: tax.financialYear })}</p>
            {tax.affordable > 0 && tax.blocked !== 'horizon' && <p className="muted">{t('tax.cardFill', { amount: tax.affordable })}</p>}
            {tax.illustrativeTax != null && tax.illustrativeTax > 0 && <p className="muted">{t('tax.cardSaved', { amount: tax.illustrativeTax })}</p>}
            {tax.blocked === 'emergency' && <p className="muted">{t('tax.cardEmergency')}</p>}
            {tax.blocked === 'surplus' && <p className="muted">{t('tax.cardSurplus')}</p>}
            {tax.blocked === 'horizon' && <p className="muted">{t('tax.cardHorizon')}</p>}
          </>
        ) : (
          <p>{taxProfile.regime === 'new' ? t('tax.cardNew') : t('tax.cardUnsure')}</p>
        )}
      </Card>

      {healthActions.length > 0 && (
        <div id="health-improve" className="mt" style={{ scrollMarginTop: 12 }}>
          <Card
            title={t('health.improveTitle')}
            subtitle={healthActions.some((a) => a.patch)
              ? t('health.improveApply', { score: HEALTH_STRONG })
              : t('health.improveHint', { score: HEALTH_STRONG })}
          >
            {healthActions.map((action) => (
              <div key={action.id} className="list-item">
                {action.points > 0 && <Badge tone="green">+{action.points}</Badge>}
                <div style={{ flex: 1 }}>
                  <b>{tc(action.title)}</b>
                  <p className="muted">{tc(action.detail)}</p>
                </div>
                {action.patch && <button className="btn primary sm" onClick={() => applyPatch(action.patch!)}>{t('common.apply')}</button>}
                {action.page && <button className="btn sm" onClick={() => setPage(action.page!)}>{openLabel(action.page)}</button>}
              </div>
            ))}
          </Card>
        </div>
      )}

      <div className="grid g3 mt">
        <Card title={t('dashboard.projection')} subtitle={t('dashboard.projectionSub')} className="span2">
          {hasProjection ? <ResponsiveContainer width="100%" height={290}>
            <AreaChart data={plan.projection} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="year" tick={AXIS} />
              <YAxis tickFormatter={(v) => money(Number(v))} tick={AXIS} width={locale === 'en' ? 72 : 88} />
              <Tooltip formatter={moneyTip} labelFormatter={(l) => t('chart.year', { year: l })} />
              {plan.goals.filter((g) => g.goal.category !== 'retirement' && g.years > 0).map((g) => (
                <ReferenceLine key={g.goal.id} x={g.goal.targetYear} stroke={GOAL_TEMPLATES[g.goal.category].color} strokeDasharray="4 4" />
              ))}
              {retirement && (
                <ReferenceLine y={retirement.futureCost} stroke={COLORS.purple} strokeDasharray="6 3"
                  label={{ value: t('dashboard.retirementTarget'), position: 'insideTopLeft', fontSize: 11, fill: COLORS.purple }} />
              )}
              <Area type="monotone" dataKey="corpus" name={t('dashboard.corpus')} stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer> : <NextStep page="profile" action={t('dashboard.addFinances')}>{t('dashboard.addFinancesBody')}</NextStep>}
        </Card>
        <Card title={t('dashboard.flow')} subtitle={t('dashboard.monthly')}>
          {flow.length ? <ResponsiveContainer width="100%" height={290}>
            <PieChart>
              <Pie data={flow} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {flow.map((f, i) => <Cell key={f.id} fill={f.id === 'surplus' ? COLORS.green : PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip formatter={moneyTip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer> : <NextStep page="profile" action={t('dashboard.flowAction')}>{t('dashboard.flowEmpty')}</NextStep>}
        </Card>
      </div>

      <div className="grid g2 mt">
        <Card title={t('dashboard.goalProgress')} subtitle={t('dashboard.goalProgressSub')}
          actions={<button className="btn sm" onClick={() => setPage('goals')}>{t('dashboard.manageGoals')}</button>}>
          <div className="rings">
            {plan.goals.map((g) => (
              <div key={g.goal.id} className="ring-item">
                <ProgressRing pct={g.fundedPct} color={STATUS_META[g.status].color} />
                <div><b>{goalName(g.goal.name, g.goal.category)}</b><span>{t('dashboard.perMo', { year: g.goal.targetYear, sip: g.sip })}</span></div>
              </div>
            ))}
            {!plan.goals.length && <NextStep page="goals" action={t('dashboard.addGoal')}>{t('dashboard.goalEmpty')}</NextStep>}
          </div>
        </Card>
        <Card title={t('dashboard.sipChart')}>
          {sipData.length ? <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sipData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tickFormatter={(v) => money(Number(v))} tick={AXIS} width={locale === 'en' ? 64 : 80} />
              <Tooltip formatter={moneyTip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Needed" name={t('chart.needed')} fill={COLORS.slate} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Funded" name={t('chart.funded')} fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer> : <NextStep page="goals" action={t('dashboard.addGoal')}>{t('dashboard.sipEmpty')}</NextStep>}
        </Card>
      </div>

      <div className="grid g2 mt">
        <Card title={t('dashboard.insights')} subtitle={t('dashboard.insightsSub')}>
          {insights.map((s, i) => <div key={i} className="insight"><span className="dot" />{tc(s)}</div>)}
        </Card>
        <Card title={t('dashboard.healthBreak')}>
          {knownHealth.length ? <ResponsiveContainer width="100%" height={240}>
            <BarChart data={knownHealth.map((p) => ({ name: t(`health.${p.id}`), Score: Math.round(p.value), Max: p.max }))} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={AXIS} />
              <YAxis type="category" dataKey="name" tick={AXIS} width={axis} />
              <Tooltip />
              <Bar dataKey="Max" name={t('chart.max')} fill={COLORS.track} radius={[0, 4, 4, 0]} />
              <Bar dataKey="Score" name={t('chart.score')} fill={healthColor(plan.health.score)} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer> : <NextStep page="profile" action={t('dashboard.addFinances')}>{t('dashboard.healthEmpty')}</NextStep>}
          {knownHealth.length > 0 && plan.health.parts.some((p) => !p.known) && (
            <p className="muted" style={{ marginTop: 8 }}>{t('health.stillOpen', { names: plan.health.parts.filter((p) => !p.known).map((p) => t(`health.${p.id}`)).join(', ') })}</p>
          )}
        </Card>
      </div>
    </>
  );
}
