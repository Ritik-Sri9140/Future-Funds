import type { ExpenseKey, Page, Patch, Plan } from '../types';
import { EXPENSE_LABELS } from '../data/templates';
import { inr, pct } from '../utils/format';
import { buildPlan, type PlanInput } from './plan';
import { applyPatchTo } from './patch';

/** Below this, the dashboard offers ways to raise the score. */
export const HEALTH_STRONG = 70;

export interface HealthAction {
  id: string;
  title: string;
  detail: string;
  /** Estimated rise in the 0–100 score. Zero when the option opens a page instead of applying a change. */
  points: number;
  patch?: Patch;
  page?: Page;
}

interface Candidate {
  id: string;
  title: string;
  detail: string;
  patch: Patch;
  group: string;
}

const MIN_CHANGE = 100;

export function suggestHealthActions(input: PlanInput, plan: Plan): HealthAction[] {
  const known = plan.health.parts.filter((p) => p.known);
  if (!known.length || plan.health.score >= HEALTH_STRONG) return [];

  const candidates: Candidate[] = [];
  const savings = savingsCandidate(input, plan);
  if (savings) candidates.push(savings);
  const emergency = emergencyCandidate(input, plan);
  if (emergency) candidates.push(emergency);
  const debt = debtCandidate(input, plan);
  if (debt) candidates.push(debt);
  for (const fix of plan.fixes) {
    if (!fix.patch) continue;
    candidates.push({ id: `fix-${fix.id}`, title: fix.title, detail: fix.detail, patch: fix.patch, group: groupOf(fix.patch) });
  }

  const best = new Map<string, HealthAction & { group: string }>();
  for (const candidate of candidates) {
    const next = buildPlan({ ...input, ...applyPatchTo(input, candidate.patch), monteCarlo: false });
    const points = next.health.score - plan.health.score;
    if (points < 1) continue;
    const action = { id: candidate.id, title: candidate.title, detail: candidate.detail, points, patch: candidate.patch, group: candidate.group };
    const prev = best.get(candidate.group);
    if (!prev || points > prev.points) best.set(candidate.group, action);
  }

  const actions = [...best.values()]
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map(({ group: _group, ...action }) => action);
  if (actions.length) return actions;

  const fallback = fallbackAction(plan, input.goals.length > 0);
  return fallback ? [fallback] : [];
}

function groupOf(patch: Patch): string {
  if (patch.kind === 'expense') return `expense:${patch.key}`;
  if (patch.kind === 'goalYear') return `year:${patch.id}`;
  if (patch.kind === 'goalCost') return `cost:${patch.id}`;
  return patch.kind;
}

function savingsCandidate(input: PlanInput, plan: Plan): Candidate | null {
  if (plan.income <= 0 || plan.savingsRate >= 0.3) return null;
  const eff = 1 + input.scenario.expenseChange / 100;
  if (eff <= 0) return null;
  const need = 0.3 * plan.income - plan.surplus;
  if (need < MIN_CHANGE) return null;
  const keys: ExpenseKey[] = ['lifestyle', 'other', 'food', 'transport'];
  const key = keys.reduce((m, k) => (input.profile.expenses[k] > input.profile.expenses[m] ? k : m), keys[0]);
  const current = input.profile.expenses[key];
  if (current < MIN_CHANGE) return null;
  const cut = Math.min(need / eff, current * 0.4);
  const value = Math.round(current - cut);
  if (cut < MIN_CHANGE || value >= current) return null;
  const newRate = (plan.surplus + (current - value) * eff) / plan.income;
  return {
    id: 'savings',
    title: `Trim ${EXPENSE_LABELS[key].toLowerCase()} by ${inr(current - value)}/mo`,
    detail: `Savings rate moves from ${pct(plan.savingsRate * 100)} to ${pct(newRate * 100)}.`,
    patch: { kind: 'expense', key, value },
    group: `expense:${key}`,
  };
}

function emergencyCandidate(input: PlanInput, plan: Plan): Candidate | null {
  const spend = plan.expenses + plan.emis;
  if (spend <= 0 || input.profile.investments < MIN_CHANGE) return null;
  const shortfall = 6 * spend - input.profile.cashSavings;
  if (shortfall < MIN_CHANGE) return null;
  const amount = Math.round(Math.min(input.profile.investments, shortfall));
  if (amount < MIN_CHANGE) return null;
  const before = input.profile.cashSavings / spend;
  const after = (input.profile.cashSavings + amount) / spend;
  return {
    id: 'emergency',
    title: `Move ${inr(amount)} into emergency cash`,
    detail: `Cover goes from ${before.toFixed(1)} to ${after.toFixed(1)} months of spending. Net worth stays the same.`,
    patch: { kind: 'shiftToCash', amount },
    group: 'shiftToCash',
  };
}

function debtCandidate(input: PlanInput, plan: Plan): Candidate | null {
  const spend = plan.expenses + plan.emis;
  const buffer = spend > 0 ? 6 * spend : 0;
  const excess = input.profile.cashSavings - buffer;
  if (plan.income <= 0 || input.profile.emis <= 0 || input.profile.liabilities < MIN_CHANGE || excess < MIN_CHANGE) return null;
  const amount = Math.round(Math.min(input.profile.liabilities, excess));
  if (amount < MIN_CHANGE) return null;
  const left = input.profile.liabilities - amount;
  const newEmi = left < 1 ? 0 : Math.round(input.profile.emis * (left / input.profile.liabilities));
  return {
    id: 'debt',
    title: `Prepay ${inr(amount)} from spare cash`,
    detail: `EMIs fall from ${inr(input.profile.emis)} to ${inr(newEmi)}/mo. A 6-month cash buffer stays in place.`,
    patch: { kind: 'prepay', amount },
    group: 'prepay',
  };
}

function fallbackAction(plan: Plan, hasGoals: boolean): HealthAction | null {
  const weak = plan.health.parts.filter((p) => p.known && p.value < p.max - 0.5);
  if (!weak.length) return null;
  const worst = weak.reduce((a, b) => (a.value / a.max <= b.value / b.max ? a : b));
  if (worst.label === 'Savings rate') {
    return { id: 'goto-savings', title: 'Update income and spending', detail: 'Saving a larger share of income raises this part of the score.', points: 0, page: 'profile' };
  }
  if (worst.label === 'Emergency fund') {
    return { id: 'goto-cash', title: 'Add to cash savings', detail: 'This part fills up once cash covers 6 months of spending.', points: 0, page: 'profile' };
  }
  if (worst.label === 'Debt load') {
    return { id: 'goto-debt', title: 'Lower your EMIs', detail: 'This part falls once EMIs take more than 40% of income.', points: 0, page: 'profile' };
  }
  if (worst.label === 'Goal coverage') {
    return hasGoals
      ? { id: 'goto-gap', title: 'Close the monthly gap', detail: 'Funding more of the SIP each goal needs raises this part.', points: 0, page: 'gap' }
      : { id: 'goto-goals', title: 'Add a goal to fund', detail: 'A goal gives this part of the score something to measure.', points: 0, page: 'goals' };
  }
  return null;
}
