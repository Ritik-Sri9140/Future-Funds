import type { Assumptions, ExpenseKey, Fix, Goal, GoalCategory, GoalResult, Plan, Profile, Scenario, Weights } from '../types';
import { CURRENT_YEAR, allocationFor, bufferedReturn, clamp, futureCost, fvLump, fvSip, portfolioStats, requiredSip } from './finance';
import { simulateGoal } from './montecarlo';
import { computeHealth } from './health';
import { EXPENSE_LABELS } from '../data/templates';
import { inr } from '../utils/format';

export const ESSENTIALS: GoalCategory[] = ['emergency', 'retirement'];

export interface PlanInput {
  profile: Profile;
  goals: Goal[];
  assumptions: Assumptions;
  scenario: Scenario;
  weights: Weights;
  monteCarlo?: boolean;
}

interface Ctx { assumptions: Assumptions; scenario: Scenario }

export function evaluateGoal(goal: Goal, ctx: Ctx, o: { year?: number; cost?: number; stepUp?: number } = {}) {
  const year = o.year ?? goal.targetYear;
  const cost = o.cost ?? goal.costToday;
  const years = Math.max(year - CURRENT_YEAR, 0);
  const months = years * 12;
  const inflation = Math.max(goal.inflation + ctx.scenario.inflationDelta, 0);
  const allocation = allocationFor(years);
  const { ret, vol } = portfolioStats(allocation, ctx.assumptions, ctx.scenario.returnDelta);
  const fc = futureCost(cost, inflation, years);
  const sipRet = bufferedReturn(ret, vol, years);
  const savedFuture = fvLump(goal.saved, ret, months);
  const savedForSip = fvLump(goal.saved, sipRet, months);
  const need = Math.max(fc - savedForSip, 0);
  const sip = requiredSip(need, sipRet, months, o.stepUp ?? ctx.assumptions.sipStepUp);
  return { years, months, inflation, allocation, ret, vol, sipRet, futureCost: fc, savedFuture, savedForSip, sip };
}

export const urgencyFor = (y: number) => (y <= 1 ? 5 : y <= 3 ? 4 : y <= 7 ? 3 : y <= 15 ? 2 : 1);
const termFor = (y: number): GoalResult['term'] => (y <= 3 ? 'Short' : y <= 7 ? 'Medium' : 'Long');

