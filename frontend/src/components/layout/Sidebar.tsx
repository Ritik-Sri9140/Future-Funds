import { useStore } from '../../store/useStore';
import type { Page } from '../../types';

const NAV: { group: string; items: { id: Page; label: string }[] }[] = [
  { group: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard' }] },
  { group: 'Plan', items: [
    { id: 'profile', label: 'Financial profile' }, { id: 'goals', label: 'Goals' }, { id: 'timeline', label: 'Life timeline' },
  ] },
  { group: 'Analyse', items: [
    { id: 'simulator', label: 'What-if simulator' }, { id: 'gap', label: 'Gap and fixes' }, { id: 'prioritizer', label: 'Goal prioritizer' },
    { id: 'investments', label: 'Investments' }, { id: 'compounding', label: 'Compounding lab' }, { id: 'montecarlo', label: 'Risk lab (Monte Carlo)' },
  ] },
  { group: 'Assist', items: [{ id: 'news', label: 'Financial news' }, { id: 'advisor', label: 'AI advisor' }, { id: 'settings', label: 'Settings and data' }] },
];

export default function Sidebar() {
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">FF</div>
        <div><b>Future Funds</b><span>Your GPS for money</span></div>
      </div>
      <nav>
        {NAV.map((g) => (
          <div key={g.group} className="nav-section">
            <div className="nav-group">{g.group}</div>
            {g.items.map((i) => (
              <button key={i.id} className={`nav-item ${page === i.id ? 'active' : ''}`} onClick={() => setPage(i.id)}>
                {i.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">Educational guidance, not regulated investment advice.</div>
    </aside>
  );
}
