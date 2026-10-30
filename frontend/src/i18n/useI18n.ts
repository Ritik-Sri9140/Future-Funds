import { useCallback } from 'react';
import type { Copy, GoalCategory } from '../types';
import { useStore } from '../store/useStore';
import { chartMoney, dateLocale, formatMoney, goalDisplay, renderCopy, translate, type Locale } from './translate';

export function useI18n() {
  const locale = useStore((s) => s.locale);
  const setLocale = useStore((s) => s.setLocale);
  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(locale, key, vars), [locale]);
  const tc = useCallback((item: Copy) => renderCopy(locale, item), [locale]);
  const money = useCallback((n: number) => formatMoney(locale, n), [locale]);
  const moneyTip = useCallback((v: unknown) => chartMoney(locale, v), [locale]);
  const goalName = useCallback((name: string, category: GoalCategory) => goalDisplay(name, category, locale), [locale]);
  const formatWhen = useCallback((iso: string, style: 'long' | 'short' | 'time') => formatStamp(locale, iso, style), [locale]);
  return { locale, setLocale, t, tc, money, moneyTip, goalName, formatWhen };
}

function formatStamp(locale: Locale, iso: string, style: 'long' | 'short' | 'time'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const tag = dateLocale(locale);
  const digits = { numberingSystem: 'latn' as const };
  if (style === 'time') return d.toLocaleTimeString(tag, { ...digits, hour: 'numeric', minute: '2-digit' });
  if (style === 'short') return d.toLocaleDateString(tag, { ...digits, day: 'numeric', month: 'short', year: 'numeric' });
  return d.toLocaleDateString(tag, { ...digits, weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDayKey(locale: Locale, day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  const d = new Date(year, month - 1, date);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString(dateLocale(locale), {
    numberingSystem: 'latn', weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  });
}
