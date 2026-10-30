import { useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { NumberField } from '../components/ui/Inputs';
import { useStore } from '../store/useStore';
import { DEFAULT_ASSUMPTIONS } from '../data/templates';
import { LOCALES } from '../i18n/translate';
import { useI18n } from '../i18n/useI18n';
import { THEME_OPTIONS } from '../theme';

export default function Settings() {
  const s = useStore();
  const a = s.assumptions;
  const set = s.setAssumptions;
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const { locale, setLocale, t } = useI18n();

  function exportJson() {
    const data = { profile: s.profile, tax: s.tax, goals: s.goals, completedGoals: s.completedGoals, assumptions: s.assumptions, scenario: s.scenario, weights: s.weights, savedScenarios: s.savedScenarios };
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
        setMsg(s.importState(JSON.parse(t)) ? translateImport('imported') : translateImport('bad'));
      } catch {
        setMsg(translateImport('read'));
      }
    });
  }

  function translateImport(kind: 'imported' | 'bad' | 'read') {
    return kind === 'imported' ? t('settings.imported') : kind === 'bad' ? t('settings.importBad') : t('settings.importRead');
  }

  return (
    <div className="grid g2">
      <Card className="span2" title={t('settings.language')} subtitle={t('settings.languageSub')}>
        <div className="chips" role="radiogroup" aria-label={t('lang.label')}>
          {LOCALES.map((item) => (
            <button key={item.id} type="button" className={`chip ${locale === item.id ? 'active' : ''}`} aria-pressed={locale === item.id} onClick={() => setLocale(item.id)}>{item.native}</button>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 10 }}>{t('lang.note')}</p>
      </Card>
      <Card className="span2" title={t('settings.appearance')} subtitle={t('settings.appearanceSub')}>
        <div className="theme-choices">
          {THEME_OPTIONS.map((o) => (
            <button key={o.id} type="button" className={`theme-choice ${s.theme === o.id ? 'active' : ''}`} aria-pressed={s.theme === o.id} onClick={() => s.setTheme(o.id)}>
              <span className={`theme-preview ${o.id}`} aria-hidden="true">
                <span className="pv-side" />
                <span className="pv-main">
                  <span className="pv-bar" />
                  <span className="pv-line" />
                  <span className="pv-line short" />
                </span>
              </span>
              <span><b>{t(`theme.${o.id}`)}</b><span className="muted">{t(`theme.${o.id}Detail`)}</span></span>
            </button>
          ))}
        </div>
      </Card>
      <Card title={t('settings.assumptions')} subtitle={t('settings.assumptionsSub')}
        actions={<button className="btn sm" onClick={() => set(DEFAULT_ASSUMPTIONS)}>{t('settings.restore')}</button>}>
        <div className="grid auto">
          <NumberField label={t('settings.inflation')} value={a.inflation} step={0.5} onChange={(v) => set({ inflation: v })} />
          <NumberField label={t('settings.equity')} value={a.equityReturn} step={0.5} onChange={(v) => set({ equityReturn: v })} />
          <NumberField label={t('settings.debt')} value={a.debtReturn} step={0.5} onChange={(v) => set({ debtReturn: v })} />
          <NumberField label={t('settings.fd')} value={a.fdReturn} step={0.5} onChange={(v) => set({ fdReturn: v })} />
          <NumberField label={t('settings.gold')} value={a.goldReturn} step={0.5} onChange={(v) => set({ goldReturn: v })} />
          <NumberField label={t('settings.equityVol')} value={a.equityVol} step={1} onChange={(v) => set({ equityVol: v })} />
          <NumberField label={t('settings.debtVol')} value={a.debtVol} step={1} onChange={(v) => set({ debtVol: v })} />
          <NumberField label={t('settings.goldVol')} value={a.goldVol} step={1} onChange={(v) => set({ goldVol: v })} />
          <NumberField label={t('settings.stepUp')} value={a.sipStepUp} step={1} onChange={(v) => set({ sipStepUp: v })} />
          <NumberField label={t('settings.mcRuns')} value={a.mcRuns} step={100} min={100} onChange={(v) => set({ mcRuns: Math.min(3000, Math.round(v)) })} />
        </div>
      </Card>
      <Card title={t('settings.data')} subtitle={t('settings.dataSub')}>
        <div className="list-item"><div style={{ flex: 1 }}><b>{t('settings.export')}</b><p className="muted">{t('settings.exportSub')}</p></div><button className="btn" onClick={exportJson}>{t('settings.exportBtn')}</button></div>
        <div className="list-item"><div style={{ flex: 1 }}><b>{t('settings.import')}</b><p className="muted">{t('settings.importSub')}</p></div>
          <button className="btn" onClick={() => file.current?.click()}>{t('settings.importBtn')}</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </div>
        <div className="list-item"><div style={{ flex: 1 }}><b>{t('settings.pdf')}</b><p className="muted">{t('settings.pdfSub')}</p></div><button className="btn" onClick={() => window.print()}>{t('settings.pdfBtn')}</button></div>
        <div className="list-item"><div style={{ flex: 1 }}><b>{t('settings.sample')}</b><p className="muted">{t('settings.sampleSub')}</p></div>
          <button className="btn" onClick={() => confirm(t('settings.confirmSample')) && s.resetSample()}>{t('settings.sampleBtn')}</button></div>
        <div className="list-item"><div style={{ flex: 1 }}><b>{t('settings.fresh')}</b><p className="muted">{t('settings.freshSub')}</p></div>
          <button className="btn danger" onClick={() => confirm(t('settings.confirmClear')) && s.clearAll()}>{t('settings.clearBtn')}</button></div>
        {msg && <p className="muted" style={{ marginTop: 8 }}>{msg}</p>}
      </Card>
    </div>
  );
}
