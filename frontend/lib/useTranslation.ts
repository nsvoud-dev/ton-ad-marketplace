'use client';

import { t, defaultLocale, type Locale, type TranslationKey } from './i18n';

export function useTranslation() {
  // Always use English as primary
  const locale: Locale = defaultLocale;
  // useEffect(() => {
  //   const code = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code?.toLowerCase?.();
  //   setLocale(code === 'ru' ? 'ru' : 'en');
  // }, []);

  return {
    t: (key: TranslationKey) => t(key, locale),
    locale,
  };
}
