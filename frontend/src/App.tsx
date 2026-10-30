import { useEffect, type ComponentType } from 'react';
import LanguageSwitch from './components/layout/LanguageSwitch';
import Sidebar from './components/layout/Sidebar';
import ThemeSwitch from './components/layout/ThemeSwitch';
import { applyLocale } from './i18n/translate';
import { useI18n } from './i18n/useI18n';
import { Badge } from './components/ui/Card';
import { healthTone } from './components/charts/theme';
import { useStore } from './store/useStore';
import { usePlan } from './hooks/usePlan';
import type { Page } from './types';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Tax from './pages/Tax';
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
import { applyTheme, THEME_KEY } from './theme';

const PAGES: Record<Page, ComponentType> = {
  dashboard: Dashboard, profile: Profile, tax: Tax, goals: Goals, timeline: Timeline, simulator: Simulator,
  gap: GapFix, prioritizer: Prioritizer, investments: Investments, compounding: Compounding,
  montecarlo: MonteCarlo, news: News, advisor: Advisor, settings: Settings,
};

export default function App() {
  const page = useStore((s) => s.page);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const { locale, t } = useI18n();
  const plan = usePlan({ mc: false });
  const PageView = PAGES[page];
  const knownHealth = plan.health.parts.some((p) => p.known);
  const hasGoals = plan.goals.length > 0;
  useEffect(() => { applyLocale(locale); }, [locale]);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY) return;
      if (e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'system') setTheme(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [setTheme]);
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <header className="topbar">
          <div>
            <h1>{t(`page.${page}.title`)}</h1>
            <p>{t(`page.${page}.subtitle`)}</p>
          </div>
          <div className="row no-print">
            <LanguageSwitch />
            <ThemeSwitch />
            <Badge tone={knownHealth ? healthTone(plan.health.score) : 'gray'}>{knownHealth ? t('top.health', { score: plan.health.score }) : t('top.healthUnknown')}</Badge>
            <Badge tone={!hasGoals ? 'gray' : plan.gap > 0 ? 'red' : 'green'}>{!hasGoals ? t('top.noGoals') : plan.gap > 0 ? t('top.gap', { amount: plan.gap }) : t('top.funded')}</Badge>
          </div>
        </header>
        <PageView />
        <p className="disclaimer">{t('app.disclaimer')}</p>
      </main>
    </div>
  );
}
