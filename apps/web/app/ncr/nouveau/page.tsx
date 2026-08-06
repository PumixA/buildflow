'use client';

import Link from 'next/link';
import NcrForm from '../../../components/ncr-form';
import { DashboardShell } from '../../../components/dashboard-shell';

export default function NouvelleNcrPage() {
  return (
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
  );
}
