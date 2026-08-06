'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ChantierForm from '../../../components/chantier-form';
import { DashboardShell } from '../../../components/dashboard-shell';
import { fetchWorksite } from '../../../lib/api';
<<<<<<< HEAD
import { useAuth } from '../../../lib/auth';
import { peutEditerChantier } from '../../../lib/roles';
=======
>>>>>>> origin/main
import type { Worksite } from '../../../lib/types';

function parseGps(localisation: string | null): { lat: number; lng: number } | null {
  if (!localisation) return null;
  const parts = localisation.split(',').map((p) => Number(p.trim()));
  if (parts.length !== 2 || parts.some((v) => Number.isNaN(v))) return null;
  const [lat, lng] = parts;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export default function ChantierDetailPage() {
  const params = useParams();
  const id = params.id as string;
<<<<<<< HEAD
  const { role } = useAuth();
=======
>>>>>>> origin/main

  const [chantier, setChantier] = useState<Worksite | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    void fetchWorksite(id).then((data) => {
      setChantier(data);
      setChargement(false);
    });
  }, [id]);

  if (chargement) {
    return (
      <DashboardShell title="Chantier">
        <section className="panel">
          <div className="toolbar">
            <h2 style={{ margin: 0 }}>Chargement...</h2>
          </div>
          <p className="toolbar-meta" style={{ padding: 40, textAlign: 'center' }}>
            Chargement du chantier...
          </p>
        </section>
      </DashboardShell>
    );
  }

  if (!chantier) {
    return (
      <DashboardShell title="Chantier introuvable">
        <section className="panel">
          <div className="toolbar">
            <h2 style={{ margin: 0 }}>Chantier introuvable</h2>
            <Link href="/chantiers" className="action-link">← Retour à la liste</Link>
          </div>
          <p className="toolbar-meta" style={{ padding: 40, textAlign: 'center' }}>
            Le chantier demandé n&apos;existe pas ou a été supprimé.
          </p>
        </section>
      </DashboardShell>
    );
  }

<<<<<<< HEAD
  if (!peutEditerChantier(role)) {
    return (
      <DashboardShell title="Accès refusé">
        <section className="panel" style={{ textAlign: 'center', padding: 40 }}>
          <h2 style={{ margin: '0 0 12px' }}>Accès refusé</h2>
          <p className="toolbar-meta">Votre rôle ({role ?? 'inconnu'}) ne permet pas de modifier un chantier.</p>
          <Link href="/chantiers" className="action-link" style={{ marginTop: 16, display: 'inline-block' }}>
            ← Retour à la liste
          </Link>
        </section>
      </DashboardShell>
    );
  }

=======
>>>>>>> origin/main
  const gps = parseGps(chantier.localisation);

  return (
    <DashboardShell title={chantier.nom}>
      <section className="panel">
        <div className="toolbar">
          <div>
            <h2 style={{ margin: 0 }}>Modifier le chantier</h2>
            <p className="toolbar-meta">
              Ouvert le {chantier.dateOuverture} — Statut: {chantier.statut}
            </p>
          </div>
          <Link href="/chantiers" className="action-link">← Retour à la liste</Link>
        </div>

        <ChantierForm
          mode="edit"
          initialId={chantier.id}
          initialNom={chantier.nom}
          initialLat={gps?.lat}
          initialLng={gps?.lng}
        />
      </section>
    </DashboardShell>
  );
}
