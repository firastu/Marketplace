import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import Header from '@/components/Header';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/config/site';

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f3ec' },
    { media: '(prefers-color-scheme: dark)', color: '#121021' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Set lang="ar" dir="rtl" here once Arabic ships: the layout mirrors.
    <html lang="en" dir="ltr">
      <body>
        <Providers>
          <Header />
          <main id="main">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
