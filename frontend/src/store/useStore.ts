import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { emptyTax, normalizeTax } from '../data/tax';
import type { Assumptions, ChatMessage, CompletedGoal, ContributionKey, ExpenseKey, Goal, GoalCategory, Page, Patch, Profile, SavedScenario, Scenario, TaxProfile, Weights } from '../types';
import { DEFAULT_ASSUMPTIONS, DEFAULT_SCENARIO, DEFAULT_WEIGHTS, EMPTY_PROFILE, SAMPLE_PROFILE, goalDefaults, makeGoal, sampleGoals } from '../data/templates';
import { buildPlan } from '../engine/plan';
import { applyPatchTo } from '../engine/patch';
import { CURRENT_YEAR, targetYearHasPassed } from '../engine/finance';
import { applyLocale, readLocale, translate, writeLocale, type Locale } from '../i18n/translate';
import { readTheme, writeTheme, type ThemePreference } from '../theme';
import { shiftLocalDay, uid } from '../utils/format';

interface Data {
  profile: Profile;
  tax: TaxProfile;
  goals: Goal[];
  completedGoals: CompletedGoal[];
  assumptions: Assumptions;
  scenario: Scenario;
  weights: Weights;
  savedScenarios: SavedScenario[];
  chat: ChatMessage[];
}

