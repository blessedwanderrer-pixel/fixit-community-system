import React from 'react';
import { type Language } from '../../i18n/dictionaries';
import { useI18n } from '../../i18n/I18nContext';

const options: Array<{ code: Language; label: string }> = [
  { code: 'en', label: 'EN' },
  { code: 'ur', label: 'اردو' },
  { code: 'ps', label: 'پښتو' },
];

export const LanguageSwitcher: React.FC<{ mobile?: boolean }> = ({ mobile = false }) => {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={`nav-language-selector${mobile ? ' nav-language-selector--mobile' : ''}`}
      role="group"
      aria-label={t('Select language')}
    >
      {options.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          lang={code}
          dir={code === 'en' ? 'ltr' : 'rtl'}
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
          className="nav-language-selector__option"
        >
          {label}
        </button>
      ))}
    </div>
  );
};
