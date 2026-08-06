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

function Icon({ name }: { name: string }) {
  const d: Record<string, string> = {
    chantiers: 'M3 3h18v4H3V3zm0 6h18v4H3V9zm0 6h18v4H3v-4z',
    hse: 'M12 2l8 4v4c0 6-4 10-8 12-4-2-8-6-8-12V6l8-4zm0 2.3L6 7v3c0 4.5 3 7.8 6 9.4 3-1.6 6-4.9 6-9.4V7l-6-2.7z',
    ncr: 'M4 4h16v2H4V4zm0 5h16v2H4V9zm0 5h10v2H4v-2z',
    nouveau: 'M12 2v8m0 0v8m0-8h8m-8 0H4',
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="menu-icon-svg">
      <path d={d[name] ?? d.nouveau} />
    </svg>
  );
}

export function DashboardShell({ title, children }: DashboardShellProps) {
  const { isAuthenticated, email, role, logout } = useAuth();
  const canList = !role || role === 'ADMIN' || role === 'RESPONSABLE_QSE' || role === 'DIRECTION_TRAVAUX';
  const { worksite } = useWorksite();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { setReady(true); }, []);
  useEffect(() => {
    if (ready && !isAuthenticated) router.replace('/login');
  }, [ready, isAuthenticated, router]);

  return (
    <main className="app-shell" suppressHydrationWarning>
      <aside className={`app-sidebar${collapsed ? ' collapsed' : ''}`}>
        <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Ouvrir' : 'Fermer'}>
          {collapsed ? '☰' : '✕'}
        </button>

        <Link href="/" className="brand">
          {!collapsed && <span>BuildFlow</span>}
        </Link>

        <nav className="menu-group">
          <Link href="/chantiers" className="menu-link" title="Chantiers">
            <Icon name="chantiers" />
            {!collapsed && <span>Chantiers</span>}
          </Link>
          {canList && (
            <Link href="/hse" className="menu-link" title="HSE">
              <Icon name="hse" />
              {!collapsed && <span>Tableau de Bord HSE</span>}
            </Link>
          )}
          {canList && (
            <Link href="/ncr" className="menu-link" title="NCR">
              <Icon name="ncr" />
              {!collapsed && <span>Liste des NCR</span>}
            </Link>
          )}
          <Link href="/ncr/nouveau" className="menu-link" title="Nouvelle NCR">
            <Icon name="nouveau" />
            {!collapsed && <span>Nouvelle NCR</span>}
          </Link>
        </nav>
      </aside>

      <section className="app-content">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="topbar-right">
            <p>
              Chantier actif:{' '}
              {worksite ? (
                <Link href="/chantiers" className="action-link"><strong>{worksite.name}</strong></Link>
              ) : (
                <Link href="/chantiers" className="action-link">aucun — en ouvrir un</Link>
              )}
            </p>
            {ready && email && <span className="user-email">{email}</span>}
            {ready && <button onClick={logout} className="btn-logout">Déconnexion</button>}
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
