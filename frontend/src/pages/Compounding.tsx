import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, Metric } from '../components/ui/Card';
import { Slider } from '../components/ui/Inputs';
import { AXIS, COLORS, GRID, money } from '../components/charts/theme';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { fvSip } from '../engine/finance';
import { inr } from '../utils/format';

export default function Compounding() {
  const eq = useStore((s) => s.assumptions.equityReturn);
  const investable = usePlan({ mc: false }).investable;
  const [amount, setAmount] = useState(investable >= 1000 ? Math.min(100000, Math.round(investable / 1000) * 1000) : 10000);
  const [rate, setRate] = useState(eq);
  const [years, setYears] = useState(30);
  const [delay, setDelay] = useState(10);
  const d = Math.min(delay, years - 1);

  const data = Array.from({ length: years + 1 }, (_, y) => ({
    year: y,
    'Start now': Math.round(fvSip(amount, rate, y * 12)),
    [`Start in ${d} yrs`]: y < d ? 0 : Math.round(fvSip(amount, rate, (y - d) * 12)),
    [`Start in ${d} yrs at 2x`]: y < d ? 0 : Math.round(fvSip(2 * amount, rate, (y - d) * 12)),
  }));
  const now = fvSip(amount, rate, years * 12);
  const later = fvSip(amount, rate, (years - d) * 12);
  const catchUp = (amount * fvSip(1, rate, years * 12)) / fvSip(1, rate, (years - d) * 12);
  const invested = amount * 12 * years;
  const delayCost = Array.from({ length: 10 }, (_, i) => ({ delay: `${i + 1} yr`, Lost: Math.round(now - fvSip(amount, rate, Math.max(0, years - i - 1) * 12)) }));

  return (
    <>
      <div className="grid g2">
        <Card title="Your inputs">
          <Slider label="Monthly SIP" min={1000} max={100000} step={1000} value={amount} onChange={setAmount} format={inr} />
          <Slider label="Expected return" min={4} max={18} step={0.5} value={rate} onChange={setRate} format={(v) => `${v}%`} />
          <Slider label="Investing period" min={5} max={40} value={years} onChange={setYears} format={(v) => `${v} yrs`} />
          <Slider label="Delay to compare" min={1} max={20} value={delay} onChange={setDelay} format={(v) => `${v} yrs`} />
        </Card>
        <Card>
          <div className="grid g2">
            <Metric label={`Start now, ${years} yrs`} value={inr(now)} tone="green" sub={`You invest ${inr(invested)}`} />
            <Metric label={`Start ${d} yrs late`} value={inr(later)} tone="red" sub={`Lost ${inr(now - later)}`} />
            <Metric label="SIP needed to catch up" value={`${inr(catchUp)}/mo`} sub={`${(catchUp / amount).toFixed(1)}x the amount`} />
            <Metric label="Money doubles every" value={`${(72 / rate).toFixed(1)} yrs`} sub="Rule of 72" />
          </div>
        </Card>
      </div>
      <div className="grid g3 mt">
        <Card title="Time beats amount" className="span2">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="year" tick={AXIS} tickFormatter={(v) => `Y${v}`} />
              <YAxis tickFormatter={money} tick={AXIS} width={72} />
              <Tooltip formatter={money} labelFormatter={(l) => `Year ${l}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line dataKey="Start now" stroke={COLORS.green} strokeWidth={2.5} dot={false} />
              <Line dataKey={`Start in ${d} yrs`} stroke={COLORS.red} strokeWidth={2} dot={false} />
              <Line dataKey={`Start in ${d} yrs at 2x`} stroke={COLORS.amber} strokeWidth={2} strokeDasharray="5 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="What each year of waiting costs">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={delayCost}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="delay" tick={AXIS} />
              <YAxis tickFormatter={money} tick={AXIS} width={64} />
              <Tooltip formatter={money} />
              <Bar dataKey="Lost" fill={COLORS.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}
