import { useI18n } from '../../i18n/useI18n';
import { useStore } from '../../store/useStore';
import type { Page } from '../../types';

const NAV: { group: string; items: { id: Page; label: string }[] }[] = [
  { group: 'nav.overview', items: [{ id: 'dashboard', label: 'nav.dashboard' }] },
  { group: 'nav.plan', items: [
    { id: 'profile', label: 'nav.profile' }, { id: 'tax', label: 'nav.tax' }, { id: 'goals', label: 'nav.goals' }, { id: 'timeline', label: 'nav.timeline' },
  ] },
  { group: 'nav.analyse', items: [
    { id: 'simulator', label: 'nav.simulator' }, { id: 'gap', label: 'nav.gap' }, { id: 'prioritizer', label: 'nav.prioritizer' },
    { id: 'investments', label: 'nav.investments' }, { id: 'compounding', label: 'nav.compounding' }, { id: 'montecarlo', label: 'nav.montecarlo' },
  ] },
  { group: 'nav.assist', items: [{ id: 'news', label: 'nav.news' }, { id: 'advisor', label: 'nav.advisor' }, { id: 'settings', label: 'nav.settings' }] },
];

export default function Sidebar() {
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);
  const { t } = useI18n();
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">FF</div>
        <div><b>Future Funds</b><span>{t('brand.tagline')}</span></div>
      </div>
      <nav>
        {NAV.map((g) => (
          <div key={g.group} className="nav-section">
            <div className="nav-group">{t(g.group)}</div>
            {g.items.map((i) => (
              <button key={i.id} className={`nav-item ${page === i.id ? 'active' : ''}`} onClick={() => setPage(i.id)}>
                {t(i.label)}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">{t('brand.disclaimer')}</div>
    </aside>
  );
}
