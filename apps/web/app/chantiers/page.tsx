'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '../../components/dashboard-shell';
import { fetchWorksites } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { usePoll } from '../../lib/use-poll';
import { useWorksite } from '../../lib/worksite';

const ROLES_OUVERTURE = ['DIRECTION_TRAVAUX', 'ADMIN'];

export default function ChantiersPage() {
  const router = useRouter();
  const { email, role } = useAuth();
  const { worksite, openWorksite } = useWorksite();

  const { data, loading, lastUpdate } = usePoll(fetchWorksites);
  const chantiers = data ?? [];

  const peutCreer = !role || ROLES_OUVERTURE.includes(role);

  return (
    <DashboardShell title="Chantiers">
      <section className="panel">
        <div className="toolbar">
          <div>
            <h2 style={{ margin: 0 }}>Sélectionner un chantier</h2>
            <p className="toolbar-meta">
              {loading
                ? 'Chargement...'
                : `${chantiers.length} chantier${chantiers.length > 1 ? 's' : ''}${
                    lastUpdate ? ` — maj ${lastUpdate.toLocaleTimeString('fr-FR')}` : ''
                  }`}
            </p>
          </div>
          {peutCreer && (
            <Link href="/chantiers/nouveau" className="filter-button">+ Nouveau chantier</Link>
          )}
        </div>

        <div className="worksite-grid">
          {chantiers.map((chantier) => {
            const actif = worksite?.id === chantier.id;
            return (
              <article key={chantier.id} className={`worksite-card${actif ? ' active' : ''}`}
                onClick={() => { openWorksite({ id: chantier.id, name: chantier.nom }); router.push('/ncr'); }}>
                <div className="ws-card-body">
                  <div className="ws-card-top">
                    <h3>
                      {actif && <span className="ws-dot" />}
                      {chantier.nom}
                    </h3>
                    <Link href={`/chantiers/${chantier.id}`} className="ws-edit-btn" title="Modifier"
                      onClick={(e) => e.stopPropagation()}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </Link>
                  </div>
                  <p className="worksite-meta">{chantier.localisation || 'Sans localisation'}</p>
                  <div className="ws-card-stats">
                    <span><strong>{chantier.ncrOuvertes}</strong> NCR ouvertes</span>
                    <span>sur <strong>{chantier.ncrTotal}</strong></span>
                    <span>depuis {chantier.dateOuverture}</span>
                  </div>
                </div>
              </article>
            );
          })}
          {!loading && chantiers.length === 0 && (
            <p className="toolbar-meta" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
              Aucun chantier enregistré.
            </p>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
