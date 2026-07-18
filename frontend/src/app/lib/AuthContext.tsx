import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from './types';

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('rentsure_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem('rentsure_user', JSON.stringify(user));
    else localStorage.removeItem('rentsure_user');
  }, [user]);

  const login = (u: User) => setUser(u);
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
