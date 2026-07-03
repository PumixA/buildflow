'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AuthState {
  token: string | null;
  role: string | null;
  email: string | null;
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState>({
  token: null,
  role: null,
  email: null,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('buildflow_token');
    if (saved) {
      setToken(saved);
      const savedRole = localStorage.getItem('buildflow_role');
      const savedEmail = localStorage.getItem('buildflow_email');
      if (savedRole) setRole(savedRole);
      if (savedEmail) setEmail(savedEmail);
    }
  }, []);

  const login = async (loginEmail: string, password: string, mfaCode?: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password, mfaCode })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Échec de connexion' }));
      throw new Error(err.message || 'Échec de connexion');
    }

    const data = await res.json();
    setToken(data.accessToken);
    setRole(data.role || null);
    setEmail(loginEmail);
    localStorage.setItem('buildflow_token', data.accessToken);
    localStorage.setItem('buildflow_role', data.role || '');
    localStorage.setItem('buildflow_email', loginEmail);
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setEmail(null);
    localStorage.removeItem('buildflow_token');
    localStorage.removeItem('buildflow_role');
    localStorage.removeItem('buildflow_email');
  };

  return (
    <AuthContext.Provider value={{ token, role, email, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return { 'x-role': 'RESPONSABLE_QSE' };
  }
  const token = localStorage.getItem('buildflow_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  if (process.env.NODE_ENV === 'development') {
    return { 'x-role': 'RESPONSABLE_QSE' };
  }
  return {};
}
