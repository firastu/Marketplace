'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Inbox, WifiOff } from 'lucide-react';
import { useErrorText } from '@/i18n/errors';
import { Link } from '@/i18n/navigation';
import { useFormat } from '@/i18n/use-format';
import {
  AdminReport,
  getAdminReports,
  Paginated,
  reactivateUser,
  removeListing,
  ReportFilter,
  restoreListing,
  suspendUser,
  updateReport,
} from '@/services/admin.service';
import { StatusBadge } from '@/components/bits';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Feedback';
import { ActionDialog, Pager, Person, useAdmin } from '../AdminShell';
import styles from '../admin.module.css';

const FILTERS: ReportFilter[] = ['open', 'under_review', 'resolved', 'dismissed', 'all'];

const STATUS_TONE: Record<string, string> = {
  open: 'badge badge--warning',
  under_review: 'badge badge--info',
  resolved: 'badge badge--success',
  dismissed: 'badge',
};

type ActionKind =
  | 'resolve'
  | 'dismiss'
  | 'removeListing'
  | 'restoreListing'
  | 'suspendUser'
  | 'reactivateUser';

/** Which actions need a reason, and which are destructive. */
const ACTIONS: Record<ActionKind, { required: boolean; danger: boolean }> = {
  resolve: { required: false, danger: false },
  dismiss: { required: false, danger: false },
  removeListing: { required: true, danger: true },
  restoreListing: { required: false, danger: false },
  suspendUser: { required: true, danger: true },
  reactivateUser: { required: false, danger: false },
};

type State = Paginated<AdminReport> | { error: unknown } | null;

