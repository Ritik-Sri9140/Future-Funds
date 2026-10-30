import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, Metric, type Tone } from '../components/ui/Card';
import { AXIS, COLORS, GRID } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { NextStep } from '../components/ui/NextStep';
import { pct } from '../utils/format';
import { useI18n } from '../i18n/useI18n';
import type { Fix } from '../types';

const TYPE_TONE: Record<Fix['type'], Tone> = {
  cut: 'blue', stepup: 'purple', delay: 'amber', reduce: 'amber', info: 'gray', warning: 'red',
};

export default function GapFix() {
  const plan = usePlan({ mc: false });
  const applyPatch = useStore((s) => s.applyPatch);
  const { t, tc, money, moneyTip, goalName, locale } = useI18n();
  const hasGoals = plan.goals.length > 0;
  const coverage = !hasGoals ? null : plan.totalSip > 0 ? Math.min(100, (plan.investable / plan.totalSip) * 100) : 100;
  const data = plan.goals.map((g) => ({ name: goalName(g.goal.name, g.goal.category), Funded: Math.round(g.funded), Shortfall: Math.round(Math.max(g.sip - g.funded, 0)) }));

  return (
    <>
      <div className="grid g4">
        <Card><Metric label={t('gap.sip')} value={money(plan.totalSip)} /></Card>
        <Card><Metric label={t('gap.available')} value={money(plan.investable)} /></Card>
        <Card><Metric label={t('gap.monthly')} value={!hasGoals ? '—' : plan.gap > 0 ? money(plan.gap) : t('common.none')} sub={!hasGoals ? t('gap.addGoal') : undefined} tone={!hasGoals ? undefined : plan.gap > 0 ? 'red' : 'green'} /></Card>
        <Card><Metric label={t('gap.coverage')} value={coverage == null ? '—' : pct(coverage)} sub={coverage == null ? t('gap.addGoal') : undefined} tone={coverage == null ? undefined : coverage >= 100 ? 'green' : coverage >= 70 ? 'amber' : 'red'} /></Card>
      </div>
      <div className="grid g2 mt">
        <Card title={t('gap.fixes')} subtitle={t('gap.fixesSub')}>
          {plan.fixes.length ? plan.fixes.map((f) => (
            <div key={f.id} className="list-item">
              <Badge tone={TYPE_TONE[f.type]}>{t(`fix.type.${f.type}`)}</Badge>
              <div style={{ flex: 1 }}>
                <b>{tc(f.title)}</b>
                <p className="muted">{tc(f.detail)}</p>
              </div>
              {f.patch && <button className="btn primary sm" onClick={() => applyPatch(f.patch!)}>{t('common.apply')}</button>}
            </div>
          )) : plan.goals.length ? <p className="muted">{t('gap.onTrack')}</p> : <NextStep page="goals" action={t('gap.addGoal')}>{t('gap.empty')}</NextStep>}
        </Card>
        <Card title={t('gap.byGoal')} subtitle={t('gap.byGoalSub')}>
          {data.length ? <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => money(Number(v))} tick={AXIS} />
              <YAxis type="category" dataKey="name" tick={AXIS} width={locale === 'en' ? 120 : 140} />
              <Tooltip formatter={moneyTip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Funded" name={t('chart.funded')} stackId="a" fill={COLORS.green} />
              <Bar dataKey="Shortfall" name={t('chart.shortfall')} stackId="a" fill={COLORS.red} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer> : <NextStep page="goals" action={t('gap.addGoal')}>{t('gap.emptyChart')}</NextStep>}
        </Card>
      </div>
    </>
  );
}