export function buildPlan(input: PlanInput): Plan {
  const { profile: p, goals, assumptions: a, scenario: s, weights: w } = input;
  const ctx: Ctx = { assumptions: a, scenario: s };

  const income = (p.monthlyIncome + p.otherIncome) * (1 + s.incomeChange / 100);
  const baseExp = Object.values(p.expenses).reduce((x, y) => x + y, 0);
  const expenses = baseExp * (1 + s.expenseChange / 100);
  const surplus = income - expenses - p.emis;
  const investable = Math.max(surplus, 0);
  const totalAssets = p.cashSavings + p.investments + p.gold + p.realEstate + p.otherAssets;
  const netWorth = totalAssets - p.liabilities;
  const savingsRate = income > 0 ? surplus / income : 0;

  const scored = goals.map((g) => {
    const e = evaluateGoal(g, ctx);
    const urgency = urgencyFor(e.years);
    const necessity = clamp(Math.round(g.necessity), 1, 5);
    const feasibility = e.sip < 1 ? 5 : clamp(Math.round((5 * investable) / e.sip), 1, 5);
    const score = Math.pow(urgency, w.urgency) * Math.pow(necessity, w.necessity) * Math.pow(feasibility, w.feasibility);
    return { g, e, urgency, necessity, feasibility, score };
  });

  scored.sort((x, y) => {
    if (w.essentialsFirst) {
      const ex = ESSENTIALS.includes(x.g.category) ? 1 : 0;
      const ey = ESSENTIALS.includes(y.g.category) ? 1 : 0;
      if (ex !== ey) return ey - ex;
    }
    return y.score - x.score || x.e.years - y.e.years;
  });

  let left = investable;
  const results: GoalResult[] = scored.map((x, i) => {
    const funded = Math.min(x.e.sip, left);
    left -= funded;
    const fundedPct = x.e.sip < 1 ? 100 : (funded / x.e.sip) * 100;
    const status: GoalResult['status'] =
      x.e.sip < 1 ? 'done' : funded >= x.e.sip - 1 ? 'on-track' : funded > 0 ? 'partial' : 'unfunded';
    const successProb =
      input.monteCarlo === false
        ? NaN
        : simulateGoal({
            start: x.g.saved, monthly: funded, stepUp: a.sipStepUp, months: x.e.months,
            ret: x.e.ret, vol: x.e.vol, target: x.e.futureCost, runs: a.mcRuns, seed: 1000 + i,
          }).prob;
    return {
      goal: x.g, years: x.e.years, inflation: x.e.inflation, futureCost: x.e.futureCost, savedFuture: x.e.savedFuture,
      expectedReturn: x.e.ret, volatility: x.e.vol, allocation: x.e.allocation, sip: x.e.sip, funded, fundedPct, status,
      term: termFor(x.e.years), urgency: x.urgency, necessity: x.necessity, feasibility: x.feasibility, score: x.score,
      rank: i + 1, successProb, ageAtGoal: p.age + x.e.years,
    };
  });

  const totalSip = results.reduce((t, r) => t + r.sip, 0);
  const gap = totalSip - investable;
  const emergencyMonths = p.cashSavings / Math.max(expenses + p.emis, 1);
  const emiRatio = income > 0 ? p.emis / income : 1;
  const health = computeHealth({
    savingsRate, emergencyMonths, emiRatio, coverage: totalSip > 0 ? Math.min(1, investable / totalSip) : 1,
    hasIncome: income > 0, hasSpending: expenses + p.emis > 0, hasGoals: goals.length > 0,
  });

  const horizon = Math.min(50, Math.max(10, p.retirementAge - p.age, ...goals.map((g) => g.targetYear - CURRENT_YEAR)));
  const longStats = portfolioStats(allocationFor(8), a, s.returnDelta);
  let corpus = p.cashSavings + p.investments + p.gold;
  const projection = [{ year: CURRENT_YEAR, age: p.age, corpus: Math.round(corpus), outflow: 0 }];
  for (let y = 1; y <= horizon; y++) {
    corpus = corpus * (1 + longStats.ret / 100) + 12 * investable * Math.pow(1 + a.sipStepUp / 100, y - 1);
    const outflow = results
      .filter((r) => r.goal.category !== 'retirement' && r.goal.targetYear === CURRENT_YEAR + y)
      .reduce((t, r) => t + r.futureCost * Math.min(1, r.fundedPct / 100), 0);
    corpus = Math.max(0, corpus - outflow);
    projection.push({ year: CURRENT_YEAR + y, age: p.age + y, corpus: Math.round(corpus), outflow: Math.round(outflow) });
  }

  const plan: Plan = {
    income, expenses, emis: p.emis, surplus, investable, netWorth, totalAssets, savingsRate,
    goals: results, totalSip, gap, fixes: [], health, projection,
  };
  plan.fixes = computeFixes(plan, input, ctx, emergencyMonths, emiRatio);
  return plan;
}