export default function ReportsQueue() {
  const t = useTranslations('admin');
  const tr = useTranslations('report');
  const tc = useTranslations('common');
  const fmt = useFormat();
  const toast = useToast();
  const errorText = useErrorText();
  const { stats, refreshStats } = useAdmin();
  const [filter, setFilter] = useState<ReportFilter>('open');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<State>(null);
  const [reload, setReload] = useState(0);
  const [pending, setPending] = useState<{ kind: ActionKind; report: AdminReport } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminReports(filter, page)
      .then((res) => !cancelled && setState(res))
      .catch((error) => !cancelled && setState({ error }));
    return () => {
      cancelled = true;
    };
  }, [filter, page, reload]);

  const refresh = useCallback(() => {
    setReload((n) => n + 1);
    refreshStats();
  }, [refreshStats]);

  const markUnderReview = async (report: AdminReport) => {
    setBusyId(report.id);
    try {
      await updateReport(report.id, 'under_review');
      toast(t('done.under_review'), 'success');
      refresh();
    } catch (err) {
      toast(errorText(err, t('actionFailed')), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const run = async (text: string) => {
    if (!pending) return;
    const { kind, report } = pending;
    const listingId = report.listing?.id;
    const userId = report.user?.id;
    if (kind === 'resolve') await updateReport(report.id, 'resolved', text);
    else if (kind === 'dismiss') await updateReport(report.id, 'dismissed', text);
    else if (kind === 'removeListing' && listingId) await removeListing(listingId, text);
    else if (kind === 'restoreListing' && listingId) await restoreListing(listingId, text);
    else if (kind === 'suspendUser' && userId) await suspendUser(userId, text);
    else if (kind === 'reactivateUser' && userId) await reactivateUser(userId, text);
    toast(t(`done.${kind}`), 'success');
    refresh();
  };

  const changeFilter = (next: ReportFilter) => {
    setFilter(next);
    setPage(1);
    setState(null);
  };

  const targetName = (report: AdminReport) =>
    report.listing?.title ?? report.user?.displayName ?? report.user?.username ?? '';

  return (
    <>
      <h2 className="visually-hidden">{t('nav.reports')}</h2>
      <div className={`tabs ${styles.filters}`} role="tablist" aria-label={t('reports.filterLabel')}>
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            className="tab"
            aria-selected={filter === key}
            onClick={() => changeFilter(key)}
          >
            {t(`reports.status.${key}`)}
            {key === 'open' && stats && (
              <span className="tab__count">{fmt.number(stats.openReports)}</span>
            )}
          </button>
        ))}
      </div>

      {state === null && (
        <ul className={styles.list} aria-busy="true" aria-label={t('loading')}>
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className={`skeleton ${styles.rowSkeleton}`} />
          ))}
        </ul>
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
        <EmptyState icon={Inbox} title={t('reports.emptyTitle')}>
          {filter === 'open' ? t('reports.emptyOpen') : t('reports.emptyOther')}
        </EmptyState>
      )}

      {state && 'data' in state && state.data.length > 0 && (
        <>
          <ul className={styles.list}>
            {state.data.map((report) => {
              const active = report.status === 'open' || report.status === 'under_review';
              const listing = report.listing;
              const person = report.user;
              const busy = busyId === report.id;
              return (
                <li key={report.id} className={`card ${styles.row}`}>
                  <div className={styles.rowHead}>
                    <span className="badge badge--danger">{tr(`reason.${report.reason}`)}</span>
                    <span className={STATUS_TONE[report.status] ?? 'badge'}>
                      {t(`reports.status.${report.status}`)}
                    </span>
                    {report.openReportsOnTarget > 1 && (
                      <span className="badge badge--warning">
                        {t('reports.openOnTarget', {
                          count: report.openReportsOnTarget,
                          n: fmt.number(report.openReportsOnTarget),
                        })}
                      </span>
                    )}
                    <time className={styles.when} dateTime={report.createdAt}>
                      {fmt.timeAgo(report.createdAt)}
                    </time>
                  </div>

                  <dl className={styles.facts}>
                    <div>
                      <dt>
                        {report.targetType === 'listing' ? t('reports.listing') : t('reports.user')}
                      </dt>
                      <dd>
                        {report.targetType === 'listing' ? (
                          listing ? (
                            <>
                              <Link href={`/listings/${listing.id}`} className="link" dir="auto">
                                {listing.title}
                              </Link>{' '}
                              <StatusBadge status={listing.status} />
                            </>
                          ) : (
                            <span className="muted">{t('reports.listingGone')}</span>
                          )
                        ) : (
                          <Person person={person} />
                        )}
                      </dd>
                    </div>
                    {report.targetType === 'listing' && (
                      <div>
                        <dt>{t('reports.seller')}</dt>
                        <dd>
                          <Person person={person} />
                        </dd>
                      </div>
                    )}
                    {person && !person.isActive && (
                      <div>
                        <dt>{t('reports.account')}</dt>
                        <dd>
                          <span className="badge badge--danger">{t('reports.suspended')}</span>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>{t('reports.reporter')}</dt>
                      <dd>
                        <Person person={report.reporter} />
                      </dd>
                    </div>
                    {report.details && (
                      <div>
                        <dt>{t('reports.details')}</dt>
                        <dd className={styles.quote} dir="auto">
                          {report.details}
                        </dd>
                      </div>
                    )}
                    {report.resolutionNote && (
                      <div>
                        <dt>{t('reports.note')}</dt>
                        <dd dir="auto">{report.resolutionNote}</dd>
                      </div>
                    )}
                    {report.resolvedAt && (
                      <div>
                        <dt>{t('reports.closed')}</dt>
                        <dd>{fmt.timeAgo(report.resolvedAt)}</dd>
                      </div>
                    )}
                  </dl>

                  <div className={styles.rowActions}>
                    {report.status === 'open' && (
                      <Button size="sm" loading={busy} onClick={() => markUnderReview(report)}>
                        {t('act.review')}
                      </Button>
                    )}
                    {active && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => setPending({ kind: 'resolve', report })}
                        >
                          {t('act.resolve')}
                        </Button>
                        <Button size="sm" onClick={() => setPending({ kind: 'dismiss', report })}>
                          {t('act.dismiss')}
                        </Button>
                      </>
                    )}
                    <span className={styles.spacer} />
                    {listing && listing.status !== 'removed' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setPending({ kind: 'removeListing', report })}
                      >
                        {t('act.removeListing')}
                      </Button>
                    )}
                    {listing && listing.status === 'removed' && (
                      <Button
                        size="sm"
                        onClick={() => setPending({ kind: 'restoreListing', report })}
                      >
                        {t('act.restoreListing')}
                      </Button>
                    )}
                    {person && person.isActive && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setPending({ kind: 'suspendUser', report })}
                      >
                        {t('act.suspendUser')}
                      </Button>
                    )}
                    {person && !person.isActive && (
                      <Button
                        size="sm"
                        onClick={() => setPending({ kind: 'reactivateUser', report })}
                      >
                        {t('act.reactivateUser')}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
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

      <ActionDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending ? t(`confirm.${pending.kind}.title`) : ''}
        fieldLabel={
          pending && ACTIONS[pending.kind].required ? t('reasonRequired') : t('noteOptional')
        }
        fieldHint={pending && ACTIONS[pending.kind].required ? t('reasonHint') : undefined}
        required={pending ? ACTIONS[pending.kind].required : false}
        danger={pending ? ACTIONS[pending.kind].danger : false}
        confirmLabel={pending ? t(`confirm.${pending.kind}.confirm`) : ''}
        onConfirm={run}
      >
        {pending && (
          <p>
            {t.rich(`confirm.${pending.kind}.body`, {
              name: targetName(pending.report),
              user: pending.report.user?.displayName || pending.report.user?.username || '',
              b: (chunks) => (
                <strong>
                  <bdi>{chunks}</bdi>
                </strong>
              ),
            })}
          </p>
        )}
      </ActionDialog>
    </>
  );
}
