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

function NavIcon({ name, label }: { name: string; label: string }) {
  const paths: Record<string, string> = {
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
    chantiers: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    hse: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    ncr: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    nouveau: 'M12 4v16m8-8H4',
  };
  const d = paths[name] ?? paths.nouveau;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label={label}>
      <path d={d} />
    </svg>
  );
}

export function DashboardShell({ title, children }: DashboardShellProps) {
  const { isAuthenticated, email, role, logout } = useAuth();
  const canList = !role || role === 'ADMIN' || role === 'RESPONSABLE_QSE' || role === 'DIRECTION_TRAVAUX';
  const { worksite } = useWorksite();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => { setReady(true); }, []);
  useEffect(() => {
    if (ready && !isAuthenticated) router.replace('/login');
  }, [ready, isAuthenticated, router]);

  return (
    <main className="app-shell" suppressHydrationWarning>
      <header className="top-header">
        <Link href="/" className="header-brand">BuildFlow</Link>
        <div className="header-right">
          <p className="worksite-info">
            {worksite ? (
              <Link href="/chantiers"><strong>{worksite.name}</strong></Link>
            ) : (
              <Link href="/chantiers">aucun chantier</Link>
            )}
          </p>
          {ready && email && <span className="user-email">{email}</span>}
          {ready && <button onClick={logout} className="btn-logout">Déconnexion</button>}
        </div>
      </header>

      <section className="app-content">
        <h1 className="page-title">{title}</h1>
        {children}
      </section>

      <nav className="bottom-nav">
        <Link href="/" className="nav-item" title="Tableau de bord">
          <NavIcon name="home" label="Dashboard" />
          <span>Accueil</span>
        </Link>
        <Link href="/chantiers" className="nav-item" title="Chantiers">
          <NavIcon name="chantiers" label="Chantiers" />
          <span>Chantiers</span>
        </Link>
        {canList && (
          <Link href="/hse" className="nav-item" title="HSE">
            <NavIcon name="hse" label="HSE" />
            <span>HSE</span>
          </Link>
        )}
        {canList && (
          <Link href="/ncr" className="nav-item" title="NCR">
            <NavIcon name="ncr" label="NCR" />
            <span>NCR</span>
          </Link>
        )}
        <Link href="/ncr/nouveau" className="nav-item" title="Nouvelle NCR">
          <NavIcon name="nouveau" label="Nouveau" />
          <span>Nouveau</span>
        </Link>
      </nav>
    </main>
  );
}
