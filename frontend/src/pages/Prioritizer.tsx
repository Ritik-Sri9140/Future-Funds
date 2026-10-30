import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card } from '../components/ui/Card';
import { Slider, Toggle } from '../components/ui/Inputs';
import { AXIS, COLORS, GRID, STATUS_META } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { NextStep } from '../components/ui/NextStep';
import { useI18n } from '../i18n/useI18n';

export default function Prioritizer() {
  const plan = usePlan({ mc: false });
  const weights = useStore((s) => s.weights);
  const setWeights = useStore((s) => s.setWeights);
  const { t, money, goalName } = useI18n();
  const breakdown = plan.goals.map((g) => ({ name: goalName(g.goal.name, g.goal.category), Urgency: g.urgency, Necessity: g.necessity, Feasibility: g.feasibility }));
  const wf = (v: number) => `×${v}`;

  return (
    <>
      <div className="grid g2">
        <Card title={t('prio.factors')} subtitle={t('prio.factorsSub')}>
          <Slider label={t('prio.urgency')} min={0} max={2} step={0.5} value={weights.urgency} onChange={(v) => setWeights({ urgency: v })} format={wf} />
          <Slider label={t('prio.necessity')} min={0} max={2} step={0.5} value={weights.necessity} onChange={(v) => setWeights({ necessity: v })} format={wf} />
          <Slider label={t('prio.feasibility')} min={0} max={2} step={0.5} value={weights.feasibility} onChange={(v) => setWeights({ feasibility: v })} format={wf} />
          <div style={{ marginTop: 12 }}>
            <Toggle label={t('prio.essentials')} checked={weights.essentialsFirst} onChange={(v) => setWeights({ essentialsFirst: v })} />
          </div>
        </Card>
        <Card title={t('prio.scores')}>
          {breakdown.length ? <ResponsiveContainer width="100%" height={260}>
            <BarChart data={breakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis domain={[0, 5]} tick={AXIS} width={30} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Urgency" name={t('chart.urgency')} fill={COLORS.red} />
              <Bar dataKey="Necessity" name={t('chart.necessity')} fill={COLORS.primary} />
              <Bar dataKey="Feasibility" name={t('chart.feasibility')} fill={COLORS.green} />
            </BarChart>
          </ResponsiveContainer> : <NextStep page="goals" action={t('goals.add')}>{t('prio.scoresEmpty')}</NextStep>}
        </Card>
      </div>
      <Card title={t('prio.order')} subtitle={t('prio.orderSub', { amount: plan.investable })} className="mt">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t('prio.rank')}</th><th>{t('prio.goal')}</th><th>{t('prio.year')}</th><th>{t('prio.score')}</th><th>{t('prio.sip')}</th><th>{t('prio.funded')}</th><th>{t('prio.status')}</th><th>{t('prio.ifUnfunded')}</th></tr></thead>
            <tbody>
              {!plan.goals.length && <tr><td colSpan={8}><NextStep page="goals" action={t('goals.add')}>{t('prio.empty')}</NextStep></td></tr>}
              {plan.goals.map((g) => (
                <tr key={g.goal.id}>
                  <td><b>#{g.rank}</b></td>
                  <td>{goalName(g.goal.name, g.goal.category)}</td>
                  <td>{g.goal.targetYear}</td>
                  <td>{g.score.toFixed(1)}</td>
                  <td>{money(g.sip)}</td>
                  <td>{money(g.funded)}</td>
                  <td><Badge tone={STATUS_META[g.status].tone}>{t(`status.${g.status}`)}</Badge></td>
                  <td className="muted">{g.status === 'partial' || g.status === 'unfunded' ? t('prio.unfundedHint') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
