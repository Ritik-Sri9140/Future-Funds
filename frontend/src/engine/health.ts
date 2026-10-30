import type { Health } from '../types';

export function computeHealth(x: {
  savingsRate: number; emergencyMonths: number; emiRatio: number; coverage: number;
  hasIncome: boolean; hasSpending: boolean; hasGoals: boolean;
}): Health {
  const parts = [
    { id: 'savings' as const, value: Math.min(30, Math.max(x.savingsRate, 0) * 100), max: 30, known: x.hasIncome },
    { id: 'emergency' as const, value: Math.min(25, (x.emergencyMonths / 6) * 25), max: 25, known: x.hasSpending },
    { id: 'debt' as const, value: 20 * Math.max(0, 1 - x.emiRatio / 0.4), max: 20, known: x.hasIncome },
    { id: 'coverage' as const, value: x.coverage * 25, max: 25, known: x.hasGoals },
  ];
  const known = parts.filter((p) => p.known);
  const max = known.reduce((s, p) => s + p.max, 0);
  const score = max > 0 ? Math.round(known.reduce((s, p) => s + p.value, 0) / max * 100) : 0;
  return { score, parts };
}
