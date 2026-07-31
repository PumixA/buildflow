'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useWorksite } from '../lib/worksite';

type DashboardShellProps = {
  title: string;
  children: ReactNode;
};

export function DashboardShell({ title, children }: DashboardShellProps) {
  const { isAuthenticated, email, logout } = useAuth();
  const { worksite } = useWorksite();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, []);

  return (
    <main className="app-shell" suppressHydrationWarning>
      <aside className="app-sidebar">
        <div className="brand">
          <span className="brand-icon">▣</span>
          <span>BuildFlow</span>
        </div>
        <div className="menu-group">
          <p className="menu-title">WEB (ADMINISTRATION)</p>
          <Link href="/chantiers" className="menu-link">Chantiers</Link>
          <Link href="/hse" className="menu-link">Tableau de Bord HSE</Link>
          <Link href="/ncr" className="menu-link">Liste des NCR</Link>
          <Link href="/ncr/nouveau" className="menu-link">Nouvelle NCR</Link>
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
            {/* Le chantier actif était écrit en dur : l'écran annonçait « Paris -
                La Défense T4 » quel que soit le contenu réel de la base. */}
            <p>
              Chantier actif:{' '}
              {worksite ? (
                <Link href="/chantiers" className="action-link"><strong>{worksite.name}</strong></Link>
              ) : (
                <Link href="/chantiers" className="action-link">aucun — en ouvrir un</Link>
              )}
            </p>
            {email && <span className="user-email">{email}</span>}
            {ready && <button onClick={logout} className="btn-logout">Déconnexion</button>}
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
