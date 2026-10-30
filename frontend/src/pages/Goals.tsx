import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card } from '../components/ui/Card';
import { NumberField, SelectField } from '../components/ui/Inputs';
import { AXIS, COLORS, GRID, STATUS_META, TERM_TONE } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { GOAL_TEMPLATES } from '../data/templates';
import { CURRENT_YEAR, targetYearHasPassed } from '../engine/finance';
import { pct } from '../utils/format';
import { useI18n } from '../i18n/useI18n';
import type { CompletedGoal, GoalCategory, GoalResult, Goal } from '../types';

const CATS = Object.keys(GOAL_TEMPLATES) as GoalCategory[];

function GoalCard({ r }: { r: GoalResult }) {
  const { t, money, goalName } = useI18n();
  const updateGoal = useStore((s) => s.updateGoal);
  const removeGoal = useStore((s) => s.removeGoal);
  const completeGoal = useStore((s) => s.completeGoal);
  const template = GOAL_TEMPLATES[r.goal.category];
  const upd = (p: Partial<Goal>) => updateGoal(r.goal.id, p);
  const st = STATUS_META[r.status];
  const canDone = targetYearHasPassed(r.goal.targetYear);
  return (
    <div className="goal-card" style={{ ['--accent' as string]: template.color }}>
      <div className="row spread">
        <div className="row" style={{ flex: 1 }}>
          <span className="rank">#{r.rank}</span>
          <input value={r.goal.name === GOAL_TEMPLATES[r.goal.category].label ? goalName(r.goal.name, r.goal.category) : r.goal.name} onChange={(e) => upd({ name: e.target.value })} style={{ maxWidth: 260, fontWeight: 600 }} />
          <Badge tone={TERM_TONE[r.term]}>{t(`term.${r.term}`)}</Badge>
          <Badge tone={st.tone}>{t(`status.${r.status}`)}</Badge>
        </div>
        <button
          className="btn sm"
          disabled={!canDone}
          title={canDone ? t('goals.doneTitle') : t('goals.doneLocked', { year: r.goal.targetYear })}
          onClick={() => completeGoal(r.goal.id)}
        >{t('goals.markDone')}</button>
        <button className="btn sm danger" onClick={() => removeGoal(r.goal.id)}>{t('goals.delete')}</button>
      </div>
      {!canDone && <p className="muted" style={{ margin: '8px 0 0' }}>{t('goals.doneHint', { year: r.goal.targetYear })}</p>}
      <div className="grid auto" style={{ marginTop: 12 }}>
        <SelectField label={t('goals.category')} value={r.goal.category} options={CATS.map((c) => ({ value: c, label: t(`goal.${c}`) }))}
          onChange={(v) => upd({ category: v as GoalCategory })} />
        <NumberField label={t('goals.cost')} value={r.goal.costToday} step={10000} onChange={(v) => upd({ costToday: v })} />
        <NumberField label={t('goals.year')} value={r.goal.targetYear} min={CURRENT_YEAR} onChange={(v) => upd({ targetYear: Math.round(v) })} />
        <NumberField label={t('goals.inflation')} value={r.goal.inflation} step={0.5} onChange={(v) => upd({ inflation: v })} />
        <NumberField label={t('goals.saved')} value={r.goal.saved} step={10000} onChange={(v) => upd({ saved: v })} />
        <SelectField label={t('goals.necessity')} value={String(r.goal.necessity)}
          options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} · ${t(`necessity.${n}`)}` }))}
          onChange={(v) => upd({ necessity: Number(v) })} />
      </div>
      <div className="stats">
        <span>{t('goals.futureCost')} <b>{money(r.futureCost)}</b></span>
        <span>{t('goals.yearsLeft')} <b>{r.years}</b></span>
        <span>{t('goals.ageThen')} <b>{r.ageAtGoal}</b></span>
        <span>{t('goals.sipNeeded')} <b>{t('goals.perMo', { amount: r.sip })}</b></span>
        <span>{t('goals.funded')} <b>{t('goals.perMo', { amount: r.funded })}</b></span>
        <span>{t('goals.expectedReturn')} <b>{pct(r.expectedReturn, 1)}</b></span>
        <span>{t('goals.success')} <b>{isNaN(r.successProb) ? '—' : pct(r.successProb * 100)}</b></span>
      </div>
      <div className="bar"><div style={{ width: `${Math.min(100, r.fundedPct)}%`, background: template.color }} /></div>
      {t(`goal.hint.${r.goal.category}`) && <p className="muted" style={{ marginTop: 8 }}>{t(`goal.hint.${r.goal.category}`)}</p>}
    </div>
  );
}

function CompletedCard({ record }: { record: CompletedGoal }) {
  const { t, money, goalName, formatWhen } = useI18n();
  const template = GOAL_TEMPLATES[record.goal.category];
  const mix = [
    ['asset.equity', record.allocation.equity],
    ['asset.debt', record.allocation.debt],
    ['asset.gold', record.allocation.gold],
    ['asset.fd', record.allocation.fd],
  ].filter(([, share]) => Number(share) > 0).map(([name, share]) => `${t(String(name))} ${share}%`).join(' · ');
  return (
    <div className="goal-card" style={{ ['--accent' as string]: template.color }}>
      <div className="row spread">
        <div className="row" style={{ flex: 1 }}>
          <b>{goalName(record.goal.name, record.goal.category)}</b>
          <Badge tone="green">{t('goals.done')}</Badge>
          <Badge tone="gray">{t(`goal.${record.goal.category}`)}</Badge>
        </div>
        <span className="muted">{t('goals.markedDone', { date: formatWhen(record.completedAt, 'short') })}</span>
      </div>
      <div className="stats">
        <span>{t('goals.targetYear')} <b>{record.goal.targetYear}</b></span>
        <span>{t('goals.costToday')} <b>{money(record.goal.costToday)}</b></span>
        <span>{t('goals.futureCost')} <b>{money(record.futureCost)}</b></span>
        <span>{t('goals.saved')} <b>{money(record.goal.saved)}</b></span>
        <span>{t('goals.savedGrown')} <b>{money(record.savedFuture)}</b></span>
        <span>{t('goals.inflation')} <b>{pct(record.inflation, 1)}</b></span>
        <span>{t('goals.ageThen')} <b>{record.ageAtGoal}</b></span>
        <span>{t('goals.sipNeeded')} <b>{t('goals.perMo', { amount: record.sip })}</b></span>
        <span>{t('goals.funded')} <b>{t('goals.perMo', { amount: record.funded })}</b></span>
        <span>{t('goals.fundedShare')} <b>{pct(record.fundedPct)}</b></span>
        <span>{t('goals.expectedReturn')} <b>{pct(record.expectedReturn, 1)}</b></span>
        <span>{t('goals.success')} <b>{isNaN(record.successProb) ? '—' : pct(record.successProb * 100)}</b></span>
        <span>{t('goals.priorityThen')} <b>#{record.rank}</b></span>
        {mix && <span>{t('goals.mix')} <b>{mix}</b></span>}
      </div>
    </div>
  );
}

export default function Goals() {
  const plan = usePlan();
  const addGoal = useStore((s) => s.addGoal);
  const completedGoals = useStore((s) => s.completedGoals);
  const { t, money, moneyTip, goalName } = useI18n();
  const inflation = plan.goals.map((g) => ({ name: goalName(g.goal.name, g.goal.category), Today: g.goal.costToday, Future: Math.round(g.futureCost) }));

  return (
    <>
      <Card title={t('goals.add')} subtitle={t('goals.addSub')}>
        <div className="chips">
          {CATS.map((c) => (
            <button key={c} className="chip" onClick={() => addGoal(c)}>
              <span className="swatch" style={{ background: GOAL_TEMPLATES[c].color }} />+ {t(`goal.${c}`)}
            </button>
          ))}
        </div>
      </Card>
      <div className="grid g3 mt">
        <div className="span2">
          {plan.goals.map((r) => <GoalCard key={r.goal.id} r={r} />)}
          {!plan.goals.length && <Card><p className="muted">{t('goals.empty')}</p></Card>}
          <Card title={t('goals.completed')} subtitle={t('goals.completedSub')} className="mt">
            {completedGoals.map((record) => <CompletedCard key={record.id} record={record} />)}
            {!completedGoals.length && <p className="muted">{t('goals.completedEmpty')}</p>}
          </Card>
        </div>
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Card title={t('goals.inflationTitle')} subtitle={t('goals.inflationSub')}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inflation} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => money(Number(v))} tick={AXIS} />
                <YAxis type="category" dataKey="name" tick={AXIS} width={110} />
                <Tooltip formatter={moneyTip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Today" name={t('chart.today')} fill={COLORS.slate} />
                <Bar dataKey="Future" name={t('chart.atTarget')} fill={COLORS.red} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title={t('goals.totals')}>
            <div className="stats" style={{ marginTop: 0 }}>
              <span>{t('goals.count')} <b>{plan.goals.length}</b></span>
              <span>{t('goals.sipNeeded')} <b>{t('goals.perMo', { amount: plan.totalSip })}</b></span>
              <span>{t('goals.available')} <b>{t('goals.perMo', { amount: plan.investable })}</b></span>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
