import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, isLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;
  return {
    locale,
    // Only the active language is loaded and sent to the browser.
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: 'Asia/Damascus',
  };
});
