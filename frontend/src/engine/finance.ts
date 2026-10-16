import type { Allocation, Assumptions } from '../types';

export const CURRENT_YEAR = new Date().getFullYear();

/** A goal's target date is 31 December of its target year. */
export function targetYearHasPassed(targetYear: number, now = new Date()): boolean {
  return now.getFullYear() > targetYear;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Future cost = Cost × (1 + inflation)^years */
export const futureCost = (cost: number, inflationPct: number, years: number) =>
  cost * Math.pow(1 + inflationPct / 100, years);

/** Lump sum grown with monthly compounding */
export const fvLump = (p: number, annualPct: number, months: number) =>
  p * Math.pow(1 + annualPct / 1200, months);

/** Future value of a monthly SIP (paid at start of month), optional yearly step-up */
export function fvSip(amount: number, annualPct: number, months: number, stepUpPct = 0): number {
  const r = annualPct / 1200;
  let v = 0;
  let a = amount;
  for (let m = 0; m < months; m++) {
    if (m > 0 && m % 12 === 0) a *= 1 + stepUpPct / 100;
    v = (v + a) * (1 + r);
  }
  return v;
}

/** Monthly SIP needed to reach target. FV is linear in amount, so SIP = target / FV(₹1). */
export function requiredSip(target: number, annualPct: number, months: number, stepUpPct = 0): number {
  if (target <= 0) return 0;
  if (months <= 0) return target;
  return target / fvSip(1, annualPct, months, stepUpPct);
}

/** Lower return used to size the SIP so a fully funded goal lands near 80% odds. */
export function bufferedReturn(retPct: number, volPct: number, years: number): number {
  const cushion = (1.28 * volPct) / Math.sqrt(Math.max(years, 1));
  return Math.max(0.5, retPct - cushion);
}

/** Glide path: the closer the goal, the safer the asset mix (percentages) */
export function allocationFor(years: number): Allocation {
  if (years > 10) return { equity: 75, debt: 15, gold: 10, fd: 0 };
  if (years > 7) return { equity: 60, debt: 30, gold: 10, fd: 0 };
  if (years > 3) return { equity: 30, debt: 55, gold: 10, fd: 5 };
  if (years > 1) return { equity: 10, debt: 50, gold: 0, fd: 40 };
  return { equity: 0, debt: 20, gold: 0, fd: 80 };
}

/** Expected return and volatility of an allocation (assets treated as uncorrelated) */
export function portfolioStats(al: Allocation, a: Assumptions, returnDelta = 0) {
  const ret =
    (al.equity * (a.equityReturn + returnDelta) + al.debt * a.debtReturn + al.gold * a.goldReturn + al.fd * a.fdReturn) / 100;
  const vol = Math.sqrt((al.equity * a.equityVol) ** 2 + (al.debt * a.debtVol) ** 2 + (al.gold * a.goldVol) ** 2) / 100;
  return { ret, vol };
}
