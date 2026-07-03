'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PriorityBadge, StatusBadge, WormBadge } from '../../components/badges';
import { DashboardShell } from '../../components/dashboard-shell';
import { fetchNcrList } from '../../lib/api';
import { NcrItem } from '../../lib/types';

export default function NcrListPage() {
  const [rows, setRows] = useState<NcrItem[]>([]);
  const [query, setQuery] = useState('');
  const [chantier, setChantier] = useState('all');
  const [statut, setStatut] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNcrList().then((data) => {
      setRows(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filteredRows = rows.filter((row) => {
    if (query && !`${row.id} ${row.chantier} ${row.description}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (chantier !== 'all' && row.chantier !== chantier) return false;
    if (statut !== 'all' && row.statut !== statut) return false;
    return true;
  });

  const chantiers = [...new Set(rows.map((row) => row.chantier))];

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
              <option value="EN_ANALYSE">En analyse</option>
              <option value="RESOLU">Résolu</option>
            </select>
            <button onClick={() => {}} className="filter-button">Filtrer</button>
          </div>
          <p className="toolbar-meta">
            {loading ? 'Chargement...' : `Résultats: ${filteredRows.length}`}
          </p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th><th>Chantier</th><th>Description</th><th>Statut</th><th>Priorité</th><th>WORM</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td className="id-cell">{row.id}</td>
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
      </section>
    </DashboardShell>
  );
}
