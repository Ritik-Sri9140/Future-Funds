import type { GoalResult } from '../../types';
import type { Tone } from '../ui/Card';
import { inr } from '../../utils/format';

export const COLORS = {
  primary: 'var(--c-primary)', green: 'var(--c-green)', red: 'var(--c-red)', amber: 'var(--c-amber)', blue: 'var(--c-blue)',
  purple: 'var(--c-purple)', slate: 'var(--c-slate)', pink: 'var(--c-pink)', teal: 'var(--c-teal)', track: 'var(--c-track)',
};
export const PALETTE = [
  'var(--c-primary)', 'var(--c-blue)', 'var(--c-green)', 'var(--c-amber)', 'var(--c-pink)',
  'var(--c-purple)', 'var(--c-teal)', 'var(--c-slate)', 'var(--c-red)',
];
export const ASSET_COLORS = { Equity: 'var(--c-primary)', Debt: 'var(--c-blue)', Gold: 'var(--c-gold)', FD: 'var(--c-green)' };
export const AXIS = { fontSize: 12, fill: 'var(--c-axis)' };
export const GRID = 'var(--c-grid)';

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
