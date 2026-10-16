import { useEffect, type ComponentType } from 'react';
import Sidebar from './components/layout/Sidebar';
import { Badge } from './components/ui/Card';
import { healthTone } from './components/charts/theme';
import { useStore } from './store/useStore';
import { usePlan } from './hooks/usePlan';
import { inr } from './utils/format';
import type { Page } from './types';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Goals from './pages/Goals';
import Timeline from './pages/Timeline';
import Simulator from './pages/Simulator';
import GapFix from './pages/GapFix';
import Prioritizer from './pages/Prioritizer';
import Investments from './pages/Investments';
import Compounding from './pages/Compounding';
import MonteCarlo from './pages/MonteCarlo';
import News from './pages/News';
import Advisor from './pages/Advisor';
import Settings from './pages/Settings';

const PAGES: Record<Page, { title: string; subtitle: string; C: ComponentType }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Your whole financial life at a glance', C: Dashboard },
  profile: { title: 'Financial profile', subtitle: 'Income, spending, assets and loans', C: Profile },
  goals: { title: 'Goals', subtitle: 'Inflation-adjusted targets and the SIP each one needs', C: Goals },
  timeline: { title: 'Life timeline', subtitle: 'Your milestones on one road', C: Timeline },
  simulator: { title: 'What-if simulator', subtitle: 'Change one thing, see everything move', C: Simulator },
  gap: { title: 'Gap and fixes', subtitle: 'Where the plan falls short and how to fix it', C: GapFix },
  prioritizer: { title: 'Goal prioritizer', subtitle: 'What to fund first when money is short', C: Prioritizer },
  investments: { title: 'Investments', subtitle: 'Match each goal to the right asset mix', C: Investments },
  compounding: { title: 'Compounding lab', subtitle: 'Why time beats amount', C: Compounding },
  montecarlo: { title: 'Risk lab', subtitle: 'Monte Carlo odds of reaching each goal', C: MonteCarlo },
  news: { title: 'Financial news', subtitle: 'India and global markets, today and yesterday', C: News },
  advisor: { title: 'AI advisor', subtitle: 'Ask anything about your plan', C: Advisor },
  settings: { title: 'Settings and data', subtitle: 'Assumptions, export, import and reset', C: Settings },
};

export default function App() {
  const page = useStore((s) => s.page);
  const plan = usePlan({ mc: false });
  const P = PAGES[page];
  const knownHealth = plan.health.parts.some((p) => p.known);
  const hasGoals = plan.goals.length > 0;
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <header className="topbar">
          <div>
            <h1>{P.title}</h1>
            <p>{P.subtitle}</p>
          </div>
          <div className="row no-print">
            <Badge tone={knownHealth ? healthTone(plan.health.score) : 'gray'}>{knownHealth ? `Health ${plan.health.score}/100` : 'Health —'}</Badge>
            <Badge tone={!hasGoals ? 'gray' : plan.gap > 0 ? 'red' : 'green'}>{!hasGoals ? 'No goals yet' : plan.gap > 0 ? `Gap ${inr(plan.gap)}/mo` : 'All goals funded'}</Badge>
          </div>
        </header>
        <P.C />
        <p className="disclaimer">Future Funds gives educational guidance, not regulated investment advice. Returns are assumptions, not guarantees.</p>
      </main>
    </div>
  );
}
