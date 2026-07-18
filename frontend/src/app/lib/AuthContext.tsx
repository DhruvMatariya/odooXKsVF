import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from './types';
import { getTokens, setTokens, clearTokens, apiFetch } from './api';

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  isAuthenticated: false,
  login: () => {},
  logout: async () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem('rentsure_user');
      const { accessToken } = getTokens();
      if (storedUser && accessToken) {
        try {
          // Verify token by fetching profile
          const res = await apiFetch<User>('/auth/profile');
          setUser(res.data!);
        } catch {
          clearTokens();
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  // Save user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('rentsure_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('rentsure_user');
    }
  }, [user]);

  const login = (u: User, accessToken: string, refreshToken: string) => {
    setTokens(accessToken, refreshToken);
    setUser(u);
  };

  const logout = async () => {
    try {
      const { refreshToken } = getTokens();
      if (refreshToken) {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: !!user,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
