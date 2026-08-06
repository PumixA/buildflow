'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { DashboardShell } from '../../components/dashboard-shell';
import { fetchWorksites } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { peutCreerChantier, peutEditerChantier } from '../../lib/roles';
import { usePoll } from '../../lib/use-poll';
import { useWorksite } from '../../lib/worksite';

const STATUTS = [
  { valeur: 'all', libelle: 'Tous les statuts' },
  { valeur: 'ACTIVE', libelle: 'Actif' },
  { valeur: 'SUSPENDED', libelle: 'Suspendu' },
  { valeur: 'CLOSED', libelle: 'Clôturé' }
];

export default function ChantiersPage() {
  const router = useRouter();
  const { role } = useAuth();
  const { worksite, openWorksite } = useWorksite();
  const isChef = role === 'CHEF_CHANTIER';

  const { data, loading, lastUpdate } = usePoll(fetchWorksites);
  const chantiers = data ?? [];

  const [query, setQuery] = useState('');
  const [statut, setStatut] = useState('all');

  const filteredChantiers = useMemo(
    () =>
      chantiers.filter((chantier) => {
        if (query && !`${chantier.nom} ${chantier.localisation ?? ''}`.toLowerCase().includes(query.toLowerCase())) return false;
        if (statut !== 'all' && chantier.statut !== statut) return false;
        return true;
      }),
    [chantiers, query, statut]
  );

  const peutCreer = peutCreerChantier(role);

  return (
    <DashboardShell title="Chantiers">
      <section className="panel">
        <div className="toolbar">
          <div className="filters">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un chantier..."
              className="filter-input"
            />
            <select value={statut} onChange={(e) => setStatut(e.target.value)} className="filter-select">
              {STATUTS.map((s) => (
                <option key={s.valeur} value={s.valeur}>{s.libelle}</option>
              ))}
            </select>
            {peutCreer && (
              <Link href="/chantiers/nouveau" className="filter-button">+ Nouveau chantier</Link>
            )}
          </div>
          <p className="toolbar-meta">
            {loading
              ? 'Chargement...'
              : `${filteredChantiers.length} chantier${filteredChantiers.length !== 1 ? 's' : ''}${
                  query || statut !== 'all'
                    ? ` filtré${filteredChantiers.length !== 1 ? 's' : ''} sur ${chantiers.length}`
                    : ''
                }${
                  lastUpdate ? ` — maj ${lastUpdate.toLocaleTimeString('fr-FR')}` : ''
                }`}
          </p>
        </div>

        <div className="worksite-grid">
          {filteredChantiers.map((chantier) => {
            const actif = worksite?.id === chantier.id;
            return (
              <article key={chantier.id} className={`worksite-card${actif ? ' active' : ''}`}
                onClick={() => { openWorksite({ id: chantier.id, name: chantier.nom }); if (!isChef) router.push('/ncr'); }}>
                <div className="ws-card-body">
                  <div className="ws-card-top">
                    <h3>
                      {actif && <span className="ws-dot" />}
                      {chantier.nom}
                    </h3>
                    {peutEditerChantier(role) && (
                      <Link href={`/chantiers/${chantier.id}`} className="ws-edit-btn" title="Modifier"
                        onClick={(e) => e.stopPropagation()}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </Link>
                    )}
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
          {!loading && filteredChantiers.length === 0 && (
            <p className="toolbar-meta" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
              {chantiers.length === 0 ? 'Aucun chantier enregistré.' : 'Aucun chantier ne correspond aux critères.'}
            </p>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
