'use client';

import Link from 'next/link';
import ChantierForm from '../../../components/chantier-form';
import { DashboardShell } from '../../../components/dashboard-shell';

export default function NouveauChantierPage() {
  return (
    <DashboardShell title="Nouveau chantier">
      <section className="panel">
        <div className="toolbar">
          <div>
            <h2 style={{ margin: 0 }}>Créer un chantier</h2>
            <p className="toolbar-meta">
              Saisissez le nom et placez le chantier sur la carte.
            </p>
          </div>
          <Link href="/chantiers" className="action-link">← Retour à la liste</Link>
        </div>

        <ChantierForm mode="create" />
      </section>
    </DashboardShell>
  );
}
