import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card } from '../components/ui/Card';
import { AXIS, COLORS, GRID, STATUS_META, TERM_TONE, money } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { CURRENT_YEAR } from '../engine/finance';
import { GOAL_TEMPLATES } from '../data/templates';
import { NextStep } from '../components/ui/NextStep';
import { inr } from '../utils/format';

export default function Timeline() {
  const plan = usePlan({ mc: false });
  const profile = useStore((s) => s.profile);
  const retireYear = CURRENT_YEAR + Math.max(0, profile.retirementAge - profile.age);
  const end = Math.max(CURRENT_YEAR + 10, retireYear, ...plan.goals.map((g) => g.goal.targetYear));
  const W = 1000, H = 340, pad = 60, axisY = 170;
  const x = (y: number) => pad + ((y - CURRENT_YEAR) / Math.max(end - CURRENT_YEAR, 1)) * (W - 2 * pad);
  const ticks: number[] = [];
  for (let y = CURRENT_YEAR; y <= end; y += 5) ticks.push(y);
  const sorted = [...plan.goals].sort((a, b) => a.goal.targetYear - b.goal.targetYear);

  return (
    <>
      <Card title="Your life roadmap" subtitle="Each marker is a goal at its target year; colour shows funding status">
        <svg viewBox={`0 0 ${W} ${H}`} className="timeline-svg" role="img" aria-label="Life timeline of goals">
          <line x1={pad} x2={W - pad} y1={axisY} y2={axisY} stroke="#cbd5e1" strokeWidth={3} />
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={axisY - 6} y2={axisY + 6} stroke="#94a3b8" />
              <text x={x(t)} y={H - 28} textAnchor="middle">{t}</text>
              <text x={x(t)} y={H - 12} textAnchor="middle" className="sub">age {profile.age + (t - CURRENT_YEAR)}</text>
            </g>
          ))}
          <circle cx={x(CURRENT_YEAR)} cy={axisY} r={8} fill={COLORS.primary} />
          <text x={x(CURRENT_YEAR)} y={axisY + 28} textAnchor="middle" className="sub">Today</text>
          {retireYear <= end && (
            <g>
              <line x1={x(retireYear)} x2={x(retireYear)} y1={30} y2={axisY} stroke={COLORS.purple} strokeDasharray="4 4" />
              <text x={x(retireYear)} y={22} textAnchor="middle" fill={COLORS.purple}>Retire at {profile.retirementAge}</text>
            </g>
          )}
          {sorted.map((g, i) => {
            const above = i % 2 === 0;
            const level = Math.floor(i / 2) % 3;
            const ly = above ? axisY - 44 - level * 34 : axisY + 52 + level * 30;
            const cx = x(g.goal.targetYear);
            const color = STATUS_META[g.status].color;
            return (
              <g key={g.goal.id}>
                <line x1={cx} x2={cx} y1={axisY} y2={above ? ly + 18 : ly - 14} stroke={color} strokeDasharray="3 3" />
                <circle cx={cx} cy={axisY} r={7} fill={color} stroke="#fff" strokeWidth={2} />
                <text x={cx} y={ly} textAnchor="middle" fontWeight={600}>{g.goal.name}</text>
                <text x={cx} y={ly + 14} textAnchor="middle" className="sub">{g.goal.targetYear} · {inr(g.futureCost)}</text>
              </g>
            );
          })}
        </svg>
      </Card>

      <div className="grid g2 mt">
        <Card title="Milestones in order">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Year</th><th>Goal</th><th>Age</th><th>Future cost</th><th>Status</th></tr></thead>
              <tbody>
                {!sorted.length && <tr><td colSpan={5}><NextStep page="goals" action="Add a goal">Today and your retirement age are already on the road above.</NextStep></td></tr>}
                {sorted.map((g) => (
                  <tr key={g.goal.id}>
                    <td>{g.goal.targetYear}</td>
                    <td><span className="swatch" style={{ background: GOAL_TEMPLATES[g.goal.category].color, marginRight: 6 }} />{g.goal.name} <Badge tone={TERM_TONE[g.term]}>{g.term}</Badge></td>
                    <td>{g.ageAtGoal}</td>
                    <td>{inr(g.futureCost)}</td>
                    <td><Badge tone={STATUS_META[g.status].tone}>{STATUS_META[g.status].label}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Money needed by year" subtitle="Inflated cost at each milestone">
          {sorted.length ? <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sorted.map((g) => ({ name: `${g.goal.targetYear}`, label: g.goal.name, cost: Math.round(g.futureCost), color: GOAL_TEMPLATES[g.goal.category].color }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} />
              <YAxis tickFormatter={money} tick={AXIS} width={64} />
              <Tooltip formatter={money} labelFormatter={(_, p) => (p?.[0]?.payload?.label ?? '')} />
              <Bar dataKey="cost" name="Future cost" radius={[4, 4, 0, 0]}>
                {sorted.map((g) => <Cell key={g.goal.id} fill={GOAL_TEMPLATES[g.goal.category].color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer> : <NextStep page="goals" action="Add a goal">Each goal's inflated cost is charted here.</NextStep>}
        </Card>
      </div>
    </>
  );
}
