import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card } from '../components/ui/Card';
import { Slider, Toggle } from '../components/ui/Inputs';
import { AXIS, COLORS, GRID, STATUS_META } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { NextStep } from '../components/ui/NextStep';
import { inr } from '../utils/format';

export default function Prioritizer() {
  const plan = usePlan({ mc: false });
  const weights = useStore((s) => s.weights);
  const setWeights = useStore((s) => s.setWeights);
  const breakdown = plan.goals.map((g) => ({ name: g.goal.name, Urgency: g.urgency, Necessity: g.necessity, Feasibility: g.feasibility }));
  const wf = (v: number) => `×${v}`;

  return (
    <>
      <div className="grid g2">
        <Card title="How much each factor matters" subtitle="Score = urgency^w × necessity^w × feasibility^w">
          <Slider label="Urgency weight" min={0} max={2} step={0.5} value={weights.urgency} onChange={(v) => setWeights({ urgency: v })} format={wf} />
          <Slider label="Necessity weight" min={0} max={2} step={0.5} value={weights.necessity} onChange={(v) => setWeights({ necessity: v })} format={wf} />
          <Slider label="Feasibility weight" min={0} max={2} step={0.5} value={weights.feasibility} onChange={(v) => setWeights({ feasibility: v })} format={wf} />
          <div style={{ marginTop: 12 }}>
            <Toggle label="Always fund essentials first (emergency fund, retirement)" checked={weights.essentialsFirst} onChange={(v) => setWeights({ essentialsFirst: v })} />
          </div>
        </Card>
        <Card title="Factor scores (1–5)">
          {breakdown.length ? <ResponsiveContainer width="100%" height={260}>
            <BarChart data={breakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis domain={[0, 5]} tick={AXIS} width={30} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Urgency" fill={COLORS.red} />
              <Bar dataKey="Necessity" fill={COLORS.primary} />
              <Bar dataKey="Feasibility" fill={COLORS.green} />
            </BarChart>
          </ResponsiveContainer> : <NextStep page="goals" action="Add a goal">Weights above are ready. Scores appear once a goal is on the plan.</NextStep>}
        </Card>
      </div>
      <Card title="Funding order" subtitle={`Your ${inr(plan.investable)}/mo surplus fills goals top to bottom`} className="mt">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Rank</th><th>Goal</th><th>Year</th><th>Score</th><th>SIP needed</th><th>Funded</th><th>Status</th><th>If unfunded</th></tr></thead>
            <tbody>
              {!plan.goals.length && <tr><td colSpan={8}><NextStep page="goals" action="Add a goal">The order is filled from your goals and monthly surplus.</NextStep></td></tr>}
              {plan.goals.map((g) => (
                <tr key={g.goal.id}>
                  <td><b>#{g.rank}</b></td>
                  <td>{g.goal.name}</td>
                  <td>{g.goal.targetYear}</td>
                  <td>{g.score.toFixed(1)}</td>
                  <td>{inr(g.sip)}</td>
                  <td>{inr(g.funded)}</td>
                  <td><Badge tone={STATUS_META[g.status].tone}>{STATUS_META[g.status].label}</Badge></td>
                  <td className="muted">{g.status === 'partial' || g.status === 'unfunded' ? 'Extend timeline, reduce target, or raise savings' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
