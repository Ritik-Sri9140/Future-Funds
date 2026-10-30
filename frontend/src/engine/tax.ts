import { EMERGENCY_MONTHS, SECTION_80C_CAP, TAX_PRODUCTS, type ProductId, type TaxBucket, type TaxProduct } from '../data/tax';
import type { Allocation, Assumptions, GoalCategory, GoalResult, TaxProfile } from '../types';

export interface TaxGoal {
  id: string;
  name: string;
  category: GoalCategory;
  years: number;
  rank: number;
  status: GoalResult['status'];
  allocation: Allocation;
}

export interface TaxSuggestion {
  id: ProductId;
  goalId: string;
  goalName: string;
  goalCategory: GoalCategory;
  lockIn: number;
  bucket: TaxBucket;
  amount: number;
  returnPct: number;
  /** `use` shares this year's room. `also` fits another goal but does not get a second pile of money. */
  kind: 'use' | 'also';
}

export type TaxBlock = 'regime' | 'room' | 'surplus' | 'emergency' | 'horizon' | null;

export interface TaxResult {
  financialYear: string;
  cap: number;
  used: number;
  room: number;
  monthsLeft: number;
  yearlySurplus: number;
  emergencyGap: number;
  affordable: number;
  taxApplies: boolean;
  illustrativeTax: number | null;
  suggestions: TaxSuggestion[];
  primaryGoal: { id: string; name: string; category: GoalCategory } | null;
  blocked: TaxBlock;
}

export interface TaxInput {
  tax: TaxProfile;
  monthlySurplus: number;
  monthlySpend: number;
  cashSavings: number;
  goals: TaxGoal[];
  assumptions: Assumptions;
}

/** Months from the current month through March, including this month. */
export function monthsLeftInFy(now = new Date()): number {
  const month = now.getMonth();
  if (month >= 3) return 15 - month;
  return 3 - month;
}

/** Indian financial year label, e.g. 2026-27. */
export function financialYear(now = new Date()): string {
  const year = now.getFullYear();
  const start = now.getMonth() >= 3 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export function usedOf(tax: TaxProfile): number {
  return Math.round(Object.entries(tax.contributions).reduce((sum, [key, value]) => {
    if (key === 'ssy' && !tax.hasEligibleChild) return sum;
    return sum + Math.max(0, Number(value) || 0);
  }, 0));
}

export function taxGoalsFromResults(goals: GoalResult[]): TaxGoal[] {
  return goals.map((g) => ({
    id: g.goal.id,
    name: g.goal.name,
    category: g.goal.category,
    years: g.years,
    rank: g.rank,
    status: g.status,
    allocation: g.allocation,
  }));
}

/** Split rupees by weight. The pieces are whole rupees and sum to `total`. */
export function splitAmount(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const floors = raw.map((n) => Math.floor(n));
  let left = Math.round(total) - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((n, i) => ({ i, frac: n - Math.floor(n) }));
  order.sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const item of order) {
    if (left <= 0) break;
    floors[item.i] += 1;
    left -= 1;
  }
  return floors;
}

function fits(product: TaxProduct, goal: TaxGoal, hasChild: boolean): boolean {
  if (goal.status === 'done' || goal.category === 'emergency') return false;
  if (product.needsChild && !hasChild) return false;
  if (product.category && goal.category !== product.category) return false;
  return goal.years >= product.lockIn;
}

function bestGoal(product: TaxProduct, goals: TaxGoal[], hasChild: boolean): TaxGoal | null {
  const matches = goals.filter((g) => fits(product, g, hasChild));
  matches.sort((a, b) => a.rank - b.rank);
  return matches[0] ?? null;
}

function productForBucket(bucket: TaxBucket, goal: TaxGoal, hasChild: boolean): TaxProduct | null {
  const options = TAX_PRODUCTS.filter((p) => p.bucket === bucket && fits(p, goal, hasChild));
  const ssy = options.find((p) => p.id === 'ssy');
  if (ssy) return ssy;
  options.sort((a, b) => b.lockIn - a.lockIn);
  return options[0] ?? null;
}

