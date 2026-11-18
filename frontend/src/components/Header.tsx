'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

  const handleLogout = () => {
    logout();
    toast('You are logged out');
    router.push('/');
  };

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const navLink = (href: string) => ({
    href,
    className: styles.navLink,
    'aria-current': isActive(href) ? ('page' as const) : undefined,
  });
  const sellHref = user ? SELL_PATH : loginHref(SELL_PATH);
  const unreadLabel = unreadCount > 0 ? `, ${unreadCount} unread` : '';

  return (
    <>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>

      <header
        className={styles.header}
        // The chat has its own top bar; on phones every row of pixels counts.
        data-compact={/^\/messages\/[^/]+/.test(pathname) || undefined}
      >
        <div className={`container ${styles.inner}`}>
          <Link href="/" className={styles.home} aria-label="Home">
            <Logo />
          </Link>

          <nav className={styles.nav} aria-label="Main">
            <Link {...navLink('/')}>Browse</Link>
            <Link {...navLink('/categories')}>Categories</Link>
          </nav>

          <div className={styles.actions}>
            <Link
              href="/categories"
              className={`btn btn--ghost btn--icon ${styles.mobileOnly}`}
              aria-label="Categories"
            >
              <LayoutGrid aria-hidden="true" />
            </Link>

            {user && (
              <>
                <Link
                  href="/favorites"
                  className={`btn btn--ghost btn--icon ${styles.desktopOnly}`}
                  aria-label="Favorites"
                >
                  <Heart aria-hidden="true" />
                </Link>
                <Link
                  href="/messages"
                  className={`btn btn--ghost btn--icon ${styles.desktopOnly} ${styles.withDot}`}
                  aria-label={`Messages${unreadLabel}`}
                >
                  <MessageCircle aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className={`count-dot ${styles.dot}`} aria-hidden="true">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            <Link href={sellHref} className={`btn btn--accent ${styles.desktopOnly}`}>
              <Plus aria-hidden="true" />
              Sell
            </Link>

            {user ? (
              <Menu
                label="Account menu"
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
                      My listings
                    </Link>
                    <Link href={`/users/${user.id}`} className="menu__item" onClick={close}>
                      <UserRound aria-hidden="true" />
                      Public profile
                    </Link>
                    <Link href="/favorites" className="menu__item" onClick={close}>
                      <Heart aria-hidden="true" />
                      Favorites
                    </Link>
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
                      Log out
                    </button>
                  </>
                )}
              </Menu>
            ) : (
              !loading && (
                <>
                  <Link href={loginHref(pathname)} className="btn btn--ghost btn--sm">
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className={`btn btn--primary btn--sm ${styles.desktopOnly}`}
                  >
                    Sign up
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </header>

      {!hidesBottomNav(pathname) && (
        <nav className={styles.bottomNav} aria-label="Quick navigation">
          <Link href="/" className={styles.tab} aria-current={isActive('/') ? 'page' : undefined}>
            <Store aria-hidden="true" />
            Browse
          </Link>
          <Link
            href={user ? '/favorites' : loginHref('/favorites')}
            className={styles.tab}
            aria-current={isActive('/favorites') ? 'page' : undefined}
          >
            <Heart aria-hidden="true" />
            Saved
          </Link>
          <Link href={sellHref} className={`${styles.tab} ${styles.sell}`}>
            <span className={styles.sellDisc}>
              <Plus aria-hidden="true" />
            </span>
            Sell
          </Link>
          <Link
            href={user ? '/messages' : loginHref('/messages')}
            className={styles.tab}
            aria-current={isActive('/messages') ? 'page' : undefined}
            aria-label={`Chats${unreadLabel}`}
          >
            <span className={styles.withDot}>
              <MessageCircle aria-hidden="true" />
              {unreadCount > 0 && (
                <span className={`count-dot ${styles.dot}`} aria-hidden="true">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            Chats
          </Link>
          <Link
            href={user ? '/listings/my' : loginHref('/listings/my')}
            className={styles.tab}
            aria-current={isActive('/listings/my') ? 'page' : undefined}
          >
            <UserRound aria-hidden="true" />
            {user ? 'Me' : 'Log in'}
          </Link>
        </nav>
      )}
    </>
  );
}
