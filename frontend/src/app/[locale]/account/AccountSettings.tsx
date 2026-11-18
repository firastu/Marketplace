'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronRight,
  CircleAlert,
  Download,
  FileText,
  Gavel,
  Landmark,
  ScrollText,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useErrorText } from '@/i18n/errors';
import { Link, useRouter } from '@/i18n/navigation';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { ApiError } from '@/services/api-client';
import {
  changePassword,
  deleteAccount,
  downloadMyData,
  updateProfile,
} from '@/services/account.service';
import { isStaff } from '@/services/auth.service';
import { LEGAL_PAGES } from '@/config/legal';
import { Avatar } from '@/components/bits';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Feedback';
import { Field, Input, Textarea } from '@/components/ui/Field';
import styles from './page.module.css';

const LEGAL_ICONS = { terms: FileText, privacy: ShieldCheck, rules: ScrollText, imprint: Landmark };

function ErrorNotice({ children }: { children: ReactNode }) {
  return (
    <div className="notice notice--danger" role="alert">
      <CircleAlert aria-hidden="true" />
      <span className="notice__body">{children}</span>
    </div>
  );
}

export default function AccountSettings() {
  // After deleting the account we leave for the home page ourselves; the
  // guard must not send the (now logged-out) visitor to the login page.
  const [leaving, setLeaving] = useState(false);
  const { user, logout, updateUser, replaceToken } = useRequireAuth(!leaving);
  const router = useRouter();
  const toast = useToast();
  const t = useTranslations('account');
  const tn = useTranslations('nav');
  const tl = useTranslations('legal');
  const ta = useTranslations('auth');
  const tc = useTranslations('common');
  const errorText = useErrorText();

  // ── Profile ──────────────────────────────────────────
  const [profile, setProfile] = useState({ displayName: '', bio: '', phone: '' });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState('');
  const userId = user?.id;
  useEffect(() => {
    if (!user) return;
    setProfile({
      displayName: user.displayName ?? '',
      bio: user.bio ?? '',
      phone: user.phone ?? '',
    });
    // Fill the form once per account, not on every refresh of `user`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileBusy(true);
    try {
      updateUser(
        await updateProfile({
          displayName: profile.displayName.trim(),
          bio: profile.bio.trim(),
          phone: profile.phone.replace(/[\s()-]/g, ''),
        }),
      );
      toast(t('profileSaved'), 'success');
    } catch (err) {
      setProfileError(errorText(err, t('profileFailed')));
    } finally {
      setProfileBusy(false);
    }
  };

  // ── Password ─────────────────────────────────────────
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwMismatch, setPwMismatch] = useState(false);

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (pw.next !== pw.confirm) {
      setPwMismatch(true);
      document.getElementById('confirm-password')?.focus();
      return;
    }
    setPwBusy(true);
    try {
      const { accessToken } = await changePassword(pw.current, pw.next);
      replaceToken(accessToken);
      setPw({ current: '', next: '', confirm: '' });
      toast(t('passwordChanged'), 'success');
    } catch (err) {
      setPwError(errorText(err, t('passwordFailed')));
    } finally {
      setPwBusy(false);
    }
  };

  // ── Export ───────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadMyData();
      toast(t('exportStarted'), 'success');
    } catch (err) {
      toast(errorText(err, t('exportFailed')), 'error');
    } finally {
      setExporting(false);
    }
  };

  // ── Delete ───────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeletePassword('');
    setDeleteError('');
  };

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteBusy(true);
    try {
      await deleteAccount(deletePassword);
      setLeaving(true);
      setDeleteOpen(false);
      logout();
      toast(t('deleted'), 'success');
      router.replace('/');
    } catch (err) {
      // 400 here means the password did not match.
      const wrong = err instanceof ApiError && err.status === 400;
      setDeleteError(wrong ? t('deleteWrongPassword') : errorText(err, t('deleteFailed')));
      setDeleteBusy(false);
    }
  };

  if (!user) return <div className="container page page--narrow" aria-busy="true" />;
  const name = user.displayName || user.username;

  return (
    <div className={`container page page--narrow ${styles.page}`}>
      <div className="page-title">
        <h1>{t('title')}</h1>
      </div>

      <section className={`card card--pad ${styles.identity}`}>
        <Avatar name={name} size="lg" />
        <div className={styles.identityText}>
          <p className={styles.name} dir="auto">
            {name}
          </p>
          <p className="muted">
            <bdi dir="ltr">@{user.username}</bdi>
          </p>
          <p className="muted">
            <bdi dir="ltr">{user.email}</bdi>
          </p>
        </div>
        {isStaff(user) && (
          <Link href="/admin" className="btn btn--sm">
            <Gavel aria-hidden="true" />
            {tn('moderation')}
          </Link>
        )}
      </section>

      <section className={`card card--pad ${styles.section}`} aria-labelledby="profile-heading">
        <div>
          <h2 id="profile-heading">{t('profileTitle')}</h2>
          <p className="muted">{t('profileLead')}</p>
        </div>
        {profileError && <ErrorNotice>{profileError}</ErrorNotice>}
        <form onSubmit={handleProfile} className="form">
          <Field label={ta('name')} htmlFor="displayName" hint={ta('nameHint')}>
            <Input
              id="displayName"
              value={profile.displayName}
              onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
              autoComplete="name"
              maxLength={150}
              dir="auto"
              aria-describedby="displayName-hint"
            />
          </Field>
          <Field label={t('bio')} htmlFor="bio" hint={t('bioHint')}>
            <Textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
              maxLength={1000}
              rows={4}
              dir="auto"
              aria-describedby="bio-hint"
            />
          </Field>
          <Field label={t('phone')} htmlFor="phone" hint={t('phoneHint')}>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              autoComplete="tel"
              placeholder="+963933123456"
              pattern="\+[0-9\s\(\)\-]{8,24}"
              dir="ltr"
              aria-describedby="phone-hint"
            />
          </Field>
          <div className={styles.formEnd}>
            <Button type="submit" variant="primary" loading={profileBusy}>
              {t('saveProfile')}
            </Button>
          </div>
        </form>
      </section>

      <section className={`card card--pad ${styles.section}`} aria-labelledby="password-heading">
        <div>
          <h2 id="password-heading">{t('passwordTitle')}</h2>
          <p className="muted">{t('passwordLead')}</p>
        </div>
        {pwError && <ErrorNotice>{pwError}</ErrorNotice>}
        <form onSubmit={handlePassword} className="form">
          <Field label={t('currentPassword')} htmlFor="current-password">
            <Input
              id="current-password"
              type="password"
              value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
              autoComplete="current-password"
              maxLength={128}
              required
            />
          </Field>
          <Field label={t('newPassword')} htmlFor="new-password" hint={ta('passwordHint')}>
            <Input
              id="new-password"
              type="password"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              aria-describedby="new-password-hint"
              required
            />
          </Field>
          <Field
            label={t('confirmPassword')}
            htmlFor="confirm-password"
            error={pwMismatch ? t('mismatch') : undefined}
          >
            <Input
              id="confirm-password"
              type="password"
              value={pw.confirm}
              onChange={(e) => {
                setPw((p) => ({ ...p, confirm: e.target.value }));
                setPwMismatch(false);
              }}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              aria-invalid={pwMismatch || undefined}
              aria-describedby={pwMismatch ? 'confirm-password-error' : undefined}
              required
            />
          </Field>
          <div className={styles.formEnd}>
            <Button type="submit" variant="primary" loading={pwBusy}>
              {t('changePassword')}
            </Button>
          </div>
        </form>
      </section>

      <section className={`card card--pad ${styles.section}`} aria-labelledby="data-heading">
        <div>
          <h2 id="data-heading">{t('dataTitle')}</h2>
          <p className="muted">{t('dataLead')}</p>
        </div>
        <div className={styles.formEnd}>
          <Button onClick={handleExport} loading={exporting}>
            <Download aria-hidden="true" />
            {t('download')}
          </Button>
        </div>
      </section>

      <nav className={`card ${styles.links}`} aria-labelledby="legal-heading">
        <h2 id="legal-heading" className={styles.linksTitle}>
          {tl('heading')}
        </h2>
        <ul>
          {LEGAL_PAGES.map((page) => {
            const Icon = LEGAL_ICONS[page];
            return (
              <li key={page}>
                <Link href={`/${page}`} className={styles.linkRow}>
                  <Icon aria-hidden="true" />
                  <span>{tl(`pages.${page}`)}</span>
                  <ChevronRight aria-hidden="true" className="icon-flip" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section
        className={`card card--pad ${styles.section} ${styles.danger}`}
        aria-labelledby="danger-heading"
      >
        <div>
          <h2 id="danger-heading">{t('dangerTitle')}</h2>
          <p className="muted">{t('dangerLead')}</p>
        </div>
        <div className={styles.formEnd}>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 aria-hidden="true" />
            {t('deleteAccount')}
          </Button>
        </div>
      </section>

      <Dialog open={deleteOpen} onClose={closeDelete} title={t('deleteTitle')}>
        <form onSubmit={handleDelete} className="form">
          <div className={styles.consequences}>
            <h3>{t('deleteGone')}</h3>
            <ul>
              <li>{t('gone.profile')}</li>
              <li>{t('gone.listings')}</li>
              <li>{t('gone.favorites')}</li>
            </ul>
            <h3>{t('deleteStays')}</h3>
            <ul>
              <li>{t('stays.messages')}</li>
              <li>{t('stays.reports')}</li>
            </ul>
            <p>
              <strong>{t('deleteFinal')}</strong> {t('deleteExportFirst')}
            </p>
          </div>
          {deleteError && <ErrorNotice>{deleteError}</ErrorNotice>}
          <Field label={t('deletePassword')} htmlFor="delete-password">
            <Input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoComplete="current-password"
              maxLength={128}
              data-autofocus
              required
            />
          </Field>
          <div className={styles.dialogButtons}>
            <Button onClick={closeDelete}>{tc('cancel')}</Button>
            <Button type="submit" variant="danger" loading={deleteBusy}>
              {t('deleteConfirm')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
