'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Sync init from localStorage (safe on client, returns defaults on SSR)
function loadAuth() {
  if (typeof window === 'undefined') return { token: null, role: null, email: null };
  return {
    token: localStorage.getItem('buildflow_token'),
    role: localStorage.getItem('buildflow_role'),
    email: localStorage.getItem('buildflow_email')
  };
}

const initial = loadAuth();

interface AuthState {
  token: string | null;
  role: string | null;
  email: string | null;
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

function saveAuth(token: string, role: string, email: string) {
  localStorage.setItem('buildflow_token', token);
  localStorage.setItem('buildflow_role', role);
  localStorage.setItem('buildflow_email', email);
}

function clearAuth() {
  localStorage.removeItem('buildflow_token');
  localStorage.removeItem('buildflow_role');
  localStorage.removeItem('buildflow_email');
}

const AuthContext = createContext<AuthState>({
  token: initial.token,
  role: initial.role,
  email: initial.email,
  login: async () => {},
  logout: () => {},
  isAuthenticated: !!initial.token
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(initial.token);
  const [role, setRole] = useState<string | null>(initial.role);
  const [email, setEmail] = useState<string | null>(initial.email);

  const login = async (loginEmail: string, password: string, mfaCode?: string) => {
    const body: Record<string, string> = { email: loginEmail, password };
    if (mfaCode) body.mfaCode = mfaCode;

    const res = await fetch(`${API_BASE_URL}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.message || '';
      if (msg.includes('MFA')) throw new Error('MFA_REQUIRED');
      throw new Error(msg || 'Identifiants invalides');
    }

    const data = await res.json();
    setToken(data.accessToken);
    setRole(data.role || null);
    setEmail(loginEmail);
    saveAuth(data.accessToken, data.role || '', loginEmail);
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setEmail(null);
    clearAuth();
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
  if (typeof window === 'undefined') return { 'x-role': 'RESPONSABLE_QSE' };
  const token = localStorage.getItem('buildflow_token');
  if (token) return { Authorization: `Bearer ${token}` };
  if (process.env.NODE_ENV === 'development') return { 'x-role': 'RESPONSABLE_QSE' };
  return {};
}
