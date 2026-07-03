'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';

type DashboardShellProps = {
  title: string;
  children: ReactNode;
};

export function DashboardShell({ title, children }: DashboardShellProps) {
  const { isAuthenticated, email, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  // During SSR, show content (auth check runs on client)
  if (!mounted) {
    return <main className="app-shell"><div className="app-content"><p>Chargement...</p></div></main>;
  }

  if (!isAuthenticated) {
    return null;
  }
  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <span className="brand-icon">▣</span>
          <span>BuildFlow</span>
        </div>
        <div className="menu-group">
          <p className="menu-title">WEB (ADMINISTRATION)</p>
          <Link href="/hse" className="menu-link">
            Tableau de Bord HSE
          </Link>
          <Link href="/ncr" className="menu-link">
            Liste des NCR
          </Link>
          <Link href="/ncr/NCR-2024-0155" className="menu-link">
            Fiche Détail NCR
          </Link>
        </div>
        <div className="menu-group">
          <p className="menu-title">MOBILE (TERRAIN)</p>
          <span className="menu-link disabled">Saisie NCR Mobile</span>
          <span className="menu-link disabled">Synchronisation</span>
        </div>
      </aside>
      <section className="app-content">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="topbar-right">
            <p>
              Chantier actif: <strong>Paris - La Défense T4</strong>
            </p>
            {email && <span className="user-email">{email}</span>}
            <button onClick={logout} className="btn-logout">Déconnexion</button>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
