import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card } from '../components/ui/Card';
import { AXIS, COLORS, GRID, STATUS_META, TERM_TONE } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { CURRENT_YEAR } from '../engine/finance';
import { GOAL_TEMPLATES } from '../data/templates';
import { NextStep } from '../components/ui/NextStep';
import { useI18n } from '../i18n/useI18n';

export default function Timeline() {
  const plan = usePlan({ mc: false });
  const profile = useStore((s) => s.profile);
  const { t, money, moneyTip, goalName, locale } = useI18n();
  const retireYear = CURRENT_YEAR + Math.max(0, profile.retirementAge - profile.age);
  const end = Math.max(CURRENT_YEAR + 10, retireYear, ...plan.goals.map((g) => g.goal.targetYear));
  const W = 1000, H = 340, pad = 60, axisY = 170;
  const x = (y: number) => pad + ((y - CURRENT_YEAR) / Math.max(end - CURRENT_YEAR, 1)) * (W - 2 * pad);
  const ticks: number[] = [];
  for (let y = CURRENT_YEAR; y <= end; y += 5) ticks.push(y);
  const sorted = [...plan.goals].sort((a, b) => a.goal.targetYear - b.goal.targetYear);

  return (
    <>
      <Card title={t('timeline.road')} subtitle={t('timeline.roadSub')}>
        <svg viewBox={`0 0 ${W} ${H}`} className="timeline-svg" role="img" aria-label={t('timeline.aria')}>
          <line x1={pad} x2={W - pad} y1={axisY} y2={axisY} stroke="var(--timeline)" strokeWidth={3} />
          {ticks.map((year) => (
            <g key={year}>
              <line x1={x(year)} x2={x(year)} y1={axisY - 6} y2={axisY + 6} stroke="var(--timeline-tick)" />
              <text x={x(year)} y={H - 28} textAnchor="middle">{year}</text>
              <text x={x(year)} y={H - 12} textAnchor="middle" className="sub">{t('timeline.age', { age: profile.age + (year - CURRENT_YEAR) })}</text>
            </g>
          ))}
          <circle cx={x(CURRENT_YEAR)} cy={axisY} r={8} fill={COLORS.primary} />
          <text x={x(CURRENT_YEAR)} y={axisY + 28} textAnchor="middle" className="sub">{t('timeline.today')}</text>
          {retireYear <= end && (
            <g>
              <line x1={x(retireYear)} x2={x(retireYear)} y1={30} y2={axisY} stroke={COLORS.purple} strokeDasharray="4 4" />
              <text x={x(retireYear)} y={22} textAnchor="middle" fill={COLORS.purple}>{t('timeline.retire', { age: profile.retirementAge })}</text>
            </g>
          )}
          {sorted.map((g, i) => {
            const above = i % 2 === 0;
            const level = Math.floor(i / 2) % 3;
            const ly = above ? axisY - 44 - level * 34 : axisY + 52 + level * 30;
            const cx = x(g.goal.targetYear);
            const color = STATUS_META[g.status].color;
            const label = goalName(g.goal.name, g.goal.category);
            return (
              <g key={g.goal.id}>
                <line x1={cx} x2={cx} y1={axisY} y2={above ? ly + 18 : ly - 14} stroke={color} strokeDasharray="3 3" />
                <circle cx={cx} cy={axisY} r={7} fill={color} stroke="var(--marker-ring)" strokeWidth={2} />
                <text x={cx} y={ly} textAnchor="middle" fontWeight={600}>{label}</text>
                <text x={cx} y={ly + 14} textAnchor="middle" className="sub">{g.goal.targetYear} · {money(g.futureCost)}</text>
              </g>
            );
          })}
        </svg>
      </Card>

      <div className="grid g2 mt">
        <Card title={t('timeline.milestones')}>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('timeline.year')}</th><th>{t('timeline.goal')}</th><th>{t('timeline.ageCol')}</th><th>{t('timeline.futureCost')}</th><th>{t('timeline.status')}</th></tr></thead>
              <tbody>
                {!sorted.length && <tr><td colSpan={5}><NextStep page="goals" action={t('goals.add')}>{t('timeline.empty')}</NextStep></td></tr>}
                {sorted.map((g) => (
                  <tr key={g.goal.id}>
                    <td>{g.goal.targetYear}</td>
                    <td><span className="swatch" style={{ background: GOAL_TEMPLATES[g.goal.category].color, marginRight: 6 }} />{goalName(g.goal.name, g.goal.category)} <Badge tone={TERM_TONE[g.term]}>{t(`term.${g.term}`)}</Badge></td>
                    <td>{g.ageAtGoal}</td>
                    <td>{money(g.futureCost)}</td>
                    <td><Badge tone={STATUS_META[g.status].tone}>{t(`status.${g.status}`)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title={t('timeline.money')} subtitle={t('timeline.moneySub')}>
          {sorted.length ? <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sorted.map((g) => ({ name: `${g.goal.targetYear}`, label: goalName(g.goal.name, g.goal.category), cost: Math.round(g.futureCost), color: GOAL_TEMPLATES[g.goal.category].color }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} />
              <YAxis tickFormatter={(v) => money(Number(v))} tick={AXIS} width={locale === 'en' ? 64 : 80} />
              <Tooltip formatter={moneyTip} labelFormatter={(_, p) => (p?.[0]?.payload?.label ?? '')} />
              <Bar dataKey="cost" name={t('chart.futureCost')} radius={[4, 4, 0, 0]}>
                {sorted.map((g) => <Cell key={g.goal.id} fill={GOAL_TEMPLATES[g.goal.category].color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer> : <NextStep page="goals" action={t('goals.add')}>{t('timeline.emptyChart')}</NextStep>}
        </Card>
      </div>
    </>
  );
}