interface State extends Data {
  page: Page;
  theme: ThemePreference;
  locale: Locale;
  setTheme: (t: ThemePreference) => void;
  setLocale: (l: Locale) => void;
  readNews: Record<string, string[]>;
  setPage: (p: Page) => void;
  markNewsRead: (day: string, id: string) => void;
  markDayRead: (day: string, ids: string[]) => void;
  setProfile: (p: Partial<Profile>) => void;
  setTax: (p: Partial<TaxProfile>) => void;
  setContribution: (k: ContributionKey, v: number) => void;
  setExpense: (k: ExpenseKey, v: number) => void;
  addGoal: (c: GoalCategory) => void;
  updateGoal: (id: string, p: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  completeGoal: (id: string) => void;
  setAssumptions: (p: Partial<Assumptions>) => void;
  setScenario: (p: Partial<Scenario>) => void;
  resetScenario: () => void;
  setWeights: (p: Partial<Weights>) => void;
  saveScenario: (name: string) => void;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  applyPatch: (p: Patch) => void;
  addChat: (m: ChatMessage) => void;
  clearChat: () => void;
  resetSample: () => void;
  clearAll: () => void;
  importState: (d: unknown) => boolean;
}

function isCompletedGoal(x: unknown): x is CompletedGoal {
  if (!x || typeof x !== 'object') return false;
  const r = x as CompletedGoal;
  return typeof r.completedAt === 'string' && !!r.goal && typeof r.goal.name === 'string' && typeof r.goal.targetYear === 'number';
}

function pruneReads(read: Record<string, string[]>): Record<string, string[]> {
  const min = shiftLocalDay(-7);
  return Object.fromEntries(Object.entries(read).filter(([day]) => day >= min));
}

const sample = (): Data => {
  const profile = structuredClone(SAMPLE_PROFILE);
  return {
    profile, tax: emptyTax(), goals: sampleGoals(profile), assumptions: { ...DEFAULT_ASSUMPTIONS }, scenario: { ...DEFAULT_SCENARIO },
    weights: { ...DEFAULT_WEIGHTS }, savedScenarios: [], chat: [], completedGoals: [],
  };
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      page: 'dashboard',
      theme: readTheme(),
      locale: readLocale(),
      readNews: {},
      ...sample(),
      setPage: (page) => set({ page }),
      setTheme: (theme) => {
        writeTheme(theme);
        set({ theme });
      },
      setLocale: (locale) => {
        writeLocale(locale);
        applyLocale(locale);
        set({ locale });
      },
      markNewsRead: (day, id) => set((s) => {
        const ids = new Set(s.readNews[day] ?? []);
        ids.add(id);
        return { readNews: pruneReads({ ...s.readNews, [day]: [...ids] }) };
      }),
      markDayRead: (day, ids) => set((s) => {
        const merged = new Set([...(s.readNews[day] ?? []), ...ids]);
        return { readNews: pruneReads({ ...s.readNews, [day]: [...merged] }) };
      }),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setTax: (p) => set((s) => {
        const current = s.tax ?? emptyTax();
        return {
          tax: normalizeTax({ ...current, ...p, contributions: { ...current.contributions, ...(p.contributions ?? {}) } }),
        };
      }),
      setContribution: (k, v) => set((s) => {
        const current = s.tax ?? emptyTax();
        return { tax: { ...current, contributions: { ...current.contributions, [k]: Math.max(0, v) } } };
      }),
      setExpense: (k, v) => set((s) => ({ profile: { ...s.profile, expenses: { ...s.profile.expenses, [k]: v } } })),
      addGoal: (c) => {
        const { profile, assumptions } = get();
        set((s) => ({ goals: [...s.goals, makeGoal(c, goalDefaults(c, profile, assumptions))] }));
      },
      updateGoal: (id, p) => set((s) => ({
        goals: s.goals.map((g) => {
          if (g.id !== id) return g;
          const next = { ...g, ...p };
          if (next.targetYear < CURRENT_YEAR) next.targetYear = CURRENT_YEAR;
          return next;
        }),
      })),
      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      completeGoal: (id) => {
        const s = get();
        const goal = s.goals.find((g) => g.id === id);
        if (!goal || !targetYearHasPassed(goal.targetYear)) return;
        const plan = buildPlan({
          profile: s.profile, goals: s.goals, assumptions: s.assumptions,
          scenario: s.scenario, weights: s.weights, monteCarlo: true,
        });
        const result = plan.goals.find((g) => g.goal.id === id);
        if (!result) return;
        const record: CompletedGoal = {
          id: uid(),
          completedAt: new Date().toISOString(),
          goal: { ...result.goal },
          years: result.years,
          inflation: result.inflation,
          futureCost: result.futureCost,
          savedFuture: result.savedFuture,
          expectedReturn: result.expectedReturn,
          volatility: result.volatility,
          allocation: { ...result.allocation },
          sip: result.sip,
          funded: result.funded,
          fundedPct: result.fundedPct,
          status: result.status,
          term: result.term,
          rank: result.rank,
          successProb: result.successProb,
          ageAtGoal: result.ageAtGoal,
        };
        set({
          goals: s.goals.filter((g) => g.id !== id),
          completedGoals: [record, ...(s.completedGoals ?? [])],
        });
      },
      setAssumptions: (p) => set((s) => ({ assumptions: { ...s.assumptions, ...p } })),
      setScenario: (p) => set((s) => ({ scenario: { ...s.scenario, ...p } })),
      resetScenario: () => set({ scenario: { ...DEFAULT_SCENARIO } }),
      setWeights: (p) => set((s) => ({ weights: { ...s.weights, ...p } })),
      saveScenario: (name) =>
        set((s) => ({
          savedScenarios: [...s.savedScenarios, { id: uid(), name: name || translate(get().locale, 'simulator.defaultName', { n: s.savedScenarios.length + 1 }), scenario: { ...s.scenario }, createdAt: new Date().toISOString() }],
        })),
      loadScenario: (id) => {
        const sc = get().savedScenarios.find((x) => x.id === id);
        if (sc) set({ scenario: { ...sc.scenario } });
      },
      deleteScenario: (id) => set((s) => ({ savedScenarios: s.savedScenarios.filter((x) => x.id !== id) })),
      applyPatch: (p) => set((s) => applyPatchTo(s, p)),
      addChat: (m) => set((s) => ({ chat: [...s.chat, m] })),
      clearChat: () => set({ chat: [] }),
      resetSample: () => set((s) => ({ ...sample(), completedGoals: s.completedGoals })),
      clearAll: () => set({ ...sample(), profile: structuredClone(EMPTY_PROFILE), goals: [], completedGoals: [] }),
      importState: (d) => {
        const x = d as Partial<Data>;
        if (!x || typeof x !== 'object' || !x.profile || !Array.isArray(x.goals)) return false;
        const completed = Array.isArray(x.completedGoals) ? x.completedGoals.filter(isCompletedGoal) : [];
        set({
          profile: { ...EMPTY_PROFILE, ...x.profile, expenses: { ...EMPTY_PROFILE.expenses, ...(x.profile.expenses ?? {}) } },
          tax: Object.prototype.hasOwnProperty.call(x, 'tax') ? normalizeTax(x.tax) : emptyTax(),
          goals: x.goals,
          completedGoals: completed,
          assumptions: { ...DEFAULT_ASSUMPTIONS, ...(x.assumptions ?? {}) },
          scenario: { ...DEFAULT_SCENARIO, ...(x.scenario ?? {}) },
          weights: { ...DEFAULT_WEIGHTS, ...(x.weights ?? {}) },
          savedScenarios: x.savedScenarios ?? [],
        });
        return true;
      },
    }),
    {
      name: 'future-funds-v1',
      partialize: (s) => ({
        profile: s.profile, tax: s.tax, goals: s.goals, completedGoals: s.completedGoals, assumptions: s.assumptions, scenario: s.scenario,
        weights: s.weights, savedScenarios: s.savedScenarios, chat: s.chat, readNews: s.readNews,
      }),
    }
  )
);
