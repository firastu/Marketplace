'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useUnreadCount } from '@/hooks/use-socket';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, logout } = useAuth();
  const { unreadCount } = useUnreadCount(!!user);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="logo">
          Marketplace
        </Link>

        <nav className="nav">
          <Link href="/" className="nav-link">
            Browse
          </Link>
          <Link href="/categories" className="nav-link">
            Categories
          </Link>
          {user ? (
            <>
              <Link href="/listings/create" className="nav-link">
                Sell
              </Link>
              <Link href="/listings/my" className="nav-link">
                My Listings
              </Link>
              <Link
                href="/messages"
                className="nav-link"
                style={{ position: 'relative' }}
              >
                Messages
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -10,
                      background: '#e53e3e',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      borderRadius: '9999px',
                      minWidth: 18,
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 5px',
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <span className="nav-user">{user.displayName}</span>
              <button onClick={handleLogout} className="nav-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-link">
                Login
              </Link>
              <Link href="/register" className="nav-link nav-btn-primary">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
