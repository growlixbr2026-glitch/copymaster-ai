
import { useMemo, useCallback } from 'react';
import { translations } from '../utils/translations';

export const useTranslation = (languageFullString: string) => {
  const code = useMemo(() => {
    if (!languageFullString) return 'en';
    const lower = languageFullString.toLowerCase();
    if (lower.includes('português')) return 'pt';
    if (lower.includes('español')) return 'es';
    if (lower.includes('english')) return 'en';
    return 'en';
  }, [languageFullString]);

  const t = useCallback((key: string) => {
    return translations[code]?.[key] || translations['en']?.[key] || key;
  }, [code]);

  return useMemo(() => ({ t, langCode: code }), [t, code]);
};
