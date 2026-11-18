import type { Metadata } from 'next';
import type { Messages } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { isLocale } from './config';

type Params = { params: Promise<{ locale: string }> };

/**
 * `generateMetadata` for a route whose <title> is one translated string:
 *   export const generateMetadata = titleMetadata('categories');
 */
export function titleMetadata(key: Exclude<keyof Messages['meta'], 'titleDefault'>) {
  return async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};
    const t = await getTranslations({ locale, namespace: 'meta' });
    return { title: t(key) };
  };
}
