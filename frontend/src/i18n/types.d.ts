import type messages from '../../messages/en.json';
import type { Locale } from './config';

// Makes useTranslations() keys and useLocale() fully typed: a missing or
// misspelt message key fails `npm run typecheck`.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
