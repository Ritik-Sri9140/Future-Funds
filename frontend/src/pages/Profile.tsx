import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, Metric } from '../components/ui/Card';
import { NumberField, TextField } from '../components/ui/Inputs';
import { AXIS, COLORS, GRID, PALETTE, money } from '../components/charts/theme';
import { useStore } from '../store/useStore';
import { usePlan } from '../hooks/usePlan';
import { EXPENSE_LABELS } from '../data/templates';
import { inr, pct } from '../utils/format';
import type { ExpenseKey } from '../types';

export default function Profile() {
  const p = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const setExpense = useStore((s) => s.setExpense);
  const plan = usePlan({ mc: false });

  const assets = [
    { name: 'Cash', value: p.cashSavings }, { name: 'Investments', value: p.investments }, { name: 'Gold', value: p.gold },
    { name: 'Real estate', value: p.realEstate }, { name: 'Other', value: p.otherAssets },
  ].filter((a) => a.value > 0);
  const balance = [
    { name: 'Assets', value: plan.totalAssets, fill: COLORS.green },
    { name: 'Liabilities', value: p.liabilities, fill: COLORS.red },
    { name: 'Net worth', value: plan.netWorth, fill: COLORS.primary },
  ];
  const emRatio = p.cashSavings / Math.max(plan.expenses + p.emis, 1);

  return (
    <div className="grid g3">
      <div className="span2" style={{ display: 'grid', gap: 16 }}>
        <Card title="About you">
          <div className="grid auto">
            <TextField label="Name" value={p.name} onChange={(v) => setProfile({ name: v })} placeholder="Your name" />
            <NumberField label="Age" value={p.age} onChange={(v) => setProfile({ age: Math.round(v) })} />
            <NumberField label="Retirement age" value={p.retirementAge} onChange={(v) => setProfile({ retirementAge: Math.round(v) })} />
          </div>
        </Card>
        <Card title="Monthly income">
          <div className="grid auto">
            <NumberField label="Take-home salary (₹)" value={p.monthlyIncome} step={1000} onChange={(v) => setProfile({ monthlyIncome: v })} />
            <NumberField label="Other income (₹)" value={p.otherIncome} step={1000} onChange={(v) => setProfile({ otherIncome: v })} />
          </div>
        </Card>
        <Card title="Monthly expenses" subtitle={`Total ${inr(Object.values(p.expenses).reduce((a, b) => a + b, 0))}`}>
          <div className="grid auto">
            {(Object.keys(EXPENSE_LABELS) as ExpenseKey[]).map((k) => (
              <NumberField key={k} label={`${EXPENSE_LABELS[k]} (₹)`} value={p.expenses[k]} step={500} onChange={(v) => setExpense(k, v)} />
            ))}
          </div>
        </Card>
        <Card title="Assets and loans">
          <div className="grid auto">
            <NumberField label="Cash and savings (₹)" value={p.cashSavings} step={10000} onChange={(v) => setProfile({ cashSavings: v })} />
            <NumberField label="Investments (₹)" value={p.investments} step={10000} onChange={(v) => setProfile({ investments: v })} />
            <NumberField label="Gold (₹)" value={p.gold} step={10000} onChange={(v) => setProfile({ gold: v })} />
            <NumberField label="Real estate (₹)" value={p.realEstate} step={100000} onChange={(v) => setProfile({ realEstate: v })} />
            <NumberField label="Other assets (₹)" value={p.otherAssets} step={10000} onChange={(v) => setProfile({ otherAssets: v })} />
            <NumberField label="Monthly EMIs (₹)" value={p.emis} step={500} onChange={(v) => setProfile({ emis: v })} />
            <NumberField label="Loans outstanding (₹)" value={p.liabilities} step={10000} onChange={(v) => setProfile({ liabilities: v })} />
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
        <Card>
          <div className="grid g2">
            <Metric label="Net worth" value={inr(plan.netWorth)} />
            <Metric label="Surplus" value={inr(plan.surplus)} tone={plan.surplus < 0 ? 'red' : 'green'} />
            <Metric label="Savings rate" value={pct(plan.savingsRate * 100)} />
            <Metric label="Emergency cover" value={`${emRatio.toFixed(1)} mo`} tone={emRatio >= 6 ? 'green' : 'amber'} />
          </div>
        </Card>
        <Card title="Balance sheet">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={balance}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} />
              <YAxis tickFormatter={money} tick={AXIS} width={64} />
              <Tooltip formatter={money} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>{balance.map((b) => <Cell key={b.name} fill={b.fill} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Asset mix">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={assets} dataKey="value" nameKey="name" outerRadius={80}>
                {assets.map((a, i) => <Cell key={a.name} fill={PALETTE[i]} />)}
              </Pie>
              <Tooltip formatter={money} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
