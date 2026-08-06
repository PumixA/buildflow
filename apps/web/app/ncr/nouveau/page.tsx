'use client';

import Link from 'next/link';
import NcrForm from '../../../components/ncr-form';
import { RoleGuard } from '../../../components/role-guard';
import { DashboardShell } from '../../../components/dashboard-shell';
import { useAuth } from '../../../lib/auth';
import { peutCreerNcr } from '../../../lib/roles';

export default function NouvelleNcrPage() {
  const { role } = useAuth();
  return (
    <RoleGuard allowed={peutCreerNcr(role)} title="Nouvelle NCR">
      <DashboardShell title="Déclarer une non-conformité">
        <section className="panel">
          <div className="toolbar">
            <div>
              <h2 style={{ margin: 0 }}>Nouvelle NCR</h2>
              <p className="toolbar-meta">
                La NCR est rattachée au chantier sélectionné et tracée au journal d&apos;audit.
              </p>
            </div>
            <Link href="/ncr" className="action-link">← Retour à la liste</Link>
          </div>
          <NcrForm />
        </section>
      </DashboardShell>
    </RoleGuard>
  );
}
