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
      // Verify token is still valid
      getMe()
        .then(setUser)
        .catch(() => {
          logoutService();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
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
