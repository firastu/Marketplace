'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useFormat } from '@/i18n/use-format';
import {
  Heart,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Plus,
  Store,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useUnreadCount } from '@/hooks/use-socket';
import { loginHref } from '@/hooks/use-require-auth';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Logo } from './Logo';
import { Avatar } from './bits';
import { Menu } from './ui/Menu';
import { useToast } from './ui/Feedback';
import styles from './Header.module.css';

const SELL_PATH = '/listings/create';

/** Routes with their own bottom action bar or a focused, full-height task. */
function hidesBottomNav(pathname: string): boolean {
  return (
    /^\/messages\/[^/]+/.test(pathname) ||
    /^\/listings\/(?!my$)[^/]+/.test(pathname) ||
    pathname === '/login' ||
    pathname === '/register'
  );
}

export default function Header() {
  const { user, loading, logout } = useAuth();
  const { unreadCount } = useUnreadCount(!!user);
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const t = useTranslations('nav');
  const fmt = useFormat();

  const handleLogout = () => {
    logout();
    toast(t('loggedOut'));
    router.push('/');
  };

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const navLink = (href: string) => ({
    href,
    className: styles.navLink,
    'aria-current': isActive(href) ? ('page' as const) : undefined,
  });
  const sellHref = user ? SELL_PATH : loginHref(SELL_PATH);
  const unreadText = unreadCount > 99 ? '99+' : fmt.number(unreadCount);
  const withUnread = (label: string) =>
    unreadCount > 0 ? t('unread', { label, n: unreadText }) : label;

  return (
    <>
      <a href="#main" className={styles.skip}>
        {t('skip')}
      </a>

      <header
        className={styles.header}
        // The chat has its own top bar; on phones every row of pixels counts.
        data-compact={/^\/messages\/[^/]+/.test(pathname) || undefined}
      >
        <div className={`container ${styles.inner}`}>
          <Link href="/" className={styles.home} aria-label={t('home')}>
            <Logo />
          </Link>

          <nav className={styles.nav} aria-label={t('main')}>
            <Link {...navLink('/')}>{t('browse')}</Link>
            <Link {...navLink('/categories')}>{t('categories')}</Link>
          </nav>

          <div className={styles.actions}>
            <Link
              href="/categories"
              className={`btn btn--ghost btn--icon ${styles.mobileOnly}`}
              aria-label={t('categories')}
            >
              <LayoutGrid aria-hidden="true" />
            </Link>

            {user && (
              <>
                <Link
                  href="/favorites"
                  className={`btn btn--ghost btn--icon ${styles.desktopOnly}`}
                  aria-label={t('favorites')}
                >
                  <Heart aria-hidden="true" />
                </Link>
                <Link
                  href="/messages"
                  className={`btn btn--ghost btn--icon ${styles.desktopOnly} ${styles.withDot}`}
                  aria-label={withUnread(t('messages'))}
                >
                  <MessageCircle aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className={`count-dot ${styles.dot}`} aria-hidden="true">
                      {unreadText}
                    </span>
                  )}
                </Link>
              </>
            )}

            <Link href={sellHref} className={`btn btn--accent ${styles.desktopOnly}`}>
              <Plus aria-hidden="true" />
              {t('sell')}
            </Link>

            <LanguageSwitcher
              responsive
              className={`btn btn--ghost btn--sm ${styles.lang} ${user ? styles.desktopOnly : ''}`}
            />

            {user ? (
              <Menu
                label={t('accountMenu')}
                triggerClassName={styles.accountButton}
                trigger={<Avatar name={user.displayName || user.username} size="sm" />}
              >
                {(close) => (
                  <>
                    <p className={styles.menuName} dir="auto">
                      {user.displayName || user.username}
                    </p>
                    <Link href="/listings/my" className="menu__item" onClick={close}>
                      <Store aria-hidden="true" />
                      {t('myListings')}
                    </Link>
                    <Link href={`/users/${user.id}`} className="menu__item" onClick={close}>
                      <UserRound aria-hidden="true" />
                      {t('publicProfile')}
                    </Link>
                    <Link href="/favorites" className="menu__item" onClick={close}>
                      <Heart aria-hidden="true" />
                      {t('favorites')}
                    </Link>
                    <LanguageSwitcher className="menu__item" onSwitch={close} />
                    <div className="menu__sep" />
                    <button
                      type="button"
                      className="menu__item"
                      onClick={() => {
                        close();
                        handleLogout();
                      }}
                    >
                      <LogOut aria-hidden="true" className="icon-flip" />
                      {t('logout')}
                    </button>
                  </>
                )}
              </Menu>
            ) : (
              !loading && (
                <>
                  <Link href={loginHref(pathname)} className="btn btn--ghost btn--sm">
                    {t('loginShort')}
                  </Link>
                  <Link
                    href="/register"
                    className={`btn btn--primary btn--sm ${styles.desktopOnly}`}
                  >
                    {t('signup')}
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </header>

      {!hidesBottomNav(pathname) && (
        <nav className={styles.bottomNav} aria-label={t('quick')}>
          <Link href="/" className={styles.tab} aria-current={isActive('/') ? 'page' : undefined}>
            <Store aria-hidden="true" />
            {t('browse')}
          </Link>
          <Link
            href={user ? '/favorites' : loginHref('/favorites')}
            className={styles.tab}
            aria-current={isActive('/favorites') ? 'page' : undefined}
          >
            <Heart aria-hidden="true" />
            {t('saved')}
          </Link>
          <Link href={sellHref} className={`${styles.tab} ${styles.sell}`}>
            <span className={styles.sellDisc}>
              <Plus aria-hidden="true" />
            </span>
            {t('sell')}
          </Link>
          <Link
            href={user ? '/messages' : loginHref('/messages')}
            className={styles.tab}
            aria-current={isActive('/messages') ? 'page' : undefined}
            aria-label={withUnread(t('chats'))}
          >
            <span className={styles.withDot}>
              <MessageCircle aria-hidden="true" />
              {unreadCount > 0 && (
                <span className={`count-dot ${styles.dot}`} aria-hidden="true">
                  {unreadText}
                </span>
              )}
            </span>
            {t('chats')}
          </Link>
          <Link
            href={user ? '/listings/my' : loginHref('/listings/my')}
            className={styles.tab}
            aria-current={isActive('/listings/my') ? 'page' : undefined}
          >
            <UserRound aria-hidden="true" />
            {user ? t('me') : t('loginShort')}
          </Link>
        </nav>
      )}
    </>
  );
}
