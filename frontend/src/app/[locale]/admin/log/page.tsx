'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollText, WifiOff } from 'lucide-react';
import { useErrorText } from '@/i18n/errors';
import { Link } from '@/i18n/navigation';
import { useFormat } from '@/i18n/use-format';
import {
  getModerationLog,
  MODERATION_ACTIONS,
  ModerationAction,
  ModerationActionType,
  Paginated,
} from '@/services/admin.service';
import { humanise } from '@/utils/format';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pager, Person } from '../AdminShell';
import styles from '../admin.module.css';

const TONE: Record<string, string> = {
  approve_listing: 'badge badge--success',
  restore_listing: 'badge badge--success',
  reactivate_user: 'badge badge--success',
  remove_listing: 'badge badge--danger',
  suspend_user: 'badge badge--danger',
  resolve_report: 'badge badge--info',
  dismiss_report: 'badge',
};

function isKnown(action: string): action is ModerationActionType {
  return (MODERATION_ACTIONS as readonly string[]).includes(action);
}

type State = Paginated<ModerationAction> | { error: unknown } | null;

/** Who did what, when and why: newest first. */
export default function ModerationLog() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const fmt = useFormat();
  const errorText = useErrorText();
  const [page, setPage] = useState(1);
  const [state, setState] = useState<State>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getModerationLog(page)
      .then((res) => !cancelled && setState(res))
      .catch((error) => !cancelled && setState({ error }));
    return () => {
      cancelled = true;
    };
  }, [page, reload]);

  const target = (entry: ModerationAction) => {
    if (entry.targetType === 'listing') {
      return (
        <Link href={`/listings/${entry.targetId}`} className="link">
          {t('log.listing')}
        </Link>
      );
    }
    if (entry.targetType === 'user') {
      return (
        <Link href={`/users/${entry.targetId}`} className="link">
          {t('log.user')}
        </Link>
      );
    }
    return t('log.report');
  };

  return (
    <>
      <h2 className="visually-hidden">{t('nav.log')}</h2>

      {state === null && (
        <div className={`skeleton ${styles.tableSkeleton}`} aria-busy="true" aria-label={t('loading')} />
      )}

      {state && 'error' in state && (
        <EmptyState
          icon={WifiOff}
          title={t('loadErrorTitle')}
          actions={
            <Button
              variant="primary"
              onClick={() => {
                setState(null);
                setReload((n) => n + 1);
              }}
            >
              {tc('tryAgain')}
            </Button>
          }
        >
          {errorText(state.error)}
        </EmptyState>
      )}

      {state && 'data' in state && state.data.length === 0 && (
        <EmptyState icon={ScrollText} title={t('log.emptyTitle')}>
          {t('log.emptyBody')}
        </EmptyState>
      )}

      {state && 'data' in state && state.data.length > 0 && (
        <>
          {/* A table on wide screens; each row folds into a card on phones. */}
          <div className={`card ${styles.tableWrap}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{t('log.when')}</th>
                  <th scope="col">{t('log.action')}</th>
                  <th scope="col">{t('log.target')}</th>
                  <th scope="col">{t('log.moderator')}</th>
                  <th scope="col">{t('log.reason')}</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((entry) => (
                  <tr key={entry.id}>
                    <td data-label={t('log.when')}>
                      <time dateTime={entry.createdAt}>
                        {fmt.shortWhen(entry.createdAt)}
                      </time>
                    </td>
                    <td data-label={t('log.action')}>
                      <span className={TONE[entry.action] ?? 'badge'}>
                        {isKnown(entry.action) ? t(`log.actions.${entry.action}`) : humanise(entry.action)}
                      </span>
                    </td>
                    <td data-label={t('log.target')}>{target(entry)}</td>
                    <td data-label={t('log.moderator')}>
                      <Person person={entry.moderator} />
                    </td>
                    <td data-label={t('log.reason')}>
                      {entry.reason ? (
                        <span dir="auto">{entry.reason}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={state.meta.page}
            totalPages={state.meta.totalPages}
            onPage={(next) => {
              setPage(next);
              setState(null);
            }}
          />
        </>
      )}
    </>
  );
}
