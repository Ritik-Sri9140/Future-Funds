import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, Metric } from '../components/ui/Card';
import { Slider } from '../components/ui/Inputs';
import { AXIS, COLORS, GRID } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { fvSip } from '../engine/finance';
import { useI18n } from '../i18n/useI18n';

export default function Compounding() {
  const eq = useStore((s) => s.assumptions.equityReturn);
  const investable = usePlan({ mc: false }).investable;
  const { t, money, moneyTip, locale } = useI18n();
  const [amount, setAmount] = useState(investable >= 1000 ? Math.min(100000, Math.round(investable / 1000) * 1000) : 10000);
  const [rate, setRate] = useState(eq);
  const [years, setYears] = useState(30);
  const [delay, setDelay] = useState(10);
  const d = Math.min(delay, years - 1);

  const data = Array.from({ length: years + 1 }, (_, y) => ({
    year: y,
    now: Math.round(fvSip(amount, rate, y * 12)),
    late: y < d ? 0 : Math.round(fvSip(amount, rate, (y - d) * 12)),
    late2x: y < d ? 0 : Math.round(fvSip(2 * amount, rate, (y - d) * 12)),
  }));
  const now = fvSip(amount, rate, years * 12);
  const later = fvSip(amount, rate, (years - d) * 12);
  const catchUp = (amount * fvSip(1, rate, years * 12)) / fvSip(1, rate, (years - d) * 12);
  const invested = amount * 12 * years;
  const delayCost = Array.from({ length: 10 }, (_, i) => ({ delay: t('compound.delayYr', { n: i + 1 }), Lost: Math.round(now - fvSip(amount, rate, Math.max(0, years - i - 1) * 12)) }));
  const axisW = locale === 'en' ? 72 : 88;

  return (
    <>
      <div className="grid g2">
        <Card title={t('compound.inputs')}>
          <Slider label={t('compound.sip')} min={1000} max={100000} step={1000} value={amount} onChange={setAmount} format={money} />
          <Slider label={t('compound.return')} min={4} max={18} step={0.5} value={rate} onChange={setRate} format={(v) => `${v}%`} />
          <Slider label={t('compound.period')} min={5} max={40} value={years} onChange={setYears} format={(v) => t('unit.yrs', { n: v })} />
          <Slider label={t('compound.delay')} min={1} max={20} value={delay} onChange={setDelay} format={(v) => t('unit.yrs', { n: v })} />
        </Card>
        <Card>
          <div className="grid g2">
            <Metric label={t('compound.startNowYears', { years })} value={money(now)} tone="green" sub={t('compound.invested', { amount: invested })} />
            <Metric label={t('compound.startLate', { years: d })} value={money(later)} tone="red" sub={t('compound.lost', { amount: now - later })} />
            <Metric label={t('compound.catchUp')} value={t('goals.perMo', { amount: catchUp })} sub={t('compound.catchUpSub', { n: (catchUp / amount).toFixed(1) })} />
            <Metric label={t('compound.doubles')} value={t('unit.yrs', { n: (72 / rate).toFixed(1) })} sub={t('compound.rule72')} />
          </div>
        </Card>
      </div>
      <div className="grid g3 mt">
        <Card title={t('compound.beats')} className="span2">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="year" tick={AXIS} tickFormatter={(v) => t('compound.axisYear', { n: v })} />
              <YAxis tickFormatter={(v) => money(Number(v))} tick={AXIS} width={axisW} />
              <Tooltip formatter={moneyTip} labelFormatter={(l) => t('chart.year', { year: l })} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line dataKey="now" name={t('compound.startNow')} stroke={COLORS.green} strokeWidth={2.5} dot={false} />
              <Line dataKey="late" name={t('compound.startLateLine', { years: d })} stroke={COLORS.red} strokeWidth={2} dot={false} />
              <Line dataKey="late2x" name={t('compound.startLate2x', { years: d })} stroke={COLORS.amber} strokeWidth={2} strokeDasharray="5 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title={t('compound.waiting')}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={delayCost}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="delay" tick={AXIS} />
              <YAxis tickFormatter={(v) => money(Number(v))} tick={AXIS} width={locale === 'en' ? 64 : 80} />
              <Tooltip formatter={moneyTip} />
              <Bar dataKey="Lost" name={t('compound.lostName')} fill={COLORS.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}