function computeFixes(plan: Plan, input: PlanInput, ctx: Ctx, em: number, emiRatio: number): Fix[] {
  const { profile: p, scenario: s, assumptions: a } = input;
  const fixes: Fix[] = [];

  if (plan.surplus < 0)
    fixes.push({ id: 'neg', type: 'warning', title: 'You spend more than you earn',
      detail: `Expenses and EMIs exceed income by ${inr(-plan.surplus)}/mo. No goal can be funded until this is fixed.` });
  const monthlySpend = plan.expenses + plan.emis;
  if (monthlySpend > 0 && em < 6 && !input.goals.some((g) => g.category === 'emergency'))
    fixes.push({ id: 'em', type: 'info', title: 'Add an emergency fund goal',
      detail: `Your cash covers ${em.toFixed(1)} months. Target 6 months: ${inr(6 * monthlySpend)}.` });
  if (plan.income > 0 && emiRatio > 0.4)
    fixes.push({ id: 'emi', type: 'warning', title: 'EMIs are above 40% of income',
      detail: `EMIs take ${Math.round(emiRatio * 100)}% of income. Prepay the costliest loan before taking new debt.` });

  if (plan.gap > 0) {
    const eff = 1 + s.expenseChange / 100;
    const keys: ExpenseKey[] = ['lifestyle', 'other', 'food', 'transport'];
    const key = keys.reduce((m, k) => (p.expenses[k] > p.expenses[m] ? k : m), keys[0]);
    const val = p.expenses[key];
    if (val > 0 && eff > 0) {
      const cut = Math.min(plan.gap / eff, val * 0.4);
      fixes.push({ id: 'cut', type: 'cut', title: `Trim ${EXPENSE_LABELS[key].toLowerCase()} by ${inr(cut)}/mo`,
        detail: `Frees ${inr(cut * eff)}/mo, covering ${Math.round(((cut * eff) / plan.gap) * 100)}% of the gap.`,
        patch: { kind: 'expense', key, value: Math.round(val - cut) } });
    }

    if (a.sipStepUp < 10) {
      const newTotal = input.goals.reduce((t, g) => t + evaluateGoal(g, ctx, { stepUp: 10 }).sip, 0);
      const save = plan.totalSip - newTotal;
      if (save > 0)
        fixes.push({ id: 'stepup', type: 'stepup', title: 'Step up your SIPs 10% every year',
          detail: `Starting SIPs drop by ${inr(save)}/mo because contributions grow with your salary.`,
          patch: { kind: 'stepUp', value: 10 } });
    }

    const weakest = [...plan.goals].reverse().find((r) => r.status === 'partial' || r.status === 'unfunded');
    if (weakest) {
      const g = weakest.goal;
      const target = Math.max(0, weakest.sip - plan.gap);
      if (target > 0) {
        for (let k = 1; k <= 30; k++) {
          const e = evaluateGoal(g, ctx, { year: g.targetYear + k });
          if (e.sip <= target + 1) {
            fixes.push({ id: 'delay', type: 'delay', title: `Move ${g.name} to ${g.targetYear + k}`,
              detail: `Pushing your lowest-priority goal back ${k} year${k > 1 ? 's' : ''} cuts its SIP from ${inr(weakest.sip)} to ${inr(e.sip)}/mo.`,
              patch: { kind: 'goalYear', id: g.id, year: g.targetYear + k } });
            break;
          }
        }
      }
      if (target > 0) {
        const e0 = evaluateGoal(g, ctx);
        const rate = e0.sipRet;
        const needT = e0.months > 0 ? target * fvSip(1, rate, e0.months, a.sipStepUp) : target;
        const raw = (needT + e0.savedForSip) / Math.pow(1 + e0.inflation / 100, Math.max(e0.years, 0));
        const cost = Math.round(raw / 1000) * 1000;
        // A fitted cost of ₹0 means the gap is bigger than this goal. Shrinking it
        // to nothing is not a fix the user can apply.
        if (cost >= 1000 && cost < g.costToday - 1000)
          fixes.push({ id: 'reduce', type: 'reduce', title: `Reduce ${g.name} to ${inr(cost)}`,
            detail: `A smaller target (in today's money) fits your budget without touching other goals.`,
            patch: { kind: 'goalCost', id: g.id, cost } });
      }
    }
  } else if (plan.goals.length && -plan.gap > 1000) {
    fixes.push({ id: 'spare', type: 'info', title: `${inr(-plan.gap)}/mo is unallocated`,
      detail: 'Add it to retirement, build a bigger emergency buffer, or start a wealth-creation goal.' });
  }
  return fixes;
}
