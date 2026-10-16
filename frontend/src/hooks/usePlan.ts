import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { buildPlan } from '../engine/plan';
import type { Scenario } from '../types';

export function usePlan(opts: { scenario?: Scenario; mc?: boolean } = {}) {
  const profile = useStore((s) => s.profile);
  const goals = useStore((s) => s.goals);
  const assumptions = useStore((s) => s.assumptions);
  const storeScenario = useStore((s) => s.scenario);
  const weights = useStore((s) => s.weights);
  const scenario = opts.scenario ?? storeScenario;
  const mc = opts.mc ?? true;
  return useMemo(
    () => buildPlan({ profile, goals, assumptions, scenario, weights, monteCarlo: mc }),
    [profile, goals, assumptions, scenario, weights, mc]
  );
}
