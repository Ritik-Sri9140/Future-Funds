import { useI18n } from '../../i18n/useI18n';
import { useStore } from '../../store/useStore';
import { THEME_OPTIONS, type ThemePreference } from '../../theme';

function Icon({ id }: { id: ThemePreference }) {
  if (id === 'light') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </g>
      </svg>
    );
  }
  if (id === 'dark') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M14.5 3.2a8.5 8.5 0 1 0 6.3 13.6A8.2 8.2 0 0 1 14.5 3.2z" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ThemeSwitch() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const { t } = useI18n();
  return (
    <div className="theme-switch" role="radiogroup" aria-label={t('a11y.appearance')}>
      {THEME_OPTIONS.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={theme === o.id} aria-label={t(`theme.${o.id}`)} title={t(`theme.${o.id}Detail`)} onClick={() => setTheme(o.id)}>
          <Icon id={o.id} />
          <span>{t(`theme.${o.id}`)}</span>
        </button>
      ))}
    </div>
  );
}
