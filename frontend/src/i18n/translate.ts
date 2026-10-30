import { GOAL_TEMPLATES } from '../data/templates';
import type { Copy, GoalCategory } from '../types';
import { inr } from '../utils/format';
import { MESSAGES } from './messages';

export type Locale = 'en' | 'hi' | 'te' | 'ta' | 'bn' | 'mr' | 'kn' | 'ml' | 'gu' | 'or' | 'pa';

export const LOCALES: { id: Locale; native: string }[] = [
  { id: 'en', native: 'English' },
  { id: 'hi', native: 'हिन्दी' },
  { id: 'te', native: 'తెలుగు' },
  { id: 'ta', native: 'தமிழ்' },
  { id: 'bn', native: 'বাংলা' },
  { id: 'mr', native: 'मराठी' },
  { id: 'kn', native: 'ಕನ್ನಡ' },
  { id: 'ml', native: 'മലയാളം' },
  { id: 'gu', native: 'ગુજરાતી' },
  { id: 'or', native: 'ଓଡ଼ିଆ' },
  { id: 'pa', native: 'ਪੰਜਾਬੀ' },
];

export const LANG_KEY = 'future-funds-lang';

const DATE_LOCALE: Record<Locale, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  gu: 'gu-IN',
  or: 'or-IN',
  pa: 'pa-IN',
};

const LOCALE_IDS = new Set<string>(LOCALES.map((item) => item.id));

export function isLocale(v: string | null): v is Locale {
  return v != null && LOCALE_IDS.has(v);
}

export function readLocale(): Locale {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (isLocale(v)) return v;
  } catch {
    /* storage unavailable */
  }
  return 'en';
}

export function writeLocale(locale: Locale) {
  try {
    localStorage.setItem(LANG_KEY, locale);
  } catch {
    /* storage unavailable */
  }
}

export function applyLocale(locale: Locale) {
  document.documentElement.lang = locale;
}

export function copy(k: string, v?: Record<string, string | number>): Copy {
  return v ? { k, v } : { k };
}

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const row = MESSAGES[key];
  const template = row?.[locale] ?? row?.en ?? key;
  if (!vars || !template.includes('{{')) return template;
  return template.replace(/\{\{([^}]+)\}\}/g, (_, token: string) => {
    if (token.startsWith('₹')) return formatMoney(locale, Number(vars[token.slice(1)] ?? 0));
    if (token.startsWith('@')) return translate(locale, String(vars[token.slice(1)] ?? ''));
    const raw = vars[token];
    return raw == null ? '' : String(raw);
  });
}

export function formatMoney(locale: Locale, n: number): string {
  if (locale === 'en') return inr(n);
  return inr(n, { lakh: translate(locale, 'unit.lakh'), crore: translate(locale, 'unit.crore') });
}

export function chartMoney(locale: Locale, v: unknown): string {
  const one = (n: unknown) => formatMoney(locale, Number(n));
  return Array.isArray(v) ? `${one(v[0])} – ${one(v[1])}` : one(v);
}

export function goalDisplay(name: string, category: string, locale: Locale): string {
  const known = category in GOAL_TEMPLATES;
  if (known && name === GOAL_TEMPLATES[category as GoalCategory].label) return translate(locale, `goal.${category}`);
  return name;
}

export function renderCopy(locale: Locale, item: Copy): string {
  if (!item.v) return translate(locale, item.k);
  const vars = { ...item.v };
  if (typeof vars.name === 'string' && typeof vars.category === 'string') {
    vars.name = goalDisplay(vars.name, vars.category, locale);
  }
  return translate(locale, item.k, vars);
}

export function dateLocale(locale: Locale): string {
  return DATE_LOCALE[locale];
}
