'use client';

import {
  createContext,
  FormEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, ShieldX } from 'lucide-react';
import { useErrorText } from '@/i18n/errors';
import { Link, usePathname } from '@/i18n/navigation';
import { useFormat } from '@/i18n/use-format';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { AdminStats, getAdminStats } from '@/services/admin.service';
import { isStaff } from '@/services/auth.service';
import { Button, buttonClass } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Textarea } from '@/components/ui/Field';
import styles from './admin.module.css';

interface AdminContextValue {
  stats: AdminStats | null;
  /** Call after an action that changes the queues. */
  refreshStats: () => void;
}

const AdminContext = createContext<AdminContextValue>({ stats: null, refreshStats: () => {} });

export function useAdmin(): AdminContextValue {
  return useContext(AdminContext);
}

const SECTIONS = [
  { href: '/admin', key: 'overview' },
  { href: '/admin/reports', key: 'reports' },
  { href: '/admin/listings', key: 'listings' },
  { href: '/admin/log', key: 'log' },
] as const;

/**
 * Frame of the moderation area: lets only moderators and admins in, and
 * shows the section tabs with the size of each queue.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { user } = useRequireAuth();
  const pathname = usePathname();
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const fmt = useFormat();
  const staff = isStaff(user);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!staff) return;
    let cancelled = false;
    getAdminStats()
      .then((s) => !cancelled && setStats(s))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [staff, tick]);

  const refreshStats = useCallback(() => setTick((n) => n + 1), []);
  const value = useMemo(() => ({ stats, refreshStats }), [stats, refreshStats]);

  if (!user) return <div className="container page" aria-busy="true" />;

  if (!staff) {
    return (
      <div className="container page">
        <EmptyState
          icon={ShieldX}
          title={t('forbiddenTitle')}
          actions={
            <Link href="/" className={buttonClass({ variant: 'primary' })}>
              {tc('browseListings')}
            </Link>
          }
        >
          {t('forbiddenBody')}
        </EmptyState>
      </div>
    );
  }

  const counts: Record<string, number | undefined> = {
    reports: stats?.openReports,
    listings: stats?.pendingListings,
  };

  return (
    <AdminContext.Provider value={value}>
      <div className={`container page ${styles.shell}`}>
        <div className="page-title">
          <h1>{t('title')}</h1>
          <span className="badge badge--info">{t(`role.${user.role === 'admin' ? 'admin' : 'moderator'}`)}</span>
        </div>
        <nav className="tabs" aria-label={t('sections')}>
          {SECTIONS.map(({ href, key }) => {
            const count = counts[key];
            return (
              <Link
                key={href}
                href={href}
                className={`tab ${styles.navTab}`}
                aria-current={pathname === href ? 'page' : undefined}
              >
                {t(`nav.${key}`)}
                {count !== undefined && count > 0 && (
                  <span className="count-dot" aria-label={t('waiting', { n: fmt.number(count) })}>
                    {fmt.number(count)}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </AdminContext.Provider>
  );
}

interface ActionDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** What will happen, in a sentence or two. */
  children?: ReactNode;
  /** Label of the text field (a reason or a note). */
  fieldLabel: string;
  fieldHint?: string;
  required?: boolean;
  confirmLabel: string;
  danger?: boolean;
  /** Rejecting keeps the dialog open and shows the error. */
  onConfirm: (text: string) => Promise<void>;
}

/** Confirmation for a moderation action, with its reason or note. */
export function ActionDialog({
  open,
  onClose,
  title,
  children,
  fieldLabel,
  fieldHint,
  required,
  confirmLabel,
  danger,
  onConfirm,
}: ActionDialogProps) {
  const tc = useTranslations('common');
  const t = useTranslations('admin');
  const errorText = useErrorText();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setText('');
      setError('');
      setBusy(false);
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onConfirm(text.trim());
      onClose();
    } catch (err) {
      setError(errorText(err, t('actionFailed')));
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="form">
        {children && <div className={styles.dialogText}>{children}</div>}
        {error && (
          <div className="notice notice--danger" role="alert">
            <CircleAlert aria-hidden="true" />
            <span className="notice__body">{error}</span>
          </div>
        )}
        <Field label={fieldLabel} htmlFor="action-text" hint={fieldHint}>
          <Textarea
            id="action-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={1000}
            dir="auto"
            required={required}
            // The API refuses reasons shorter than three characters.
            minLength={required ? 3 : undefined}
            aria-describedby={fieldHint ? 'action-text-hint' : undefined}
            data-autofocus
          />
        </Field>
        <div className={styles.dialogButtons}>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

interface PagerProps {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}

export function Pager({ page, totalPages, onPage }: PagerProps) {
  const t = useTranslations('admin');
  const fmt = useFormat();
  if (totalPages <= 1) return null;
  return (
    <nav className={styles.pager} aria-label={t('pages')}>
      <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t('previous')}
      </Button>
      <span className="muted">
        {t('pageOf', { page: fmt.number(page), total: fmt.number(totalPages) })}
      </span>
      <Button size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        {t('next')}
      </Button>
    </nav>
  );
}

/** "Sami (@sami)" as a link to the public profile. */
export function Person({
  person,
}: {
  person: { id: string; username: string; displayName: string | null } | null | undefined;
}) {
  const t = useTranslations('admin');
  if (!person) return <span className="muted">{t('unknownUser')}</span>;
  return (
    <Link href={`/users/${person.id}`} className="link">
      <bdi>{person.displayName || person.username}</bdi>{' '}
      <bdi dir="ltr" className={styles.handle}>
        @{person.username}
      </bdi>
    </Link>
  );
}
