'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NcrStatusDot } from '../../components/badges';
import { DashboardShell } from '../../components/dashboard-shell';
import { fetchNcrList } from '../../lib/api';
import { usePoll } from '../../lib/use-poll';
import { useWorksite } from '../../lib/worksite';

const PAR_PAGE = 12;

export default function NcrListPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [statut, setStatut] = useState('all');
  const [priorite, setPriorite] = useState('all');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [page, setPage] = useState(1);
  const { worksite } = useWorksite();

  const charger = useCallback(() => fetchNcrList(worksite?.name), [worksite?.name]);
  const { data, loading, lastUpdate } = usePoll(charger, undefined, worksite?.name ?? 'all');
  const rows = data?.items ?? [];

  const filteredRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (query && !`${row.id} ${row.titre} ${row.chantier} ${row.description}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (statut !== 'all' && row.statut !== statut) return false;
      if (priorite !== 'all' && row.priorite !== priorite) return false;
      if (dateDebut || dateFin) {
        const parts = row.dateSignalement.split('/');
        if (parts.length === 3) {
          const rowDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
          if (dateDebut && rowDate < new Date(dateDebut)) return false;
          if (dateFin && rowDate > new Date(dateFin)) return false;
        }
      }
      return true;
    });

    const statutOrder: Record<string, number> = { OUVERT: 0, EN_COURS: 1, EN_ANALYSE: 2, RESOLU: 3, CLOTURE: 4 };
    const prioriteOrder: Record<string, number> = { CRITIQUE: 0, HAUTE: 1, MOYENNE: 2, BASSE: 3 };

    return filtered.sort((a, b) => {
      const sa = statutOrder[a.statut] ?? 5;
      const sb = statutOrder[b.statut] ?? 5;
      if (sa !== sb) return sa - sb;
      const pa = prioriteOrder[a.priorite] ?? 4;
      const pb = prioriteOrder[b.priorite] ?? 4;
      return pa - pb;
    });
  }, [rows, query, statut, priorite, dateDebut, dateFin]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAR_PAGE));
  const pageCourante = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

  useEffect(() => {
    setPage(1);
  }, [query, statut, priorite, dateDebut, dateFin, worksite?.name]);

  return (
    <DashboardShell title="Liste des NCR">
      <section className="panel">
        <div className="toolbar">
          <div className="filters">
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une NCR..." className="filter-input" />
            <select value={statut} onChange={(e) => setStatut(e.target.value)} className="filter-select">
              <option value="all">Tous les statuts</option>
              <option value="OUVERT">Ouvert</option>
              <option value="EN_COURS">En cours</option>
              <option value="EN_ANALYSE">En analyse</option>
              <option value="RESOLU">Résolu</option>
              <option value="CLOTURE">Clôturé</option>
            </select>
            <select value={priorite} onChange={(e) => setPriorite(e.target.value)} className="filter-select">
              <option value="all">Toutes les priorités</option>
              <option value="CRITIQUE">Critique</option>
              <option value="HAUTE">Haute</option>
              <option value="MOYENNE">Moyenne</option>
              <option value="BASSE">Basse</option>
            </select>
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
              className="filter-select" title="Date de début" />
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)}
              className="filter-select" title="Date de fin" />
          </div>
          <Link href="/ncr/nouveau" className="filter-button">+ Nouvelle NCR</Link>
        </div>

        <p className="toolbar-meta" style={{ marginBottom: 12 }}>
          {loading
            ? 'Chargement...'
            : `${filteredRows.length} NCR${filteredRows.length !== 1 ? '' : ''}${
                totalPages > 1 ? ` — page ${pageCourante} sur ${totalPages}` : ''
              }${lastUpdate ? ` — maj ${lastUpdate.toLocaleTimeString('fr-FR')}` : ''}`}
        </p>

        <div className="ncr-grid">
          {visibleRows.map((row) => (
            <article key={row.id} className="ncr-card"
              onClick={() => router.push(`/ncr/${row.id}`)}>
              <div className="ncr-card-top">
                <h3 className="ncr-card-title">{row.titre}</h3>
                <div className="ncr-card-top-right">
                  <span className="ncr-card-date">{row.dateSignalement}</span>
                  <NcrStatusDot value={row.statut} />
                </div>
              </div>
              <p className="ncr-card-desc">{row.description}</p>
            </article>
          ))}
          {!loading && filteredRows.length === 0 && (
            <p className="toolbar-meta" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
              {rows.length === 0 ? 'Aucune NCR enregistrée.' : 'Aucune NCR ne correspond aux critères.'}
            </p>
          )}
        </div>

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
