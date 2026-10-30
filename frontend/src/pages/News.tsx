import { useEffect, useState } from 'react';
import { fetchNews, type NewsFeed } from '../api/client';
import { Badge, Card } from '../components/ui/Card';
import { demoNewsFeed } from '../data/demoNews';
import { useStore } from '../store/useStore';
import type { NewsArticle, NewsScope } from '../types';
import { localDay, shiftLocalDay } from '../utils/format';
import { formatDayKey } from '../i18n/useI18n';
import { useI18n } from '../i18n/useI18n';

type ScopeFilter = 'all' | NewsScope;

const FILTERS: { id: ScopeFilter; label: string }[] = [
  { id: 'all', label: 'news.all' },
  { id: 'in', label: 'news.india' },
  { id: 'global', label: 'news.global' },
];

export default function News() {
  const readNews = useStore((s) => s.readNews);
  const markNewsRead = useStore((s) => s.markNewsRead);
  const markDayRead = useStore((s) => s.markDayRead);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [configured, setConfigured] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<ScopeFilter>('all');
  const { locale, t, formatWhen } = useI18n();

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setDemo(false);

    function show(feed: NewsFeed) {
      setConfigured(feed.configured);
      setArticles(Array.isArray(feed.articles) ? feed.articles : []);
      setFetchedAt(feed.fetchedAt);
      setDemo(Boolean(feed.demo));
    }

    fetchNews()
      .then((feed) => {
        if (!live) return;
        try {
          if (!feed || !Array.isArray(feed.articles)) throw new Error('bad feed');
          show(feed);
        } catch {
          show(demoNewsFeed());
        }
      })
      .catch(() => { if (live) show(demoNewsFeed()); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [reloadKey]);

  const today = localDay();
  const yesterday = shiftLocalDay(-1);
  const days = [
    { key: today, title: t('news.today') },
    { key: yesterday, title: t('news.yesterday') },
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
        <div className="chips" role="group" aria-label={t('news.region')}>
          {FILTERS.map((item) => (
            <button key={item.id} className={`chip ${scope === item.id ? 'active' : ''}`} onClick={() => setScope(item.id)}>
              {t(item.label)}
            </button>
          ))}
        </div>
        <div className="row">
          {fetchedAt && <p className="muted">{t('news.updated', { time: formatWhen(fetchedAt, 'time') })}</p>}
          <button className="btn sm" onClick={() => setReloadKey((n) => n + 1)} disabled={loading}>{t('news.refresh')}</button>
        </div>
      </div>

      <p className="muted">{t('news.original')}</p>
      {loading && <Card><p className="muted">{t('news.loading')}</p></Card>}
      {!loading && demo && (
        <Card title={t('news.demoTitle')}>
          <p className="muted">{t('news.demoNotice')}</p>
        </Card>
      )}
      {!loading && !configured && (
        <Card title={t('news.setupTitle')} subtitle={t('news.setupSub')}>
          <ol className="news-steps">
            <li><a href="https://www.marketaux.com/register" target="_blank" rel="noopener noreferrer">marketaux.com/register</a> — {t('news.step1')}</li>
            <li>{t('news.step2')}</li>
            <li>{t('news.step3')}</li>
          </ol>
        </Card>
      )}

      {!loading && configured && days.map((day) => {
        const stories = storiesFor(day.key);
        const unread = stories.filter((article) => !(readNews[day.key] ?? []).includes(article.id));
        return (
          <Card
            key={day.key}
            title={day.title}
            subtitle={formatDayKey(locale, day.key)}
            actions={stories.length > 0 && (
              <div className="row">
                <Badge tone={unread.length ? 'blue' : 'gray'}>{unread.length ? t('news.unread', { count: unread.length }) : t('news.allRead')}</Badge>
                <button className="btn sm" disabled={unread.length === 0} onClick={() => markDayRead(day.key, stories.map((article) => article.id))}>
                  {t('news.markAll')}
                </button>
              </div>
            )}
          >
            {stories.length === 0 && <p className="muted">{scope === 'in' ? t('news.emptyIndia') : scope === 'global' ? t('news.emptyGlobal') : t('news.emptyAll')}</p>}
            {stories.map((article) => {
              const read = (readNews[day.key] ?? []).includes(article.id);
              return (
                <article key={article.id} className={`news-item ${read ? 'read' : 'unread'} ${article.imageUrl ? '' : 'no-thumb'}`}>
                  {article.imageUrl && <img className="news-thumb" src={article.imageUrl} alt="" />}
                  <div>
                    <div className="row">
                      <Badge tone={read ? 'gray' : 'blue'}>{read ? t('news.read') : t('news.unreadBadge')}</Badge>
                      {demo && <Badge tone="gray">{t('news.demoBadge')}</Badge>}
                      <Badge tone={article.scope === 'in' ? 'green' : 'purple'}>{article.scope === 'in' ? t('news.india') : t('news.global')}</Badge>
                      <span className="muted">{[formatWhen(article.publishedAt, 'time'), article.source].filter(Boolean).join(' · ')}</span>
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
      {!loading && configured && !demo && (
        <p className="muted">{t('news.footer')}</p>
      )}
    </div>
  );
}
