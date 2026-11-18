'use client';

import { useTranslations } from 'next-intl';
import { ChevronRight, Flag, Hourglass, ScrollText } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useFormat } from '@/i18n/use-format';
import { useAdmin } from './AdminShell';
import styles from './admin.module.css';

/** Moderation dashboard: how much is waiting in each queue. */
export default function AdminOverview() {
  const t = useTranslations('admin');
  const fmt = useFormat();
  const { stats } = useAdmin();

  const cards = [
    {
      href: '/admin/reports',
      icon: Flag,
      label: t('stats.openReports'),
      hint: t('stats.openReportsHint'),
      value: stats?.openReports,
    },
    {
      href: '/admin/listings',
      icon: Hourglass,
      label: t('stats.pendingListings'),
      hint: t('stats.pendingListingsHint'),
      value: stats?.pendingListings,
    },
  ];

  return (
    <>
      <h2 className="visually-hidden">{t('nav.overview')}</h2>
      <ul className={styles.stats}>
        {cards.map(({ href, icon: Icon, label, hint, value }) => (
          <li key={href}>
            <Link href={href} className={`card ${styles.stat}`} data-waiting={!!value || undefined}>
              <span className={styles.statIcon} aria-hidden="true">
                <Icon />
              </span>
              <span className={styles.statText}>
                <span className={styles.statLabel}>{label}</span>
                <span className={styles.statValue} aria-busy={value === undefined || undefined}>
                  {value === undefined ? '–' : fmt.number(value)}
                </span>
                <span className="muted">{hint}</span>
              </span>
              <ChevronRight aria-hidden="true" className={`icon-flip ${styles.statChevron}`} />
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/admin/log" className={`card ${styles.logLink}`}>
        <ScrollText aria-hidden="true" />
        <span>
          <strong>{t('nav.log')}</strong>
          <span className="muted">{t('log.lead')}</span>
        </span>
        <ChevronRight aria-hidden="true" className="icon-flip" />
      </Link>
    </>
  );
}
