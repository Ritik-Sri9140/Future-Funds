import type { Assumptions } from '../types';

export interface AssetClass {
  name: string; risk: string; horizon: string; minYears: number; liquidity: string; fits: string;
  returnKey: keyof Assumptions | null; note: string;
}

export const ASSETS: AssetClass[] = [
  { name: 'Savings / FD', risk: 'Low', horizon: '0–3 yrs', minYears: 0, liquidity: 'High', fits: 'Emergency fund, short trips', returnKey: 'fdReturn', note: 'Capital safe; returns near inflation' },
  { name: 'Debt funds', risk: 'Low–Medium', horizon: '3–5 yrs', minYears: 3, liquidity: 'Medium–High', fits: 'Down payment, wedding', returnKey: 'debtReturn', note: 'Stable; small interest-rate risk' },
  { name: 'Gold', risk: 'Medium', horizon: '5+ yrs', minYears: 5, liquidity: 'Medium', fits: 'Diversifier, marriage', returnKey: 'goldReturn', note: 'Hedge against rupee and crises' },
  { name: 'Index / equity funds', risk: 'High', horizon: '7+ yrs', minYears: 7, liquidity: 'Medium', fits: 'Retirement, education, wealth', returnKey: 'equityReturn', note: 'Best long-run growth; volatile' },
  { name: 'Real estate / business', risk: 'High', horizon: '10+ yrs', minYears: 10, liquidity: 'Low', fits: 'Long-term wealth', returnKey: null, note: 'Lumpy, illiquid, concentrated' },
];
