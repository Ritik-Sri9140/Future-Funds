import type { Plan, Profile } from '../types';
import { fvSip } from './finance';
import { inr } from '../utils/format';

const STATUS: Record<string, string> = { 'on-track': 'on track', partial: 'partly funded', unfunded: 'not funded', done: 'fully saved' };

export function generateInsights(plan: Plan, profile: Profile): string[] {
  const out: string[] = [];
  if (plan.goals.length) {
    out.push(`Your ${plan.goals.length} goals need ${inr(plan.totalSip)}/mo in SIPs; you can invest ${inr(plan.investable)}/mo today.`);
    out.push(plan.gap > 0
      ? `You're short by ${inr(plan.gap)}/mo. Open Gap and fixes for one-click options.`
      : `Every goal is fully funded with ${inr(-plan.gap)}/mo to spare.`);
    const top = plan.goals[0];
    out.push(`Top priority: ${top.goal.name} (${top.goal.targetYear}), needing ${inr(top.sip)}/mo.`);
    const withP = plan.goals.filter((g) => !isNaN(g.successProb) && g.years > 0);
    if (withP.length) {
      const worst = withP.reduce((x, y) => (x.successProb < y.successProb ? x : y));
      out.push(`${worst.goal.name} has the lowest odds of success: ${Math.round(worst.successProb * 100)}% with current funding.`);
    }
    const big = plan.goals.reduce((x, y) => (y.futureCost / Math.max(y.goal.costToday, 1) > x.futureCost / Math.max(x.goal.costToday, 1) ? y : x));
    if (big.goal.costToday > 0)
      out.push(`Inflation turns ${big.goal.name}'s ${inr(big.goal.costToday)} into ${inr(big.futureCost)} by ${big.goal.targetYear}.`);
  } else if (plan.income > 0 || plan.expenses + plan.emis > 0) {
    out.push(`You can invest ${inr(plan.investable)}/mo. Add a goal to turn that surplus into a plan.`);
  } else {
    out.push('Add income and spending, or a goal, to get a personalised roadmap.');
  }
  if (plan.expenses + plan.emis > 0) {
    const em = profile.cashSavings / (plan.expenses + plan.emis);
    out.push(em < 6 ? `Your cash covers ${em.toFixed(1)} months of spending; aim for 6.` : `Your emergency cash covers ${em.toFixed(1)} months. Good cushion.`);
  }
  if (plan.income > 0) {
    const sr = plan.savingsRate * 100;
    out.push(sr < 20 ? `Savings rate is ${sr.toFixed(0)}%. Getting above 20% makes most plans work.` : `A savings rate of ${sr.toFixed(0)}% is healthy.`);
  }
  out.push(`Waiting one year on a ₹10,000/mo SIP at 12% costs about ${inr(fvSip(10000, 12, 360) - fvSip(10000, 12, 348))} over 30 years.`);
  return out;
}

export function planSummary(plan: Plan, profile: Profile) {
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
      name: g.goal.name, category: g.goal.category, costToday: g.goal.costToday, targetYear: g.goal.targetYear,
      years: g.years, inflationPct: g.inflation, futureCost: Math.round(g.futureCost), alreadySaved: g.goal.saved,
      expectedReturnPct: Number(g.expectedReturn.toFixed(2)), volatilityPct: Number(g.volatility.toFixed(2)),
      monthlySipNeeded: Math.round(g.sip), monthlyFunded: Math.round(g.funded), status: g.status, priorityRank: g.rank,
      successProbability: isNaN(g.successProb) ? null : Number(g.successProb.toFixed(2)),
    })),
    suggestedFixes: plan.fixes.map((f) => `${f.title}: ${f.detail}`),
  };
}

export function localAnswer(q: string, plan: Plan, profile: Profile): string {
  const t = q.toLowerCase();
  let body: string;
  if (/gap|short|close|fix/.test(t)) body = plan.fixes.map((f) => `• ${f.title}: ${f.detail}`).join('\n') || 'You have no gap right now.';
  else if (/first|priorit|order/.test(t)) body = plan.goals.map((g) => `${g.rank}. ${g.goal.name}: ${inr(g.sip)}/mo (${STATUS[g.status]})`).join('\n');
  else if (/emergency/.test(t)) {
    const spend = plan.expenses + plan.emis;
    body = spend > 0
      ? `A 6-month emergency fund for you is ${inr(6 * spend)}. You hold ${inr(profile.cashSavings)} in cash.`
      : `Add monthly expenses and EMIs to size a 6-month emergency fund. You hold ${inr(profile.cashSavings)} in cash.`;
  } else body = generateInsights(plan, profile).map((s) => `• ${s}`).join('\n');
  return body;
}
