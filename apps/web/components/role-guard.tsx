'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import { DashboardShell } from './dashboard-shell';

interface RoleGuardProps {
  /** Si true, la fonction donne l'autorisation. */
  allowed: boolean;
  /** Titre affiché dans le shell quand l'accès est refusé. */
  title?: string;
  children: ReactNode;
}

/**
 * Affiche les enfants uniquement si `allowed` est true.
 * Sinon, affiche un écran d'accès refusé.
 */
export function RoleGuard({ allowed, title = 'Accès refusé', children }: RoleGuardProps) {
  const { role } = useAuth();

  if (!allowed) {
    return (
      <DashboardShell title={title}>
        <section className="panel" style={{ textAlign: 'center', padding: 40 }}>
          <h2 style={{ margin: '0 0 12px' }}>Accès refusé</h2>
          <p className="toolbar-meta">
            Votre rôle ({role ?? 'inconnu'}) ne permet pas d&apos;accéder à cette page.
          </p>
          <Link href="/" className="action-link" style={{ marginTop: 16, display: 'inline-block' }}>
            ← Retour à l&apos;accueil
          </Link>
        </section>
      </DashboardShell>
    );
  }

  return <>{children}</>;
}
