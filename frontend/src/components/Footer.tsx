'use client';

import { useTranslations } from 'next-intl';
import { LEGAL_PAGES } from '@/config/legal';
import { SITE_NAME } from '@/config/site';
import { Link, usePathname } from '@/i18n/navigation';
import styles from './Footer.module.css';

/** Full-height tasks (an open chat) have no room for a footer. */
function hidesFooter(pathname: string): boolean {
  return /^\/messages\/[^/]+/.test(pathname);
}

/** Light site footer: the legal pages and a copyright line. */
export function Footer() {
  const t = useTranslations('legal');
  const tm = useTranslations('meta');
  const pathname = usePathname();
  if (hidesFooter(pathname)) return null;

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <nav aria-label={t('heading')}>
          <ul className={styles.links}>
            {LEGAL_PAGES.map((page) => (
              <li key={page}>
                <Link href={`/${page}`}>{t(`pages.${page}`)}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className={styles.note}>
          <span dir="ltr">© {new Date().getFullYear()}</span> {SITE_NAME} · {tm('tagline')}
        </p>
      </div>
    </footer>
  );
}
