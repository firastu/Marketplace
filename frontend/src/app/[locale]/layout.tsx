import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import '../globals.css';
import { Providers } from './providers';
import { Footer } from '@/components/Footer';
import Header from '@/components/Header';
import { SITE_NAME, SITE_URL } from '@/config/site';
import { DIRECTION, isLocale, LOCALES } from '@/i18n/config';

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

// Both languages are prerendered: /… in Arabic and /en/… in English.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    // Relative URLs in metadata (canonical, og:image) resolve against this.
    metadataBase: new URL(SITE_URL),
    title: { default: t('titleDefault', { site: SITE_NAME }), template: `%s · ${SITE_NAME}` },
    description: t('description'),
    applicationName: SITE_NAME,
    openGraph: { siteName: SITE_NAME, locale: locale === 'ar' ? 'ar_SY' : 'en_US' },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f3ec' },
    { media: '(prefers-color-scheme: dark)', color: '#121021' },
  ],
};

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  // Only this language's messages are sent to the browser.
  const messages = await getMessages();

  return (
    <html lang={locale} dir={DIRECTION[locale]}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <Header />
            <main id="main">{children}</main>
            <Footer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
