'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  User,
  getStoredUser,
  getMe,
  saveAuth,
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
  register: (data: { username: string; email: string; password: string; displayName: string }) => Promise<void>;
  logout: () => void;
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
        .then(setUser)
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
    async (data: { username: string; email: string; password: string; displayName: string }) => {
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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
