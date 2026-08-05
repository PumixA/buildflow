'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PriorityBadge, StatusBadge, WormBadge } from '../../components/badges';
import { DashboardShell } from '../../components/dashboard-shell';
import { fetchNcrList } from '../../lib/api';
import { usePoll } from '../../lib/use-poll';
import { useWorksite } from '../../lib/worksite';

const PAR_PAGE = 10;

export default function NcrListPage() {
  const [query, setQuery] = useState('');
  const [chantier, setChantier] = useState('all');
  const [statut, setStatut] = useState('all');
  const [page, setPage] = useState(1);
  const { worksite } = useWorksite();

  // Ouvrir un chantier restreint la liste à ses NCR, côté API. Sans chantier
  // actif on garde la vue transversale, utile à la direction des travaux.
  const charger = useCallback(() => fetchNcrList(worksite?.name), [worksite?.name]);
  const { data, loading, lastUpdate } = usePoll(charger, undefined, worksite?.name ?? 'all');
  const rows = data?.items ?? [];

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (query && !`${row.id} ${row.titre} ${row.chantier} ${row.description}`.toLowerCase().includes(query.toLowerCase())) return false;
        if (chantier !== 'all' && row.chantier !== chantier) return false;
        if (statut !== 'all' && row.statut !== statut) return false;
        return true;
      }),
    [rows, query, chantier, statut]
  );

  const chantiers = [...new Set(rows.map((row) => row.chantier))];

  // La pagination s'applique **après** les filtres : filtrer d'abord puis paginer
  // garde la recherche portée sur l'ensemble de la liste, et non sur la seule
  // page affichée.
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAR_PAGE));
  const pageCourante = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

  // Un filtre qui réduit la liste peut rendre la page courante vide : on revient
  // au début plutôt que d'afficher un tableau sans lignes.
  useEffect(() => {
    setPage(1);
  }, [query, chantier, statut, worksite?.name]);

  return (
    <DashboardShell title="Liste des NCR">
      <section className="panel">
        <div className="toolbar">
          <div className="filters">
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une NCR..." className="filter-input" />
            <select value={chantier} onChange={(e) => setChantier(e.target.value)} className="filter-select">
              <option value="all">Tous les chantiers</option>
              {chantiers.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={statut} onChange={(e) => setStatut(e.target.value)} className="filter-select">
              <option value="all">Tous les statuts</option>
              <option value="OUVERT">Ouvert</option>
              <option value="EN_COURS">En cours</option>
              <option value="EN_ANALYSE">En analyse</option>
              <option value="RESOLU">Résolu</option>
              <option value="CLOTURE">Clôturé</option>
            </select>
            <button onClick={() => {}} className="filter-button">Filtrer</button>
            <Link href="/ncr/nouveau" className="filter-button">+ Nouvelle NCR</Link>
          </div>
          <p className="toolbar-meta">
            {loading
              ? 'Chargement...'
              : `Résultats: ${filteredRows.length}${
                  totalPages > 1 ? ` — page ${pageCourante} sur ${totalPages}` : ''
                }${lastUpdate ? ` — maj ${lastUpdate.toLocaleTimeString('fr-FR')}` : ''}`}
            {data?.tronque && (
              <span className="field-hint">
                Seules les {rows.length} NCR les plus récentes sont chargées sur {data.total}.
              </span>
            )}
          </p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Titre</th><th>Chantier</th><th>Description</th><th>Statut</th><th>Priorité</th><th>WORM</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id}>
                {/* La colonne affichait l'UUID brut sur deux lignes, sans jamais
                    montrer le titre saisi. */}
                <td className="id-cell">{row.titre}</td>
                <td>{row.chantier}</td>
                <td>{row.description}</td>
                <td><StatusBadge value={row.statut} /></td>
                <td><PriorityBadge value={row.priorite} /></td>
                <td><WormBadge locked={row.worm} /></td>
                <td><Link href={`/ncr/${row.id}`} className="action-link">Voir</Link></td>
              </tr>
            ))}
            {!loading && filteredRows.length === 0 && (
              <tr><td colSpan={7} style={{textAlign:'center',padding:20,color:'#94a3b8'}}>Aucune NCR trouvée</td></tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <nav className="pagination" aria-label="Pagination des NCR">
            <button
              type="button"
              className="filter-button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageCourante === 1}
            >
              ← Précédent
            </button>
            <span className="pagination-state">
              Page {pageCourante} sur {totalPages}
            </span>
            <button
              type="button"
              className="filter-button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageCourante === totalPages}
            >
              Suivant →
            </button>
          </nav>
        )}
      </section>
    </DashboardShell>
  );
}
