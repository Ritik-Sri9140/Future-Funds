import { LOCALES } from '../../i18n/translate';
import { useI18n } from '../../i18n/useI18n';

export default function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="lang-switch">
      <span className="sr-only">{t('lang.label')}</span>
      <select aria-label={t('lang.label')} value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)}>
        {LOCALES.map((item) => <option key={item.id} value={item.id}>{item.native}</option>)}
      </select>
    </label>
  );
}
