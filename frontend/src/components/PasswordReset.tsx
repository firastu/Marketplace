'use client';

import { FormEvent, ReactNode, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CircleAlert, MailCheck } from 'lucide-react';
import { useErrorText } from '@/i18n/errors';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiError } from '@/services/api-client';
import { forgotPassword, resetPassword } from '@/services/auth.service';
import { LogoMark } from './Logo';
import { Button, buttonClass } from './ui/Button';
import { useToast } from './ui/Feedback';
import { Field, Input } from './ui/Field';
import styles from './AuthForm.module.css';

function Card({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <div className={`container ${styles.wrap}`}>
      <div className={styles.card}>
        <div className="ablaq" aria-hidden="true" />
        <div className={styles.inner}>
          <LogoMark size={40} />
          <h1 className={styles.title}>{title}</h1>
          {lead && <p className={styles.lead}>{lead}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

function ErrorNotice({ children }: { children: ReactNode }) {
  return (
    <div className="notice notice--danger" role="alert">
      <CircleAlert aria-hidden="true" />
      <span className="notice__body">{children}</span>
    </div>
  );
}

/** Step 1: ask for the email. The answer never reveals whether it exists. */
export function ForgotPasswordForm() {
  const t = useTranslations('reset');
  const ta = useTranslations('auth');
  const locale = useLocale();
  const errorText = useErrorText();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await forgotPassword(email.trim(), locale);
      setSent(true);
    } catch (err) {
      setError(errorText(err, t('requestFailed')));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Card title={t('sentTitle')}>
        <div className="notice notice--success" role="status">
          <MailCheck aria-hidden="true" />
          <span className="notice__body">{t('sentBody')}</span>
        </div>
        <p className={styles.lead}>{t('sentHint')}</p>
        <Link href="/login" className={buttonClass({ variant: 'primary', size: 'lg', block: true })}>
          {t('backToLogin')}
        </Link>
      </Card>
    );
  }

  return (
    <Card title={t('forgotTitle')} lead={t('forgotLead')}>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <form onSubmit={handleSubmit} className="form">
        <Field label={ta('email')} htmlFor="email">
          <Input
            id="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoCapitalize="none"
            dir="ltr"
            required
          />
        </Field>
        <Button type="submit" variant="accent" size="lg" block loading={busy}>
          {t('sendLink')}
        </Button>
      </form>
      <p className={styles.switch}>
        <Link href="/login" className="link">
          {t('backToLogin')}
        </Link>
      </p>
    </Card>
  );
}

/** Step 2: the link from the email. Sets the new password, then on to login. */
export function ResetPasswordForm() {
  const t = useTranslations('reset');
  const ta = useTranslations('auth');
  const errorText = useErrorText();
  const router = useRouter();
  const toast = useToast();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mismatch, setMismatch] = useState(false);
  // No token in the address, or the server refused it: ask for a new link.
  const [invalid, setInvalid] = useState(!token);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setMismatch(true);
      document.getElementById('confirm-password')?.focus();
      return;
    }
    setMismatch(false);
    setBusy(true);
    try {
      await resetPassword(token, password);
      toast(t('done'), 'success');
      router.replace('/login');
    } catch (err) {
      const badToken =
        err instanceof ApiError && err.status === 400 && /invalid or has expired/i.test(err.message);
      if (badToken) setInvalid(true);
      else setError(errorText(err, t('resetFailed')));
      setBusy(false);
    }
  };

  if (invalid) {
    return (
      <Card title={t('invalidTitle')}>
        <ErrorNotice>{t('invalidBody')}</ErrorNotice>
        <Link
          href="/forgot-password"
          className={buttonClass({ variant: 'primary', size: 'lg', block: true })}
        >
          {t('requestNew')}
        </Link>
        <p className={styles.switch}>
          <Link href="/login" className="link">
            {t('backToLogin')}
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card title={t('resetTitle')} lead={t('resetLead')}>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <form onSubmit={handleSubmit} className="form">
        <Field label={t('newPassword')} htmlFor="new-password" hint={ta('passwordHint')}>
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          error={mismatch ? t('mismatch') : undefined}
        >
          <Input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setMismatch(false);
            }}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            aria-invalid={mismatch || undefined}
            aria-describedby={mismatch ? 'confirm-password-error' : undefined}
            required
          />
        </Field>
        <Button type="submit" variant="accent" size="lg" block loading={busy}>
          {t('setPassword')}
        </Button>
      </form>
    </Card>
  );
}
