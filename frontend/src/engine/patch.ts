import type { Assumptions, Goal, Patch, Profile } from '../types';
import { CURRENT_YEAR } from './finance';

export interface Patchable {
  profile: Profile;
  goals: Goal[];
  assumptions: Assumptions;
}

/** Returns updated slices for a plan change. Does not mutate the input. */
export function applyPatchTo(data: Patchable, patch: Patch): Patchable {
  const profile: Profile = { ...data.profile, expenses: { ...data.profile.expenses } };
  let goals = data.goals;
  let assumptions = data.assumptions;

  if (patch.kind === 'expense') {
    profile.expenses[patch.key] = patch.value;
  } else if (patch.kind === 'goalYear') {
    goals = data.goals.map((g) => (g.id === patch.id ? { ...g, targetYear: Math.max(CURRENT_YEAR, patch.year) } : g));
  } else if (patch.kind === 'goalCost') {
    goals = data.goals.map((g) => (g.id === patch.id ? { ...g, costToday: patch.cost } : g));
  } else if (patch.kind === 'stepUp') {
    assumptions = { ...data.assumptions, sipStepUp: patch.value };
  } else if (patch.kind === 'shiftToCash') {
    const amount = Math.max(0, Math.min(patch.amount, profile.investments));
    profile.investments -= amount;
    profile.cashSavings += amount;
  } else if (patch.kind === 'prepay') {
    const amount = Math.max(0, Math.min(patch.amount, profile.liabilities, profile.cashSavings));
    if (amount > 0 && profile.liabilities > 0) {
      const left = profile.liabilities - amount;
      profile.emis = left < 1 ? 0 : Math.round(profile.emis * (left / profile.liabilities));
      profile.liabilities = left < 1 ? 0 : left;
      profile.cashSavings -= amount;
    }
  }

  return { profile, goals, assumptions };
}
