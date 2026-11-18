import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { isPlaceholder, LEGAL, LEGAL_PAGES, type LegalConfig, type LegalPage } from '@/config/legal';
import { INTL_LOCALE, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import styles from './legal.module.css';

/**
 * Building blocks of the legal pages. They are server components: the long
 * texts in src/content/legal/ are rendered to HTML and add no JavaScript.
 */

export interface LegalSection {
  /** Anchor, e.g. "retention" → /privacy#retention. */
  id: string;
  title: string;
  body: ReactNode;
}

export interface LegalContent {
  intro: ReactNode;
  sections: LegalSection[];
}

export type LegalWriter = (c: LegalConfig) => LegalContent;

/**
 * A value from src/config/legal.ts. Shown left-to-right in both languages
 * (names, addresses, emails) and highlighted while it is still a placeholder.
 */
export function V({ children }: { children: string }) {
  return isPlaceholder(children) ? (
    <mark className={styles.placeholder} dir="ltr">
      {children}
    </mark>
  ) : (
    <bdi dir="ltr">{children}</bdi>
  );
}

/** An email address from the config, as a mailto link once it is filled in. */
export function Mail({ children }: { children: string }) {
  return isPlaceholder(children) ? (
    <V>{children}</V>
  ) : (
    <a className="link" href={`mailto:${children}`} dir="ltr">
      {children}
    </a>
  );
}

/** Link to another legal page (or a section of one) in the same language. */
export function Ref({ to, children }: { to: LegalPage | `${LegalPage}#${string}`; children: ReactNode }) {
  return (
    <Link href={`/${to}`} className="link">
      {children}
    </Link>
  );
}

interface DocProps {
  locale: Locale;
  page: LegalPage;
  content: LegalContent;
}

export async function LegalDoc({ locale, page, content }: DocProps) {
  const t = await getTranslations({ locale, namespace: 'legal' });
  const updated = new Date(`${LEGAL.version}T12:00:00Z`).toLocaleDateString(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <article className={`container page ${styles.doc}`}>
      <header className={styles.head}>
        <h1>{t(`pages.${page}`)}</h1>
        <p className="muted">{t('updated', { date: updated })}</p>
      </header>

      {LEGAL.draft && (
        <div className={`notice notice--warning ${styles.draft}`} role="note">
          <TriangleAlert aria-hidden="true" />
          <span className="notice__body">
            <strong>{t('draftTitle')}</strong> {t('draftBody')}
          </span>
        </div>
      )}

      <div className={styles.prose}>{content.intro}</div>

      <nav className={styles.toc} aria-labelledby="legal-toc">
        <h2 id="legal-toc">{t('contents')}</h2>
        <ol>
          {content.sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className={styles.prose}>
        {content.sections.map((section, index) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
            <h2 id={`${section.id}-title`}>
              <span className={styles.number}>
                {(index + 1).toLocaleString(INTL_LOCALE[locale])}.
              </span>{' '}
              {section.title}
            </h2>
            {section.body}
          </section>
        ))}
      </div>

      <nav className={styles.others} aria-label={t('heading')}>
        {LEGAL_PAGES.filter((other) => other !== page).map((other) => (
          <Link key={other} href={`/${other}`} className="chip">
            {t(`pages.${other}`)}
          </Link>
        ))}
      </nav>
    </article>
  );
}
