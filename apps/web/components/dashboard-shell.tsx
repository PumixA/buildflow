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

const ICONS: Record<string, string> = {
  chantiers: '🏗',
  hse: '🛡',
  ncr: '📋',
  nouveau: '➕',
};

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
            <span className="menu-icon">{ICONS.chantiers}</span>
            {!collapsed && <span>Chantiers</span>}
          </Link>
          {canList && (
            <Link href="/hse" className="menu-link" title="HSE">
              <span className="menu-icon">{ICONS.hse}</span>
              {!collapsed && <span>Tableau de Bord HSE</span>}
            </Link>
          )}
          {canList && (
            <Link href="/ncr" className="menu-link" title="NCR">
              <span className="menu-icon">{ICONS.ncr}</span>
              {!collapsed && <span>Liste des NCR</span>}
            </Link>
          )}
          <Link href="/ncr/nouveau" className="menu-link" title="Nouvelle NCR">
            <span className="menu-icon">{ICONS.nouveau}</span>
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
