import { useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { NumberField } from '../components/ui/Inputs';
import { useStore } from '../store/useStore';
import { DEFAULT_ASSUMPTIONS } from '../data/templates';

export default function Settings() {
  const s = useStore();
  const a = s.assumptions;
  const set = s.setAssumptions;
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  function exportJson() {
    const data = { profile: s.profile, goals: s.goals, completedGoals: s.completedGoals, assumptions: s.assumptions, scenario: s.scenario, weights: s.weights, savedScenarios: s.savedScenarios };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `future-funds-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importJson(f: File) {
    f.text().then((t) => {
      try {
        setMsg(s.importState(JSON.parse(t)) ? 'Plan imported.' : "That file isn't a Future Funds export.");
      } catch {
        setMsg("Couldn't read that file. Check it's valid JSON.");
      }
    });
  }

  return (
    <div className="grid g2">
      <Card title="Market assumptions" subtitle="Used by every calculation"
        actions={<button className="btn sm" onClick={() => set(DEFAULT_ASSUMPTIONS)}>Restore defaults</button>}>
        <div className="grid auto">
          <NumberField label="General inflation %" value={a.inflation} step={0.5} onChange={(v) => set({ inflation: v })} />
          <NumberField label="Equity return %" value={a.equityReturn} step={0.5} onChange={(v) => set({ equityReturn: v })} />
          <NumberField label="Debt return %" value={a.debtReturn} step={0.5} onChange={(v) => set({ debtReturn: v })} />
          <NumberField label="FD return %" value={a.fdReturn} step={0.5} onChange={(v) => set({ fdReturn: v })} />
          <NumberField label="Gold return %" value={a.goldReturn} step={0.5} onChange={(v) => set({ goldReturn: v })} />
          <NumberField label="Equity volatility %" value={a.equityVol} step={1} onChange={(v) => set({ equityVol: v })} />
          <NumberField label="Debt volatility %" value={a.debtVol} step={1} onChange={(v) => set({ debtVol: v })} />
          <NumberField label="Gold volatility %" value={a.goldVol} step={1} onChange={(v) => set({ goldVol: v })} />
          <NumberField label="Yearly SIP step-up %" value={a.sipStepUp} step={1} onChange={(v) => set({ sipStepUp: v })} />
          <NumberField label="Monte Carlo runs per goal" value={a.mcRuns} step={100} min={100} onChange={(v) => set({ mcRuns: Math.min(3000, Math.round(v)) })} />
        </div>
      </Card>
      <Card title="Your data" subtitle="Saved automatically in this browser">
        <div className="list-item"><div style={{ flex: 1 }}><b>Export plan</b><p className="muted">Download everything as a JSON file.</p></div><button className="btn" onClick={exportJson}>Export</button></div>
        <div className="list-item"><div style={{ flex: 1 }}><b>Import plan</b><p className="muted">Load a file exported earlier.</p></div>
          <button className="btn" onClick={() => file.current?.click()}>Import</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </div>
        <div className="list-item"><div style={{ flex: 1 }}><b>PDF roadmap</b><p className="muted">Print the current page or save it as PDF.</p></div><button className="btn" onClick={() => window.print()}>Print / PDF</button></div>
        <div className="list-item"><div style={{ flex: 1 }}><b>Load sample plan</b><p className="muted">Replace your data with the demo profile.</p></div>
          <button className="btn" onClick={() => confirm('Replace your data with the sample plan?') && s.resetSample()}>Load sample</button></div>
        <div className="list-item"><div style={{ flex: 1 }}><b>Start fresh</b><p className="muted">Clear profile, goals and scenarios.</p></div>
          <button className="btn danger" onClick={() => confirm('Delete all your data? This cannot be undone.') && s.clearAll()}>Clear all</button></div>
        {msg && <p className="muted" style={{ marginTop: 8 }}>{msg}</p>}
      </Card>
    </div>
  );
}
