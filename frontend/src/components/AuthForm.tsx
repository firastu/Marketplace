'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useErrorText } from '@/i18n/errors';
import { Link, useRouter } from '@/i18n/navigation';
import { CircleAlert, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { safeNext } from '@/hooks/use-require-auth';
import { SITE_NAME } from '@/config/site';
import { LogoMark } from './Logo';
import { Button } from './ui/Button';
import { Field, Input } from './ui/Field';
import styles from './AuthForm.module.css';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { user, loading: authLoading, login, register } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const isLogin = mode === 'login';
  const t = useTranslations('auth');
  const errorText = useErrorText();

  const [form, setForm] = useState({ displayName: '', username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already logged in (or just succeeded): continue to where they were going.
  useEffect(() => {
    if (!authLoading && user) router.replace(next);
  }, [authLoading, user, router, next]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form);
    } catch (err) {
      setError(errorText(err, isLogin ? t('loginFailed') : t('registerFailed')));
      setSubmitting(false);
    }
  };

  const otherHref = `${isLogin ? '/register' : '/login'}${
    next !== '/' ? `?next=${encodeURIComponent(next)}` : ''
  }`;

  return (
    <div className={`container ${styles.wrap}`}>
      <div className={styles.card}>
        <div className="ablaq" aria-hidden="true" />
        <div className={styles.inner}>
          <LogoMark size={40} />
          <h1 className={styles.title}>
            {isLogin ? t('loginTitle') : t('registerTitle', { site: SITE_NAME })}
          </h1>
          <p className={styles.lead}>
            {isLogin ? t('loginLead') : t('registerLead')}
          </p>

          {error && (
            <div className="notice notice--danger" role="alert">
              <CircleAlert aria-hidden="true" />
              <span className="notice__body">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            {!isLogin && (
              <>
                <Field label={t('name')} htmlFor="displayName" hint={t('nameHint')}>
                  <Input
                    id="displayName"
                    value={form.displayName}
                    onChange={set('displayName')}
                    autoComplete="name"
                    maxLength={150}
                    dir="auto"
                    required
                  />
                </Field>
                <Field label={t('username')} htmlFor="username" hint={t('usernameHint')}>
                  <Input
                    id="username"
                    value={form.username}
                    onChange={set('username')}
                    autoComplete="username"
                    autoCapitalize="none"
                    dir="ltr"
                    minLength={3}
                    maxLength={100}
                    required
                  />
                </Field>
              </>
            )}
            <Field label={t('email')} htmlFor="email">
              <Input
                id="email"
                type="email"
                inputMode="email"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
                autoCapitalize="none"
                dir="ltr"
                required
              />
            </Field>
            <Field
              label={t('password')}
              htmlFor="password"
              hint={isLogin ? undefined : t('passwordHint')}
            >
              <span className={styles.password}>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  minLength={isLogin ? undefined : 8}
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  className={styles.reveal}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
            </Field>

            <Button type="submit" variant="accent" size="lg" block loading={submitting}>
              {isLogin ? t('loginSubmit') : t('registerSubmit')}
            </Button>
          </form>

          <p className={styles.switch}>
            {isLogin ? t('newHere') : t('haveAccount')}{' '}
            <Link href={otherHref} className="link">
              {isLogin ? t('createAccount') : t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
