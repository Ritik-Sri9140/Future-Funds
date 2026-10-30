export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'future-funds-theme';

export const THEME_OPTIONS: { id: ThemePreference; label: string; detail: string }[] = [
  { id: 'light', label: 'Light', detail: 'Bright workspace with indigo accents' },
  { id: 'dark', label: 'Dark', detail: 'Warm, low-glare colors for long sessions' },
  { id: 'system', label: 'System', detail: 'Follows this device automatically' },
];

export function readTheme(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage unavailable */
  }
  return 'light';
}

export function writeTheme(theme: ThemePreference) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable */
  }
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return pref === 'dark' ? 'dark' : 'light';
}

export function applyTheme(pref: ThemePreference) {
  const resolved = resolveTheme(pref);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#141210' : '#f6f7fb');
}
