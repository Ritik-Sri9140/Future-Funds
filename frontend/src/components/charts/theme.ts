import type { GoalResult } from '../../types';
import type { Tone } from '../ui/Card';
import { inr } from '../../utils/format';

export const COLORS = {
  primary: '#4f46e5', green: '#10b981', red: '#ef4444', amber: '#f59e0b', blue: '#0ea5e9',
  purple: '#8b5cf6', slate: '#94a3b8', pink: '#ec4899', teal: '#14b8a6',
};
export const PALETTE = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#64748b', '#ef4444'];
export const ASSET_COLORS = { Equity: '#4f46e5', Debt: '#0ea5e9', Gold: '#f59e0b', FD: '#10b981' };
export const AXIS = { fontSize: 12, fill: '#64748b' };
export const GRID = '#e5e7eb';

export const money = (v: unknown) =>
  Array.isArray(v) ? `${inr(Number(v[0]))} – ${inr(Number(v[1]))}` : inr(Number(v));

export const healthTone = (s: number): Tone => (s >= 70 ? 'green' : s >= 45 ? 'amber' : 'red');
export const healthColor = (s: number) => (s >= 70 ? COLORS.green : s >= 45 ? COLORS.amber : COLORS.red);

export const STATUS_META: Record<GoalResult['status'], { label: string; tone: Tone; color: string }> = {
  'on-track': { label: 'On track', tone: 'green', color: COLORS.green },
  partial: { label: 'Partly funded', tone: 'amber', color: COLORS.amber },
  unfunded: { label: 'Not funded', tone: 'red', color: COLORS.red },
  done: { label: 'Fully saved', tone: 'green', color: COLORS.green },
};

export const TERM_TONE: Record<GoalResult['term'], Tone> = { Short: 'amber', Medium: 'blue', Long: 'purple' };
