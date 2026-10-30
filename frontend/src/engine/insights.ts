import type { Copy, Plan, Profile } from '../types';
import { copy, goalDisplay, renderCopy, type Locale } from '../i18n/translate';
import { fvSip } from './finance';

export type AdvisorIntent = 'house' | 'first' | 'gap' | 'emergency';

const INTENTS: { id: AdvisorIntent; re: RegExp }[] = [
  { id: 'emergency', re: /emergency|आपात|इमरजेंसी|అత్యవసర|அவசர|জরুরি|आणीबाणी|ತುರ್ತು|അടിയന്തര|કટોકટી|ଜରୁରୀ|ਐਮਰਜੈਂਸੀ/i },
  { id: 'first', re: /first|priorit|order|पहले|प्राथमिक|మొదట|ప్రాధాన్య|முதல்|முன்னுரிமை|আগে|অগ্রাধিকার|आधी|प्राधान्य|ಮೊದಲು|ಆದ್ಯತೆ|ആദ്യം|മുൻഗണന|પહેલા|પ્રાથમિકતા|ପ୍ରଥମେ|ପ୍ରାଥମିକତା|ਪਹਿਲਾਂ|ਤਰਜੀਹ/i },
  { id: 'gap', re: /gap|short|close|fix|कमी|अंतर|లోటు|இடைவெளி|குறை|ঘাটতি|तूट|ಕೊರತೆ|കുറവ്|ખોટ|ଘାଟ|ਘਾਟ/i },
];

export function detectIntent(question: string): AdvisorIntent | undefined {
  return INTENTS.find((item) => item.re.test(question))?.id;
}

export function generateInsights(plan: Plan, profile: Profile): Copy[] {
  const out: Copy[] = [];
  if (plan.goals.length) {
    out.push(copy('insight.goalsNeed', { count: plan.goals.length, sip: plan.totalSip, investable: plan.investable }));
    out.push(plan.gap > 0
      ? copy('insight.short', { gap: plan.gap })
      : copy('insight.spare', { spare: -plan.gap }));
    const top = plan.goals[0];
    out.push(copy('insight.top', { name: top.goal.name, category: top.goal.category, year: top.goal.targetYear, sip: top.sip }));
    const withP = plan.goals.filter((g) => !isNaN(g.successProb) && g.years > 0);
    if (withP.length) {
      const worst = withP.reduce((x, y) => (x.successProb < y.successProb ? x : y));
      out.push(copy('insight.odds', { name: worst.goal.name, category: worst.goal.category, pct: Math.round(worst.successProb * 100) }));
    }
    const big = plan.goals.reduce((x, y) => (y.futureCost / Math.max(y.goal.costToday, 1) > x.futureCost / Math.max(x.goal.costToday, 1) ? y : x));
    if (big.goal.costToday > 0)
      out.push(copy('insight.inflation', { name: big.goal.name, category: big.goal.category, today: big.goal.costToday, future: big.futureCost, year: big.goal.targetYear }));
  } else if (plan.income > 0 || plan.expenses + plan.emis > 0) {
    out.push(copy('insight.investableOnly', { investable: plan.investable }));
  } else {
    out.push(copy('insight.empty'));
  }
  if (plan.expenses + plan.emis > 0) {
    const em = profile.cashSavings / (plan.expenses + plan.emis);
    out.push(em < 6 ? copy('insight.cashShort', { months: em.toFixed(1) }) : copy('insight.cashOk', { months: em.toFixed(1) }));
  }
  if (plan.income > 0) {
    const sr = plan.savingsRate * 100;
    out.push(sr < 20 ? copy('insight.rateLow', { rate: sr.toFixed(0) }) : copy('insight.rateOk', { rate: sr.toFixed(0) }));
  }
  out.push(copy('insight.wait', { cost: fvSip(10000, 12, 360) - fvSip(10000, 12, 348) }));
  return out;
}

export function planSummary(plan: Plan, profile: Profile, locale: Locale = 'en') {
  return {
    profile: {
      age: profile.age, retirementAge: profile.retirementAge, monthlyIncome: Math.round(plan.income),
      monthlyExpenses: Math.round(plan.expenses), emis: plan.emis, monthlySurplus: Math.round(plan.surplus),
      netWorth: Math.round(plan.netWorth), savingsRatePct: Math.round(plan.savingsRate * 100), cashSavings: profile.cashSavings,
    },
    healthScore: plan.health.score,
    totalSipNeeded: Math.round(plan.totalSip),
    monthlyGap: Math.round(plan.gap),
    goals: plan.goals.map((g) => ({
      name: goalDisplay(g.goal.name, g.goal.category, locale), category: g.goal.category, costToday: g.goal.costToday, targetYear: g.goal.targetYear,
      years: g.years, inflationPct: g.inflation, futureCost: Math.round(g.futureCost), alreadySaved: g.goal.saved,
      expectedReturnPct: Number(g.expectedReturn.toFixed(2)), volatilityPct: Number(g.volatility.toFixed(2)),
      monthlySipNeeded: Math.round(g.sip), monthlyFunded: Math.round(g.funded), status: g.status, priorityRank: g.rank,
      successProbability: isNaN(g.successProb) ? null : Number(g.successProb.toFixed(2)),
    })),
    suggestedFixes: plan.fixes.map((f) => `${renderCopy(locale, f.title)}: ${renderCopy(locale, f.detail)}`),
  };
}

export function localAnswer(q: string, plan: Plan, profile: Profile, locale: Locale, intent?: AdvisorIntent): string {
  const kind = intent ?? detectIntent(q);
  if (kind === 'gap') {
    const lines = plan.fixes.map((f) => `• ${renderCopy(locale, f.title)}: ${renderCopy(locale, f.detail)}`);
    return lines.join('\n') || renderCopy(locale, copy('insight.noGap'));
  }
  if (kind === 'first') {
    return plan.goals.map((g) => renderCopy(locale, copy('insight.rankLine', {
      rank: g.rank,
      name: g.goal.name,
      category: g.goal.category,
      sip: g.sip,
      status: renderCopy(locale, copy(`status.${g.status}`)),
    }))).join('\n');
  }
  if (kind === 'emergency') {
    const spend = plan.expenses + plan.emis;
    return spend > 0
      ? renderCopy(locale, copy('insight.emergency', { target: 6 * spend, cash: profile.cashSavings }))
      : renderCopy(locale, copy('insight.emergencyNeedSpend', { cash: profile.cashSavings }));
  }
  return generateInsights(plan, profile).map((item) => `• ${renderCopy(locale, item)}`).join('\n');
}
