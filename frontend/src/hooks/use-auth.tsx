'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  User,
  getStoredUser,
  getMe,
  saveAuth,
  saveToken,
  saveUser,
  RegisterData,
  logout as logoutService,
  login as loginService,
  register as registerService,
  AuthResponse,
} from '@/services/auth.service';
import { ApiError, AUTH_EXPIRED_EVENT } from '@/services/api-client';
import { disconnectSocket } from '@/hooks/use-socket';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  /** After a profile edit: the fresh account as the server returned it. */
  updateUser: (user: User) => void;
  /** After a password change: the old token no longer works. */
  replaceToken: (accessToken: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      // Verify the token is still valid. Only a 401 means it isn't: a
      // dropped connection or a server hiccup must not sign the user out.
      getMe()
        .then((fresh) => {
          saveUser(fresh);
          setUser(fresh);
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) {
            logoutService();
            disconnectSocket();
            setUser(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Any later request rejected with 401 (token expired, account
  // deactivated) ends the session instead of leaving a half-working UI.
  useEffect(() => {
    const onExpired = () => {
      logoutService();
      disconnectSocket();
      setUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const handleAuth = useCallback((response: AuthResponse) => {
    saveAuth(response);
    setUser(response.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await loginService({ email, password });
      handleAuth(response);
    },
    [handleAuth],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const response = await registerService(data);
      handleAuth(response);
    },
    [handleAuth],
  );

  const logout = useCallback(() => {
    logoutService();
    disconnectSocket();
    setUser(null);
  }, []);

  const updateUser = useCallback((next: User) => {
    saveUser(next);
    setUser(next);
  }, []);

  const replaceToken = useCallback((accessToken: string) => {
    // The open chat socket stays as it is; the next one uses this token.
    saveToken(accessToken);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateUser, replaceToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
