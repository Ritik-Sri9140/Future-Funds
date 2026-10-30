import type { Assumptions } from '../types';

export type AssetId = 'fd' | 'debt' | 'gold' | 'equity' | 'real';
export type RiskId = 'low' | 'lowmed' | 'medium' | 'high';

export interface AssetClass {
  id: AssetId;
  risk: RiskId;
  minYears: number;
  returnKey: keyof Assumptions | null;
}

export const ASSETS: AssetClass[] = [
  { id: 'fd', risk: 'low', minYears: 0, returnKey: 'fdReturn' },
  { id: 'debt', risk: 'lowmed', minYears: 3, returnKey: 'debtReturn' },
  { id: 'gold', risk: 'medium', minYears: 5, returnKey: 'goldReturn' },
  { id: 'equity', risk: 'high', minYears: 7, returnKey: 'equityReturn' },
  { id: 'real', risk: 'high', minYears: 10, returnKey: null },
];
