import { Card, Metric } from '../components/ui/Card';
import { NumberField, Toggle } from '../components/ui/Inputs';
import { CONTRIBUTION_KEYS, emptyTax } from '../data/tax';
import { assessTax, taxGoalsFromResults } from '../engine/tax';
import { usePlan } from '../hooks/usePlan';
import { useI18n } from '../i18n/useI18n';
import { useStore } from '../store/useStore';
import type { ContributionKey, MarginalRate, TaxRegime } from '../types';
import { pct } from '../utils/format';

const FIELDS = CONTRIBUTION_KEYS.filter((key) => key !== 'ssy');
const REGIMES: TaxRegime[] = ['old', 'new', 'unsure'];
const RATES: MarginalRate[] = [0, 5, 20, 30];

export default function Tax() {
  const tax = useStore((s) => s.tax) ?? emptyTax();
  const setTax = useStore((s) => s.setTax);
  const setContribution = useStore((s) => s.setContribution);
  const assumptions = useStore((s) => s.assumptions);
  const cashSavings = useStore((s) => s.profile.cashSavings);
  const plan = usePlan({ mc: false });
  const { t, money, goalName } = useI18n();
  const result = assessTax({
    tax,
    monthlySurplus: plan.surplus,
    monthlySpend: plan.expenses + plan.emis,
    cashSavings,
    goals: taxGoalsFromResults(plan.goals),
    assumptions,
  });
  const goalLabel = result.primaryGoal ? goalName(result.primaryGoal.name, result.primaryGoal.category) : '';
  const hasAlso = result.suggestions.some((s) => s.kind === 'also');

  return (
    <div className="grid g3">
      <div className="span2" style={{ display: 'grid', gap: 16 }}>
        <Card title={t('tax.howTitle')}>
          <ol className="tax-steps">
            <li>{t('tax.how1')}</li>
            <li>{t('tax.how2', { cap: result.cap, fy: result.financialYear })}</li>
            <li>{t('tax.how3')}</li>
            <li>{t('tax.how4')}</li>
          </ol>
          <p className="muted" style={{ marginTop: 12 }}>{t('tax.capNote', { cap: result.cap })}</p>
        </Card>

        <Card title={t('tax.regime')} subtitle={t('tax.regimeHelp')}>
          <div className="chips" role="radiogroup" aria-label={t('tax.regime')}>
            {REGIMES.map((id) => (
              <button key={id} type="button" className={`chip ${tax.regime === id ? 'active' : ''}`} aria-pressed={tax.regime === id} onClick={() => setTax({ regime: id })}>
                {t(`tax.regime.${id}`)}
              </button>
            ))}
          </div>
        </Card>

        <Card title={t('tax.contributions')} subtitle={t('tax.contributionsSub', { fy: result.financialYear })}>
          <Toggle label={t('tax.child')} checked={tax.hasEligibleChild} onChange={(v) => setTax({ hasEligibleChild: v })} />
          <div className="grid auto" style={{ marginTop: 12 }}>
            {FIELDS.map((key) => (
              <NumberField key={key} label={t(`tax.field.${key}`)} value={tax.contributions[key]} step={1000} onChange={(v) => setContribution(key, v)} />
            ))}
            {tax.hasEligibleChild && (
              <NumberField label={t('tax.field.ssy')} value={tax.contributions.ssy} step={1000} onChange={(v) => setContribution('ssy', v)} />
            )}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
        {!result.taxApplies && (
          <Card title={t('tax.notApplicableTitle')}>
            <p>{tax.regime === 'new' ? t('tax.notApplicable') : t('tax.unsure')}</p>
          </Card>
        )}

        <Card>
          <div className="grid g2">
            <Metric label={t('tax.used')} value={money(result.used)} sub={t('tax.months', { n: result.monthsLeft, fy: result.financialYear })} />
            <Metric label={t('tax.room')} value={money(result.room)} sub={t('tax.roomSub', { fy: result.financialYear, cap: result.cap })} />
            {result.taxApplies && (
              <Metric label={t('tax.affordable')} value={money(result.affordable)} sub={t('tax.affordableSub')} tone={result.affordable > 0 ? 'green' : 'amber'} />
            )}
            {result.taxApplies && (
              <Metric label={t('tax.taxSaved')} value={result.illustrativeTax == null ? '—' : money(result.illustrativeTax)} sub={t('tax.taxSavedSub')} />
            )}
          </div>

          {result.taxApplies && (
            <div style={{ marginTop: 16 }}>
              <p className="muted" style={{ marginBottom: 8 }}>{t('tax.rate')}</p>
              <div className="chips" role="radiogroup" aria-label={t('tax.rate')}>
                {RATES.map((rate) => (
                  <button key={rate} type="button" className={`chip ${tax.marginalRate === rate ? 'active' : ''}`} aria-pressed={tax.marginalRate === rate} onClick={() => setTax({ marginalRate: rate })}>
                    {rate === 0 ? t('tax.rateNone') : `${rate}%`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {result.taxApplies && result.blocked === 'room' && <p style={{ marginTop: 12 }}>{t('tax.full', { cap: result.cap, fy: result.financialYear })}</p>}
          {result.taxApplies && result.blocked === 'surplus' && <p style={{ marginTop: 12 }}>{t('tax.noSurplus')}</p>}
          {result.taxApplies && result.blocked === 'emergency' && <p style={{ marginTop: 12 }}>{t('tax.emergency', { gap: result.emergencyGap })}</p>}
          {result.taxApplies && result.blocked === 'horizon' && <p style={{ marginTop: 12 }}>{t('tax.noGoalFit', { room: result.room })}</p>}
          {result.taxApplies && result.blocked == null && result.emergencyGap > 0 && (
            <p className="muted" style={{ marginTop: 12 }}>{t('tax.cashFirst', { gap: result.emergencyGap })}</p>
          )}
          {!result.taxApplies && result.suggestions.length === 0 && <p className="muted" style={{ marginTop: 12 }}>{t('tax.none')}</p>}
        </Card>

        {result.suggestions.length > 0 && (
          <Card
            title={result.taxApplies ? t('tax.suggest') : t('tax.suggestInvest')}
            subtitle={result.taxApplies
              ? (hasAlso ? t('tax.suggestSub', { amount: result.affordable, goal: goalLabel }) : t('tax.suggestOnly', { amount: result.affordable, goal: goalLabel }))
              : t('tax.suggestInvestSub')}
          >
            {result.suggestions.map((item) => (
              <div key={item.id} className="list-item">
                <div style={{ flex: 1 }}>
                  <b>{t(`tax.product.${item.id}`)}</b>
                  <p className="muted">{t(`tax.product.${item.id}Note`)}</p>
                  <p className="muted">
                    {t('tax.forGoal', { goal: goalName(item.goalName, item.goalCategory) })}
                    {' · '}
                    {t('tax.lockIn', { n: item.lockIn })}
                    {' · '}
                    {t('tax.return', { pct: pct(item.returnPct, 1) })}
                  </p>
                  {result.taxApplies && item.kind === 'also' && <p className="muted">{t('tax.samePool')}</p>}
                </div>
                {result.taxApplies && item.kind === 'use' && <b>{money(item.amount)}</b>}
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
