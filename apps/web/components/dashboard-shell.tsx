import Link from 'next/link';
import { ReactNode } from 'react';

type DashboardShellProps = {
  title: string;
  children: ReactNode;
};

export function DashboardShell({ title, children }: DashboardShellProps) {
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
          <p>
            Chantier actif: <strong>Paris - La Défense T4</strong>
          </p>
        </header>
        {children}
      </section>
    </main>
  );
}
