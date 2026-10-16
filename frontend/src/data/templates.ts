import type { Assumptions, ExpenseKey, Goal, GoalCategory, Profile, Scenario, Weights } from '../types';
import { CURRENT_YEAR } from '../engine/finance';
import { uid } from '../utils/format';

export const GOAL_TEMPLATES: Record<GoalCategory, {
  label: string; cost: number; years: number; inflation: number; necessity: number; color: string; hint: string;
}> = {
  emergency: { label: 'Emergency fund', cost: 300000, years: 1, inflation: 6, necessity: 5, color: '#ef4444', hint: '6 months of expenses + EMIs' },
  retirement: { label: 'Retirement', cost: 20000000, years: 33, inflation: 6, necessity: 5, color: '#8b5cf6', hint: "Corpus in today's money" },
  education: { label: 'Child education', cost: 2000000, years: 15, inflation: 10, necessity: 4, color: '#0ea5e9', hint: 'Education inflation runs near 10%' },
  house: { label: 'House down payment', cost: 2500000, years: 7, inflation: 7, necessity: 4, color: '#10b981', hint: 'Usually 20% of property price' },
  wedding: { label: 'Wedding', cost: 1500000, years: 4, inflation: 6, necessity: 3, color: '#ec4899', hint: '' },
  startup: { label: 'Start a business', cost: 1000000, years: 6, inflation: 6, necessity: 3, color: '#f59e0b', hint: '' },
  car: { label: 'Car', cost: 800000, years: 3, inflation: 5, necessity: 2, color: '#64748b', hint: '' },
  travel: { label: 'International trip', cost: 300000, years: 2, inflation: 6, necessity: 1, color: '#14b8a6', hint: '' },
  custom: { label: 'Custom goal', cost: 500000, years: 5, inflation: 6, necessity: 3, color: '#6366f1', hint: '' },
};

export const EXPENSE_LABELS: Record<ExpenseKey, string> = {
  housing: 'Rent / housing', food: 'Food and groceries', transport: 'Transport', utilities: 'Bills and utilities',
  education: 'Education', lifestyle: 'Lifestyle and shopping', other: 'Other',
};

export const NECESSITY_LABELS = ['', 'Nice to have', 'Want', 'Important', 'Very important', 'Essential'];

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  inflation: 6, equityReturn: 12, debtReturn: 7, fdReturn: 6.5, goldReturn: 8,
  equityVol: 18, debtVol: 4, goldVol: 14, sipStepUp: 0, mcRuns: 300,
};

export const DEFAULT_SCENARIO: Scenario = { incomeChange: 0, expenseChange: 0, inflationDelta: 0, returnDelta: 0 };
export const DEFAULT_WEIGHTS: Weights = { urgency: 1, necessity: 1, feasibility: 1, essentialsFirst: true };

export const SAMPLE_PROFILE: Profile = {
  name: 'Guest', age: 27, retirementAge: 60, monthlyIncome: 120000, otherIncome: 0,
  expenses: { housing: 20000, food: 12000, transport: 5000, utilities: 4000, education: 0, lifestyle: 10000, other: 4000 },
  emis: 15000, cashSavings: 300000, investments: 500000, gold: 100000, realEstate: 0, otherAssets: 0, liabilities: 800000,
};

export const EMPTY_PROFILE: Profile = {
  name: '', age: 25, retirementAge: 60, monthlyIncome: 0, otherIncome: 0,
  expenses: { housing: 0, food: 0, transport: 0, utilities: 0, education: 0, lifestyle: 0, other: 0 },
  emis: 0, cashSavings: 0, investments: 0, gold: 0, realEstate: 0, otherAssets: 0, liabilities: 0,
};

export function monthlySpend(p: Profile): number {
  return Object.values(p.expenses).reduce((sum, value) => sum + value, 0) + p.emis;
}

/** Starting numbers for a new goal, taken from the profile when those fields exist. */
export function goalDefaults(cat: GoalCategory, profile: Profile, assumptions: Assumptions): Partial<Goal> {
  const spend = monthlySpend(profile);
  if (cat === 'emergency') {
    return spend > 0 ? { costToday: Math.round(spend * 6), targetYear: CURRENT_YEAR + 1 } : { targetYear: CURRENT_YEAR + 1 };
  }
  if (cat === 'retirement') {
    const years = Math.max(1, profile.retirementAge - profile.age);
    const patch: Partial<Goal> = { targetYear: CURRENT_YEAR + years };
    if (spend > 0) patch.costToday = Math.round(spend * 12 * 25);
    return patch;
  }
  if (cat === 'custom') return { inflation: assumptions.inflation };
  return {};
}

export function makeGoal(cat: GoalCategory, o: Partial<Goal> = {}): Goal {
  const t = GOAL_TEMPLATES[cat];
  return {
    id: uid(), category: cat, name: t.label, costToday: t.cost, targetYear: CURRENT_YEAR + t.years,
    inflation: t.inflation, saved: 0, necessity: t.necessity, ...o,
  };
}

export function sampleGoals(p: Profile): Goal[] {
  return [
    makeGoal('emergency', { targetYear: CURRENT_YEAR + 1, saved: 200000 }),
    makeGoal('wedding', { targetYear: CURRENT_YEAR + 4 }),
    makeGoal('house', { targetYear: CURRENT_YEAR + 7, saved: 300000 }),
    makeGoal('education', { targetYear: CURRENT_YEAR + 16 }),
    makeGoal('retirement', { targetYear: CURRENT_YEAR + (p.retirementAge - p.age) }),
  ];
}
