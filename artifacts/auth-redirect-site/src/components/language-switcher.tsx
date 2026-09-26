import { ChevronDown } from 'lucide-react';
import { languages, useLanguage, type Language } from '@/lib/i18n';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label className={`language-switcher ${className}`}>
      <span className="sr-only">{t('language')}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        aria-label={t('language')}
      >
        {languages.map((item) => (
          <option value={item.code} key={item.code}>{item.label}</option>
        ))}
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </label>
  );
}