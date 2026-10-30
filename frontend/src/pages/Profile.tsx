import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, Metric } from '../components/ui/Card';
import { NumberField, TextField } from '../components/ui/Inputs';
import { AXIS, COLORS, GRID, PALETTE } from '../components/charts/theme';
import { useStore } from '../store/useStore';
import { usePlan } from '../hooks/usePlan';
import { EXPENSE_LABELS } from '../data/templates';
import { pct } from '../utils/format';
import { useI18n } from '../i18n/useI18n';
import type { ExpenseKey } from '../types';

export default function Profile() {
  const p = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const setExpense = useStore((s) => s.setExpense);
  const plan = usePlan({ mc: false });
  const { t, money, moneyTip } = useI18n();

  const assets = [
    { name: t('profile.cashName'), value: p.cashSavings }, { name: t('profile.investmentsName'), value: p.investments }, { name: t('profile.goldName'), value: p.gold },
    { name: t('profile.realEstateName'), value: p.realEstate }, { name: t('profile.otherName'), value: p.otherAssets },
  ].filter((a) => a.value > 0);
  const balance = [
    { id: 'assets', name: t('profile.assetsName'), value: plan.totalAssets, fill: COLORS.green },
    { id: 'liabilities', name: t('profile.liabilities'), value: p.liabilities, fill: COLORS.red },
    { id: 'net', name: t('profile.netWorth'), value: plan.netWorth, fill: COLORS.primary },
  ];
  const emRatio = p.cashSavings / Math.max(plan.expenses + p.emis, 1);

  return (
    <div className="grid g3">
      <div className="span2" style={{ display: 'grid', gap: 16 }}>
        <Card title={t('profile.about')}>
          <div className="grid auto">
            <TextField label={t('profile.name')} value={p.name} onChange={(v) => setProfile({ name: v })} placeholder={t('profile.namePh')} />
            <NumberField label={t('profile.age')} value={p.age} onChange={(v) => setProfile({ age: Math.round(v) })} />
            <NumberField label={t('profile.retireAge')} value={p.retirementAge} onChange={(v) => setProfile({ retirementAge: Math.round(v) })} />
          </div>
        </Card>
        <Card title={t('profile.income')}>
          <div className="grid auto">
            <NumberField label={t('profile.salary')} value={p.monthlyIncome} step={1000} onChange={(v) => setProfile({ monthlyIncome: v })} />
            <NumberField label={t('profile.otherIncome')} value={p.otherIncome} step={1000} onChange={(v) => setProfile({ otherIncome: v })} />
          </div>
        </Card>
        <Card title={t('profile.expenses')} subtitle={t('profile.expenseTotal', { amount: Object.values(p.expenses).reduce((a, b) => a + b, 0) })}>
          <div className="grid auto">
            {(Object.keys(EXPENSE_LABELS) as ExpenseKey[]).map((k) => (
              <NumberField key={k} label={`${t(`expense.${k}`)} (₹)`} value={p.expenses[k]} step={500} onChange={(v) => setExpense(k, v)} />
            ))}
          </div>
        </Card>
        <Card title={t('profile.assetsTitle')}>
          <div className="grid auto">
            <NumberField label={t('profile.cash')} value={p.cashSavings} step={10000} onChange={(v) => setProfile({ cashSavings: v })} />
            <NumberField label={t('profile.investments')} value={p.investments} step={10000} onChange={(v) => setProfile({ investments: v })} />
            <NumberField label={t('profile.gold')} value={p.gold} step={10000} onChange={(v) => setProfile({ gold: v })} />
            <NumberField label={t('profile.realEstate')} value={p.realEstate} step={100000} onChange={(v) => setProfile({ realEstate: v })} />
            <NumberField label={t('profile.otherAssets')} value={p.otherAssets} step={10000} onChange={(v) => setProfile({ otherAssets: v })} />
            <NumberField label={t('profile.emis')} value={p.emis} step={500} onChange={(v) => setProfile({ emis: v })} />
            <NumberField label={t('profile.loans')} value={p.liabilities} step={10000} onChange={(v) => setProfile({ liabilities: v })} />
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
        <Card>
          <div className="grid g2">
            <Metric label={t('profile.netWorth')} value={money(plan.netWorth)} />
            <Metric label={t('profile.surplus')} value={money(plan.surplus)} tone={plan.surplus < 0 ? 'red' : 'green'} />
            <Metric label={t('profile.savingsRate')} value={pct(plan.savingsRate * 100)} />
            <Metric label={t('profile.emergency')} value={t('profile.months', { n: emRatio.toFixed(1) })} tone={emRatio >= 6 ? 'green' : 'amber'} />
          </div>
        </Card>
        <Card title={t('profile.balance')}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={balance}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} />
              <YAxis tickFormatter={(v) => money(Number(v))} tick={AXIS} width={72} />
              <Tooltip formatter={moneyTip} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>{balance.map((b) => <Cell key={b.id} fill={b.fill} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title={t('profile.assetMix')}>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={assets} dataKey="value" nameKey="name" outerRadius={80}>
                {assets.map((a, i) => <Cell key={a.name} fill={PALETTE[i]} />)}
              </Pie>
              <Tooltip formatter={moneyTip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
