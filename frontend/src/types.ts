export type GoalCategory =
  | 'emergency' | 'retirement' | 'education' | 'house' | 'wedding'
  | 'startup' | 'car' | 'travel' | 'custom';

export type ExpenseKey = 'housing' | 'food' | 'transport' | 'utilities' | 'education' | 'lifestyle' | 'other';

export type Page =
  | 'dashboard' | 'profile' | 'goals' | 'timeline' | 'simulator' | 'gap'
  | 'prioritizer' | 'investments' | 'compounding' | 'montecarlo' | 'news' | 'advisor' | 'settings';

export type NewsScope = 'in' | 'global';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  scope: NewsScope;
}

export interface Profile {
  name: string;
  age: number;
  retirementAge: number;
  monthlyIncome: number;
  otherIncome: number;
  expenses: Record<ExpenseKey, number>;
  emis: number;
  cashSavings: number;
  investments: number;
  gold: number;
  realEstate: number;
  otherAssets: number;
  liabilities: number;
}

export interface Goal {
  id: string;
  name: string;
  category: GoalCategory;
  costToday: number;
  targetYear: number;
  inflation: number;
  saved: number;
  necessity: number; // 1–5
}

/** Frozen copy of a goal at the moment it was marked done. */
export interface CompletedGoal {
  id: string;
  completedAt: string;
  goal: Goal;
  years: number;
  inflation: number;
  futureCost: number;
  savedFuture: number;
  expectedReturn: number;
  volatility: number;
  allocation: Allocation;
  sip: number;
  funded: number;
  fundedPct: number;
  status: GoalResult['status'];
  term: GoalResult['term'];
  rank: number;
  successProb: number;
  ageAtGoal: number;
}

export interface Assumptions {
  inflation: number;
  equityReturn: number;
  debtReturn: number;
  fdReturn: number;
  goldReturn: number;
  equityVol: number;
  debtVol: number;
  goldVol: number;
  sipStepUp: number;
  mcRuns: number;
}

export interface Scenario {
  incomeChange: number;
  expenseChange: number;
  inflationDelta: number;
  returnDelta: number;
}

export interface Weights {
  urgency: number;
  necessity: number;
  feasibility: number;
  essentialsFirst: boolean;
}

export interface SavedScenario {
  id: string;
  name: string;
  scenario: Scenario;
  createdAt: string;
}

export type Patch =
  | { kind: 'expense'; key: ExpenseKey; value: number }
  | { kind: 'goalYear'; id: string; year: number }
  | { kind: 'goalCost'; id: string; cost: number }
  | { kind: 'stepUp'; value: number }
  | { kind: 'shiftToCash'; amount: number }
  | { kind: 'prepay'; amount: number };

export interface Fix {
  id: string;
  type: 'cut' | 'delay' | 'reduce' | 'stepup' | 'info' | 'warning';
  title: string;
  detail: string;
  patch?: Patch;
}

export interface Allocation { equity: number; debt: number; gold: number; fd: number }

export interface GoalResult {
  goal: Goal;
  years: number;
  inflation: number;
  futureCost: number;
  savedFuture: number;
  expectedReturn: number;
  volatility: number;
  allocation: Allocation;
  sip: number;
  funded: number;
  fundedPct: number;
  status: 'on-track' | 'partial' | 'unfunded' | 'done';
  term: 'Short' | 'Medium' | 'Long';
  urgency: number;
  necessity: number;
  feasibility: number;
  score: number;
  rank: number;
  successProb: number;
  ageAtGoal: number;
}

export interface Health {
  score: number;
  parts: { label: string; value: number; max: number; known: boolean }[];
}

export interface ProjectionPoint { year: number; age: number; corpus: number; outflow: number }

export interface Plan {
  income: number;
  expenses: number;
  emis: number;
  surplus: number;
  investable: number;
  netWorth: number;
  totalAssets: number;
  savingsRate: number;
  goals: GoalResult[];
  totalSip: number;
  gap: number;
  fixes: Fix[];
  health: Health;
  projection: ProjectionPoint[];
}

export interface ChatMessage { role: 'user' | 'assistant'; content: string }
