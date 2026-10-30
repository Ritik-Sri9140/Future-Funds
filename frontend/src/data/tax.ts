import type { ContributionKey, MarginalRate, TaxProfile, TaxRegime } from '../types';

/** Section 80C aggregate cap. Review after each Union Budget. */
export const SECTION_80C_CAP = 150_000;

export const EMERGENCY_MONTHS = 6;

export const CONTRIBUTION_KEYS: ContributionKey[] = [
  'epf', 'ppf', 'elss', 'lifeInsurance', 'taxFd', 'nsc',
  'homeLoanPrincipal', 'tuition', 'ssy', 'other80c',
];

export type ProductId = 'elss' | 'ppf' | 'nsc' | 'taxFd' | 'ssy';
export type TaxBucket = 'equity' | 'debt' | 'fd';

export interface TaxProduct {
  id: ProductId;
  lockIn: number;
  bucket: TaxBucket;
  needsChild?: boolean;
  category?: 'education';
}

/** Products a person can still choose. Lock-in is the minimum goal horizon. */
export const TAX_PRODUCTS: TaxProduct[] = [
  { id: 'elss', lockIn: 3, bucket: 'equity' },
  { id: 'ppf', lockIn: 15, bucket: 'debt' },
  { id: 'nsc', lockIn: 5, bucket: 'debt' },
  { id: 'taxFd', lockIn: 5, bucket: 'fd' },
  { id: 'ssy', lockIn: 15, bucket: 'debt', needsChild: true, category: 'education' },
];

const REGIMES: TaxRegime[] = ['old', 'new', 'unsure'];
const RATES: MarginalRate[] = [0, 5, 20, 30];

export function emptyTax(): TaxProfile {
  const contributions = {} as Record<ContributionKey, number>;
  for (const key of CONTRIBUTION_KEYS) contributions[key] = 0;
  return { regime: 'unsure', marginalRate: 0, hasEligibleChild: false, contributions };
}

export function normalizeTax(raw: unknown): TaxProfile {
  const base = emptyTax();
  if (!raw || typeof raw !== 'object') return base;
  const src = raw as Partial<TaxProfile>;
  const regime = REGIMES.includes(src.regime as TaxRegime) ? src.regime as TaxRegime : base.regime;
  const marginalRate = RATES.includes(src.marginalRate as MarginalRate) ? src.marginalRate as MarginalRate : 0;
  const incoming: Partial<Record<ContributionKey, number>> = src.contributions ?? {};
  const contributions = { ...base.contributions };
  for (const key of CONTRIBUTION_KEYS) {
    const n = Number(incoming[key]);
    contributions[key] = Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return { regime, marginalRate, hasEligibleChild: src.hasEligibleChild === true, contributions };
}
