import { DEFAULT_ASSUMPTIONS } from '../data/templates';
import { assessTax, financialYear, monthsLeftInFy, splitAmount, type TaxGoal } from './tax';
import { emptyTax } from '../data/tax';
import type { TaxProfile } from '../types';

const when = new Date(2026, 9, 30);
const assumptions = { ...DEFAULT_ASSUMPTIONS, equityReturn: 12, debtReturn: 7, fdReturn: 6.5 };
const longAlloc = { equity: 75, debt: 15, gold: 10, fd: 0 };
const houseAlloc = { equity: 30, debt: 55, gold: 10, fd: 5 };

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function profile(patch: Partial<TaxProfile> = {}): TaxProfile {
  return { ...emptyTax(), regime: 'old', ...patch, contributions: { ...emptyTax().contributions, ...(patch.contributions ?? {}) } };
}

function goal(patch: Partial<TaxGoal> = {}): TaxGoal {
  return {
    id: 'retire', name: 'Retirement', category: 'retirement', years: 20, rank: 1, status: 'on-track',
    allocation: longAlloc, ...patch,
  };
}

assert(financialYear(when) === '2026-27', 'fy oct');
assert(monthsLeftInFy(when) === 6, 'months oct');
assert(financialYear(new Date(2026, 3, 1)) === '2026-27', 'fy apr');
assert(monthsLeftInFy(new Date(2026, 3, 1)) === 12, 'months apr');
assert(financialYear(new Date(2027, 2, 15)) === '2026-27', 'fy mar');
assert(monthsLeftInFy(new Date(2027, 2, 15)) === 1, 'months mar');
assert(monthsLeftInFy(new Date(2027, 0, 1)) === 3, 'months jan');
assert(splitAmount(100_000, [75, 15]).join() === '83333,16667', 'split');
assert(splitAmount(150_000, [75, 15]).join() === '125000,25000', 'split cap');

const filled = assessTax({
  tax: profile({ marginalRate: 30 }),
  monthlySurplus: 20_000,
  monthlySpend: 50_000,
  cashSavings: 400_000,
  goals: [goal()],
  assumptions,
}, when);
assert(filled.room === 150_000 && filled.affordable === 120_000 && filled.illustrativeTax === 36_000, 'filled totals');
assert(filled.suggestions.map((s) => `${s.id}:${s.amount}`).join() === 'elss:100000,ppf:20000', 'filled split');

const hidden = assessTax({
  tax: profile({ contributions: { ...emptyTax().contributions, ssy: 50_000, epf: 10_000 } }),
  monthlySurplus: 0, monthlySpend: 0, cashSavings: 0, goals: [], assumptions,
}, when);
const shown = assessTax({
  tax: profile({ hasEligibleChild: true, contributions: { ...emptyTax().contributions, ssy: 50_000, epf: 10_000 } }),
  monthlySurplus: 0, monthlySpend: 0, cashSavings: 0, goals: [], assumptions,
}, when);
assert(hidden.used === 10_000 && shown.used === 60_000, 'ssy toggle');

const emergency = assessTax({
  tax: profile(), monthlySurplus: 20_000, monthlySpend: 50_000, cashSavings: 0, goals: [goal()], assumptions,
}, when);
assert(emergency.blocked === 'emergency' && emergency.suggestions.length === 0, 'emergency');

const fresh = assessTax({
  tax: profile({ regime: 'new', marginalRate: 30 }),
  monthlySurplus: 20_000, monthlySpend: 10_000, cashSavings: 100_000, goals: [goal()], assumptions,
}, when);
assert(fresh.taxApplies === false && fresh.illustrativeTax == null && fresh.blocked === 'regime', 'new regime');
assert(fresh.suggestions.length > 0 && fresh.suggestions.every((s) => s.amount === 0), 'new amounts');

const soon = assessTax({
  tax: profile(), monthlySurplus: 20_000, monthlySpend: 10_000, cashSavings: 100_000,
  goals: [goal({ years: 2, allocation: houseAlloc })], assumptions,
}, when);
assert(soon.blocked === 'horizon', 'horizon');

const edu = assessTax({
  tax: profile({ hasEligibleChild: true }),
  monthlySurplus: 50_000, monthlySpend: 10_000, cashSavings: 100_000,
  goals: [goal({ id: 'edu', category: 'education', years: 16 })], assumptions,
}, when);
assert(edu.suggestions.map((s) => s.id).join() === 'elss,ssy', 'ssy debt');

console.log('tax selfcheck ok');
