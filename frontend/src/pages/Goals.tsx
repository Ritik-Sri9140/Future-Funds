import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card } from '../components/ui/Card';
import { NumberField, SelectField } from '../components/ui/Inputs';
import { AXIS, COLORS, GRID, STATUS_META, TERM_TONE, money } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { GOAL_TEMPLATES, NECESSITY_LABELS } from '../data/templates';
import { CURRENT_YEAR, targetYearHasPassed } from '../engine/finance';
import { inr, pct } from '../utils/format';
import type { CompletedGoal, GoalCategory, GoalResult, Goal } from '../types';

const CATS = Object.keys(GOAL_TEMPLATES) as GoalCategory[];

function doneOn(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function GoalCard({ r }: { r: GoalResult }) {
  const updateGoal = useStore((s) => s.updateGoal);
  const removeGoal = useStore((s) => s.removeGoal);
  const completeGoal = useStore((s) => s.completeGoal);
  const t = GOAL_TEMPLATES[r.goal.category];
  const upd = (p: Partial<Goal>) => updateGoal(r.goal.id, p);
  const st = STATUS_META[r.status];
  const canDone = targetYearHasPassed(r.goal.targetYear);
  return (
    <div className="goal-card" style={{ ['--accent' as string]: t.color }}>
      <div className="row spread">
        <div className="row" style={{ flex: 1 }}>
          <span className="rank">#{r.rank}</span>
          <input value={r.goal.name} onChange={(e) => upd({ name: e.target.value })} style={{ maxWidth: 260, fontWeight: 600 }} />
          <Badge tone={TERM_TONE[r.term]}>{r.term} term</Badge>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        <button
          className="btn sm"
          disabled={!canDone}
          title={canDone ? 'Save this goal to your completed history' : `Available after 31 Dec ${r.goal.targetYear}`}
          onClick={() => completeGoal(r.goal.id)}
        >Mark as done</button>
        <button className="btn sm danger" onClick={() => removeGoal(r.goal.id)}>Delete</button>
      </div>
      {!canDone && <p className="muted" style={{ margin: '8px 0 0' }}>Mark as done stays off until 31 Dec {r.goal.targetYear}.</p>}
      <div className="grid auto" style={{ marginTop: 12 }}>
        <SelectField label="Category" value={r.goal.category} options={CATS.map((c) => ({ value: c, label: GOAL_TEMPLATES[c].label }))}
          onChange={(v) => upd({ category: v as GoalCategory })} />
        <NumberField label="Cost today (₹)" value={r.goal.costToday} step={10000} onChange={(v) => upd({ costToday: v })} />
        <NumberField label="Target year" value={r.goal.targetYear} min={CURRENT_YEAR} onChange={(v) => upd({ targetYear: Math.round(v) })} />
        <NumberField label="Inflation % a year" value={r.goal.inflation} step={0.5} onChange={(v) => upd({ inflation: v })} />
        <NumberField label="Already saved (₹)" value={r.goal.saved} step={10000} onChange={(v) => upd({ saved: v })} />
        <SelectField label="Necessity" value={String(r.goal.necessity)}
          options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} · ${NECESSITY_LABELS[n]}` }))}
          onChange={(v) => upd({ necessity: Number(v) })} />
      </div>
      <div className="stats">
        <span>Future cost <b>{inr(r.futureCost)}</b></span>
        <span>Years left <b>{r.years}</b></span>
        <span>Age then <b>{r.ageAtGoal}</b></span>
        <span>SIP needed <b>{inr(r.sip)}/mo</b></span>
        <span>Funded <b>{inr(r.funded)}/mo</b></span>
        <span>Expected return <b>{pct(r.expectedReturn, 1)}</b></span>
        <span>Success odds <b>{isNaN(r.successProb) ? '—' : pct(r.successProb * 100)}</b></span>
      </div>
      <div className="bar"><div style={{ width: `${Math.min(100, r.fundedPct)}%`, background: t.color }} /></div>
      {t.hint && <p className="muted" style={{ marginTop: 8 }}>{t.hint}</p>}
    </div>
  );
}

function CompletedCard({ record }: { record: CompletedGoal }) {
  const t = GOAL_TEMPLATES[record.goal.category];
  const mix = [
    ['Equity', record.allocation.equity],
    ['Debt', record.allocation.debt],
    ['Gold', record.allocation.gold],
    ['FD', record.allocation.fd],
  ].filter(([, share]) => Number(share) > 0).map(([name, share]) => `${name} ${share}%`).join(' · ');
  return (
    <div className="goal-card" style={{ ['--accent' as string]: t.color }}>
      <div className="row spread">
        <div className="row" style={{ flex: 1 }}>
          <b>{record.goal.name}</b>
          <Badge tone="green">Done</Badge>
          <Badge tone="gray">{t.label}</Badge>
        </div>
        <span className="muted">Marked done {doneOn(record.completedAt)}</span>
      </div>
      <div className="stats">
        <span>Target year <b>{record.goal.targetYear}</b></span>
        <span>Cost today <b>{inr(record.goal.costToday)}</b></span>
        <span>Future cost <b>{inr(record.futureCost)}</b></span>
        <span>Already saved <b>{inr(record.goal.saved)}</b></span>
        <span>Saved grown <b>{inr(record.savedFuture)}</b></span>
        <span>Inflation <b>{pct(record.inflation, 1)}</b></span>
        <span>Age then <b>{record.ageAtGoal}</b></span>
        <span>SIP needed <b>{inr(record.sip)}/mo</b></span>
        <span>Funded <b>{inr(record.funded)}/mo</b></span>
        <span>Funded share <b>{pct(record.fundedPct)}</b></span>
        <span>Expected return <b>{pct(record.expectedReturn, 1)}</b></span>
        <span>Success odds <b>{isNaN(record.successProb) ? '—' : pct(record.successProb * 100)}</b></span>
        <span>Priority then <b>#{record.rank}</b></span>
        {mix && <span>Mix <b>{mix}</b></span>}
      </div>
    </div>
  );
}

export default function Goals() {
  const plan = usePlan();
  const addGoal = useStore((s) => s.addGoal);
  const completedGoals = useStore((s) => s.completedGoals);
  const inflation = plan.goals.map((g) => ({ name: g.goal.name, Today: g.goal.costToday, 'At target year': Math.round(g.futureCost) }));

  return (
    <>
      <Card title="Add a goal" subtitle="Start from a template, then adjust the numbers">
        <div className="chips">
          {CATS.map((c) => (
            <button key={c} className="chip" onClick={() => addGoal(c)}>
              <span className="swatch" style={{ background: GOAL_TEMPLATES[c].color }} />+ {GOAL_TEMPLATES[c].label}
            </button>
          ))}
        </div>
      </Card>
      <div className="grid g3 mt">
        <div className="span2">
          {plan.goals.map((r) => <GoalCard key={r.goal.id} r={r} />)}
          {!plan.goals.length && <Card><p className="muted">Pick a template above to add your first goal.</p></Card>}
          <Card title="Completed goals" subtitle="Kept after you mark a goal done, once its target year has ended" className="mt">
            {completedGoals.map((record) => <CompletedCard key={record.id} record={record} />)}
            {!completedGoals.length && <p className="muted">Nothing completed yet. Mark as done appears on a goal after 31 December of its target year, and the record stays here.</p>}
          </Card>
        </div>
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Card title="Inflation impact" subtitle="What each goal costs today vs at its deadline">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inflation} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tickFormatter={money} tick={AXIS} />
                <YAxis type="category" dataKey="name" tick={AXIS} width={110} />
                <Tooltip formatter={money} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Today" fill={COLORS.slate} />
                <Bar dataKey="At target year" fill={COLORS.red} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Totals">
            <div className="stats" style={{ marginTop: 0 }}>
              <span>Goals <b>{plan.goals.length}</b></span>
              <span>SIP needed <b>{inr(plan.totalSip)}/mo</b></span>
              <span>Available <b>{inr(plan.investable)}/mo</b></span>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
