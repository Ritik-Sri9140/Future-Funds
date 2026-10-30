import type { NewsArticle } from '../types';

type DemoStory = {
  id: string;
  scope: NewsArticle['scope'];
  daysAgo: number;
  title: string;
  summary: string;
};

const DEMO_STORIES: DemoStory[] = [
  {
    id: 'demo-rbi-hold',
    scope: 'in',
    daysAgo: 0,
    title: 'RBI holds the policy rate as retail inflation cools',
    summary: 'A sample headline: the policy rate stays put while inflation eases, and bond yields slip.',
  },
  {
    id: 'demo-global-earnings',
    scope: 'global',
    daysAgo: 0,
    title: 'Global stocks steady ahead of major earnings',
    summary: 'A sample headline: markets pause as investors wait for results from the largest companies.',
  },
  {
    id: 'demo-nifty-banks',
    scope: 'in',
    daysAgo: 1,
    title: 'Bank and IT shares lift the Nifty and Sensex',
    summary: 'A sample headline: domestic benchmarks close higher, led by banks and technology.',
  },
  {
    id: 'demo-crude-eases',
    scope: 'global',
    daysAgo: 1,
    title: 'Crude oil eases, supporting Asian currencies',
    summary: 'A sample headline: cheaper oil takes pressure off currencies that rely on energy imports.',
  },
];

function publishedAt(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(8, 0, 0, 0);
  return date.toISOString();
}

/** Sample headlines dated for today and yesterday in this browser. */
export function demoArticles(): NewsArticle[] {
  return DEMO_STORIES.map((story) => ({
    id: story.id,
    title: story.title,
    summary: story.summary,
    source: 'Future Funds demo',
    url: `https://example.com/future-funds/demo/${story.id}`,
    imageUrl: null,
    publishedAt: publishedAt(story.daysAgo),
    scope: story.scope,
  })).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function demoNewsFeed(): { configured: true; demo: true; articles: NewsArticle[]; fetchedAt: string } {
  return {
    configured: true,
    demo: true,
    articles: demoArticles(),
    fetchedAt: new Date().toISOString(),
  };
}
