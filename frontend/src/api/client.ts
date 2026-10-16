import type { ChatMessage, NewsArticle } from '../types';

export interface NewsFeed {
  configured: boolean;
  articles: NewsArticle[];
  fetchedAt: string | null;
}

export async function askAdvisor(messages: ChatMessage[], plan: unknown): Promise<string> {
  const res = await fetch('/api/advisor/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, plan }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.reply as string;
}

export async function fetchNews(): Promise<NewsFeed> {
  const offset = new Date().getTimezoneOffset();
  const res = await fetch(`/api/news?tz_offset_minutes=${offset}`);
  if (!res.ok) {
    let detail = 'Financial news is unavailable right now.';
    try {
      const body = await res.json();
      if (body.detail) detail = String(body.detail);
    } catch {
      /* keep the fallback */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<NewsFeed>;
}
