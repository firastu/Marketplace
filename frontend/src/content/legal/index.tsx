import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LEGAL, type LegalPage } from '@/config/legal';
import { SITE_NAME } from '@/config/site';
import { LegalDoc, type LegalWriter } from '@/components/legal/kit';
import { isLocale, type Locale } from '@/i18n/config';
import { alternates, OG_LOCALE } from '@/i18n/seo';
import imprintAr from './imprint.ar';
import imprintEn from './imprint.en';
import privacyAr from './privacy.ar';
import privacyEn from './privacy.en';
import rulesAr from './rules.ar';
import rulesEn from './rules.en';
import termsAr from './terms.ar';
import termsEn from './terms.en';

/**
 * The legal texts are long, so they live here as server-rendered TSX (one
 * file per page and language) instead of in messages/*.json, which is sent
 * to the browser with every page. Only their titles are in the messages.
 */
const WRITERS: Record<LegalPage, Record<Locale, LegalWriter>> = {
  terms: { ar: termsAr, en: termsEn },
  privacy: { ar: privacyAr, en: privacyEn },
  rules: { ar: rulesAr, en: rulesEn },
  imprint: { ar: imprintAr, en: imprintEn },
};

type Props = { params: Promise<{ locale: string }> };

/**
 * Page component and metadata for one legal route:
 *   const route = legalRoute('terms');
 *   export const generateMetadata = route.generateMetadata;
 *   export default route.Page;
 */
export function legalRoute(page: LegalPage) {
  async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};
    const t = await getTranslations({ locale, namespace: 'legal' });
    const title = t(`pages.${page}`);
    const description = t(`description.${page}`, { site: SITE_NAME });
    return {
      title,
      description,
      alternates: alternates(locale, `/${page}`),
      openGraph: { title, description, siteName: SITE_NAME, locale: OG_LOCALE[locale] },
    };
  }

  async function Page({ params }: Props) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();
    setRequestLocale(locale);
    return <LegalDoc locale={locale} page={page} content={WRITERS[page][locale](LEGAL)} />;
  }

  return { generateMetadata, Page };
}
