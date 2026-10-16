import { useEffect, useState } from 'react';
import { fetchNews } from '../api/client';
import { Badge, Card } from '../components/ui/Card';
import { useStore } from '../store/useStore';
import type { NewsArticle, NewsScope } from '../types';
import { localDay, shiftLocalDay } from '../utils/format';

type ScopeFilter = 'all' | NewsScope;

const FILTERS: { id: ScopeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in', label: 'India' },
  { id: 'global', label: 'Global' },
];

function dayLabel(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function clock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export default function News() {
  const readNews = useStore((s) => s.readNews);
  const markNewsRead = useStore((s) => s.markNewsRead);
  const markDayRead = useStore((s) => s.markDayRead);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [configured, setConfigured] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scope, setScope] = useState<ScopeFilter>('all');

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    fetchNews()
      .then((feed) => {
        if (!live) return;
        setConfigured(feed.configured);
        setArticles(feed.articles);
        setFetchedAt(feed.fetchedAt);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : 'Financial news is unavailable right now.');
      })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [reloadKey]);

  const today = localDay();
  const yesterday = shiftLocalDay(-1);
  const days = [
    { key: today, title: 'Today' },
    { key: yesterday, title: 'Yesterday' },
  ];

  function storiesFor(day: string): NewsArticle[] {
    return articles
      .filter((article) => {
        const published = new Date(article.publishedAt);
        return !Number.isNaN(published.getTime()) && localDay(published) === day;
      })
      .filter((article) => scope === 'all' || article.scope === scope)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  return (
    <div className="grid">
      <div className="row spread">
        <div className="chips" role="group" aria-label="News region">
          {FILTERS.map((item) => (
            <button key={item.id} className={`chip ${scope === item.id ? 'active' : ''}`} onClick={() => setScope(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="row">
          {fetchedAt && <p className="muted">Updated {clock(fetchedAt)}</p>}
          <button className="btn sm" onClick={() => setReloadKey((n) => n + 1)} disabled={loading}>Refresh</button>
        </div>
      </div>

      {loading && <Card><p className="muted">Loading financial news…</p></Card>}
      {!loading && error && <Card title="News unavailable"><p className="muted">{error}</p></Card>}
      {!loading && !error && !configured && (
        <Card title="Add a Marketaux key" subtitle="The feed is financial news only, for India and the rest of the world.">
          <ol className="news-steps">
            <li>Create a free key at <a href="https://www.marketaux.com/register" target="_blank" rel="noopener noreferrer">marketaux.com/register</a>.</li>
            <li>Put it in <b>backend/.env</b> as <b>MARKETAUX_API_TOKEN</b>.</li>
            <li>Restart the backend, then press Refresh.</li>
          </ol>
        </Card>
      )}

      {!loading && !error && configured && days.map((day) => {
        const stories = storiesFor(day.key);
        const unread = stories.filter((article) => !(readNews[day.key] ?? []).includes(article.id));
        return (
          <Card
            key={day.key}
            title={day.title}
            subtitle={dayLabel(day.key)}
            actions={stories.length > 0 && (
              <div className="row">
                <Badge tone={unread.length ? 'blue' : 'gray'}>{unread.length ? `${unread.length} unread` : 'All read'}</Badge>
                <button className="btn sm" disabled={unread.length === 0} onClick={() => markDayRead(day.key, stories.map((article) => article.id))}>
                  Mark all read
                </button>
              </div>
            )}
          >
            {stories.length === 0 && <p className="muted">No financial stories for this day{scope === 'all' ? '' : scope === 'in' ? ' in India' : ' globally'}.</p>}
            {stories.map((article) => {
              const read = (readNews[day.key] ?? []).includes(article.id);
              return (
                <article key={article.id} className={`news-item ${read ? 'read' : 'unread'} ${article.imageUrl ? '' : 'no-thumb'}`}>
                  {article.imageUrl && <img className="news-thumb" src={article.imageUrl} alt="" />}
                  <div>
                    <div className="row">
                      <Badge tone={read ? 'gray' : 'blue'}>{read ? 'Read' : 'Unread'}</Badge>
                      <Badge tone={article.scope === 'in' ? 'green' : 'purple'}>{article.scope === 'in' ? 'India' : 'Global'}</Badge>
                      <span className="muted">{[clock(article.publishedAt), article.source].filter(Boolean).join(' · ')}</span>
                    </div>
                    <h3>
                      <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={() => markNewsRead(day.key, article.id)}>
                        {article.title}
                      </a>
                    </h3>
                    {article.summary && <p className="news-summary">{article.summary}</p>}
                  </div>
                </article>
              );
            })}
          </Card>
        );
      })}
      {!loading && configured && !error && (
        <p className="muted">Headlines from Marketaux. Open a story to read it at the source. Opening it marks that day’s copy as read.</p>
      )}
    </div>
  );
}
