import { useEffect, useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { askAdvisor } from '../api/client';
import { generateInsights, localAnswer, planSummary, type AdvisorIntent } from '../engine/insights';
import { useI18n } from '../i18n/useI18n';
import type { ChatMessage } from '../types';

const QUICK: { id: AdvisorIntent; key: string }[] = [
  { id: 'house', key: 'advisor.q.house' },
  { id: 'first', key: 'advisor.q.first' },
  { id: 'gap', key: 'advisor.q.gap' },
  { id: 'emergency', key: 'advisor.q.emergency' },
];

export default function Advisor() {
  const plan = usePlan();
  const profile = useStore((s) => s.profile);
  const chat = useStore((s) => s.chat);
  const addChat = useStore((s) => s.addChat);
  const clearChat = useStore((s) => s.clearChat);
  const { locale, t, tc } = useI18n();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = end.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [chat, loading]);

  async function send(text: string, intent?: AdvisorIntent) {
    const q = text.trim();
    if (!q) { setError(t('advisor.typeFirst')); return; }
    setError('');
    const user: ChatMessage = { role: 'user', content: q };
    addChat(user);
    setInput('');
    setLoading(true);
    try {
      const reply = await askAdvisor([...chat, user], planSummary(plan, profile, locale), locale);
      const body = reply.source === 'engine'
        ? `${localAnswer(q, plan, profile, locale, intent)}\n\n${t(reply.provider === 'anthropic' ? 'advisor.hint.anthropic' : 'advisor.hint.gemini')}`
        : reply.reply;
      addChat({ role: 'assistant', content: body });
    } catch (err) {
      const down = err instanceof TypeError;
      const note = down ? t('advisor.offline') : t('advisor.problem');
      addChat({ role: 'assistant', content: `${localAnswer(q, plan, profile, locale, intent)}\n\n${note}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid g3">
      <Card title={t('advisor.title')} subtitle={t('advisor.subtitle')} className="span2"
        actions={<button className="btn sm" onClick={clearChat}>{t('advisor.clear')}</button>}>
        <div className="chat">
          {!chat.length && <p className="muted">{t('advisor.empty')}</p>}
          {chat.map((m, i) => <div key={i} className={`msg ${m.role}`}>{m.content}</div>)}
          {loading && <div className="msg assistant">{t('advisor.thinking')}</div>}
          <div ref={end} />
        </div>
        <div className="chips" style={{ marginBottom: 10 }}>
          {QUICK.map((q) => <button key={q.id} className="chip" onClick={() => send(t(q.key), q.id)}>{t(q.key)}</button>)}
        </div>
        <form className="row" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <input value={input} onChange={(e) => { setInput(e.target.value); setError(''); }} placeholder={t('advisor.placeholder')} style={{ flex: 1 }} />
          <button className="btn primary" type="submit" disabled={loading}>{t('advisor.send')}</button>
        </form>
        {error && <p className="tone-red" style={{ fontSize: 13, margin: '6px 0 0' }}>{error}</p>}
      </Card>
      <Card title={t('advisor.sees')}>
        {generateInsights(plan, profile).map((s, i) => <div key={i} className="insight"><span className="dot" />{tc(s)}</div>)}
      </Card>
    </div>
  );
}
