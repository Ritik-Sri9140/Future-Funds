import { useEffect, useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { usePlan } from '../hooks/usePlan';
import { useStore } from '../store/useStore';
import { askAdvisor } from '../api/client';
import { generateInsights, localAnswer, planSummary } from '../engine/insights';
import type { ChatMessage } from '../types';

const QUICK = [
  'Can I buy a house in 2031 and still retire at 55?',
  'Which goal should I fund first?',
  'How do I close my monthly gap?',
  'Is my emergency fund enough?',
];

export default function Advisor() {
  const plan = usePlan();
  const profile = useStore((s) => s.profile);
  const chat = useStore((s) => s.chat);
  const addChat = useStore((s) => s.addChat);
  const clearChat = useStore((s) => s.clearChat);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = end.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [chat, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q) { setError('Type a question first.'); return; }
    setError('');
    const user: ChatMessage = { role: 'user', content: q };
    addChat(user);
    setInput('');
    setLoading(true);
    try {
      const reply = await askAdvisor([...chat, user], planSummary(plan, profile));
      addChat({ role: 'assistant', content: reply });
    } catch (err) {
      const down = err instanceof TypeError;
      const note = down
        ? '\n\n(Offline mode: the advisor service is not running.)'
        : '\n\n(The advisor service had a problem, so this uses your saved plan.)';
      addChat({ role: 'assistant', content: `${localAnswer(q, plan, profile)}${note}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid g3">
      <Card title="Chat with your advisor" subtitle="Every number comes from the finance engine; the AI only explains it" className="span2"
        actions={<button className="btn sm" onClick={clearChat}>Clear</button>}>
        <div className="chat">
          {!chat.length && <p className="muted">Ask about your goals, trade-offs or what-ifs.</p>}
          {chat.map((m, i) => <div key={i} className={`msg ${m.role}`}>{m.content}</div>)}
          {loading && <div className="msg assistant">Thinking…</div>}
          <div ref={end} />
        </div>
        <div className="chips" style={{ marginBottom: 10 }}>
          {QUICK.map((q) => <button key={q} className="chip" onClick={() => send(q)}>{q}</button>)}
        </div>
        <form className="row" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <input value={input} onChange={(e) => { setInput(e.target.value); setError(''); }} placeholder="Can I retire at 55 if I get a 20% raise?" style={{ flex: 1 }} />
          <button className="btn primary" type="submit" disabled={loading}>Send</button>
        </form>
        {error && <p className="tone-red" style={{ fontSize: 13, margin: '6px 0 0' }}>{error}</p>}
      </Card>
      <Card title="What the engine sees">
        {generateInsights(plan, profile).map((s, i) => <div key={i} className="insight"><span className="dot" />{s}</div>)}
      </Card>
    </div>
  );
}
