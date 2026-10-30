import { demoNewsFeed } from '../data/demoNews';
import type { Locale } from '../i18n/translate';
import type { ChatMessage, NewsArticle } from '../types';

export interface NewsFeed {
  configured: boolean;
  articles: NewsArticle[];
  fetchedAt: string | null;
  demo?: boolean;
}

export async function askAdvisor(messages: ChatMessage[], plan: unknown, language: Locale = 'en'): Promise<{ reply: string; source: 'engine' | 'model'; provider: string }> {
  const res = await fetch('/api/advisor/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, plan, language }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return {
    reply: String(data.reply ?? ''),
    source: data.source === 'engine' ? 'engine' : 'model',
    provider: data.provider === 'anthropic' ? 'anthropic' : 'gemini',
  };
}

function isArticle(value: unknown): value is NewsArticle {
  if (!value || typeof value !== 'object') return false;
  const article = value as NewsArticle;
  return Boolean(
    article.id && article.title && article.url && article.publishedAt
    && (article.scope === 'in' || article.scope === 'global'),
  );
}

function normalizeNewsFeed(data: unknown): NewsFeed {
  if (!data || typeof data !== 'object') return demoNewsFeed();
  const body = data as Partial<NewsFeed>;
  if (body.demo) {
    const articles = Array.isArray(body.articles) ? body.articles.filter(isArticle) : [];
    return articles.length
      ? { configured: true, demo: true, articles, fetchedAt: body.fetchedAt ?? new Date().toISOString() }
      : demoNewsFeed();
  }
  if (body.configured === false) return { configured: false, articles: [], fetchedAt: null };
  if (!Array.isArray(body.articles)) return demoNewsFeed();
  const articles = body.articles.filter(isArticle);
  if (body.articles.length > 0 && articles.length === 0) return demoNewsFeed();
  return {
    configured: true,
    articles,
    fetchedAt: typeof body.fetchedAt === 'string' ? body.fetchedAt : null,
  };
}

export async function fetchNews(): Promise<NewsFeed> {
  try {
    const offset = new Date().getTimezoneOffset();
    const res = await fetch(`/api/news?tz_offset_minutes=${offset}`);
    if (!res.ok) return demoNewsFeed();
    return normalizeNewsFeed(await res.json());
  } catch {
    return demoNewsFeed();
  }
}