function returnFor(bucket: TaxBucket, assumptions: Assumptions): number {
  if (bucket === 'equity') return assumptions.equityReturn;
  if (bucket === 'fd') return assumptions.fdReturn;
  return assumptions.debtReturn;
}

function buildSuggestions(input: TaxInput, affordable: number): Pick<TaxResult, 'suggestions' | 'primaryGoal'> {
  const hasChild = input.tax.hasEligibleChild;
  const buckets: TaxBucket[] = ['equity', 'debt', 'fd'];
  const ranked = [...input.goals].sort((a, b) => a.rank - b.rank);
  const primary = ranked.find((goal) => buckets.some((bucket) => {
    const product = productForBucket(bucket, goal, hasChild);
    return product != null && goal.allocation[bucket] > 0;
  }));
  if (!primary) return { suggestions: [], primaryGoal: null };

  const chosen: { product: TaxProduct; weight: number }[] = [];
  for (const bucket of buckets) {
    const product = productForBucket(bucket, primary, hasChild);
    const weight = primary.allocation[bucket];
    if (!product || weight <= 0) continue;
    chosen.push({ product, weight });
  }
  if (!chosen.length) return { suggestions: [], primaryGoal: null };

  const amounts = splitAmount(affordable, chosen.map((item) => item.weight));
  const suggestions: TaxSuggestion[] = chosen.map((item, index) => ({
    id: item.product.id,
    goalId: primary.id,
    goalName: primary.name,
    goalCategory: primary.category,
    lockIn: item.product.lockIn,
    bucket: item.product.bucket,
    amount: amounts[index] ?? 0,
    returnPct: returnFor(item.product.bucket, input.assumptions),
    kind: 'use',
  }));

  const ssy = TAX_PRODUCTS.find((p) => p.id === 'ssy');
  if (ssy && !suggestions.some((s) => s.id === 'ssy')) {
    const goal = bestGoal(ssy, input.goals, hasChild);
    if (goal) {
      suggestions.push({
        id: 'ssy',
        goalId: goal.id,
        goalName: goal.name,
        goalCategory: goal.category,
        lockIn: ssy.lockIn,
        bucket: ssy.bucket,
        amount: 0,
        returnPct: returnFor('debt', input.assumptions),
        kind: 'also',
      });
    }
  }

  return {
    suggestions,
    primaryGoal: { id: primary.id, name: primary.name, category: primary.category },
  };
}

export function assessTax(input: TaxInput, now = new Date()): TaxResult {
  const used = usedOf(input.tax);
  const room = Math.max(0, SECTION_80C_CAP - used);
  const monthsLeft = monthsLeftInFy(now);
  const yearlySurplus = Math.round(Math.max(0, input.monthlySurplus) * monthsLeft);
  const emergencyGap = input.monthlySpend > 0
    ? Math.round(Math.max(0, input.monthlySpend * EMERGENCY_MONTHS - Math.max(0, input.cashSavings)))
    : 0;
  const affordable = Math.min(room, Math.max(0, yearlySurplus - emergencyGap));
  const taxApplies = input.tax.regime === 'old';
  const rate = input.tax.marginalRate;
  const illustrativeTax = taxApplies && (rate === 5 || rate === 20 || rate === 30)
    ? Math.round(affordable * rate / 100)
    : null;

  const built = buildSuggestions(input, affordable);
  let suggestions = taxApplies ? built.suggestions : built.suggestions.map((s) => ({ ...s, amount: 0 }));
  let primaryGoal = built.primaryGoal;

  let blocked: TaxBlock = null;
  if (!taxApplies) blocked = 'regime';
  else if (room <= 0) blocked = 'room';
  else if (yearlySurplus <= 0) blocked = 'surplus';
  else if (affordable <= 0) blocked = 'emergency';
  else if (!suggestions.some((s) => s.amount > 0)) blocked = 'horizon';

  if (taxApplies && blocked) {
    suggestions = [];
    primaryGoal = null;
  }

  return {
    financialYear: financialYear(now),
    cap: SECTION_80C_CAP,
    used,
    room,
    monthsLeft,
    yearlySurplus,
    emergencyGap,
    affordable,
    taxApplies,
    illustrativeTax,
    suggestions,
    primaryGoal,
    blocked,
  };
}
