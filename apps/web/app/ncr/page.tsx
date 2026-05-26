import Link from 'next/link';
import { PriorityBadge, StatusBadge, WormBadge } from '../../components/badges';
import { DashboardShell } from '../../components/dashboard-shell';
import { fetchNcrList } from '../../lib/api';

type Props = {
  searchParams: Promise<{ q?: string; statut?: string; chantier?: string }>;
};

export default async function NcrListPage({ searchParams }: Props) {
  const params = await searchParams;
  const rows = await fetchNcrList();
  const query = (params.q ?? '').toLowerCase();
  const chantier = params.chantier ?? 'all';
  const statut = params.statut ?? 'all';

  const filteredRows = rows.filter((row) => {
    if (query && !`${row.id} ${row.chantier} ${row.description}`.toLowerCase().includes(query)) {
      return false;
    }
    if (chantier !== 'all' && row.chantier !== chantier) {
      return false;
    }
    if (statut !== 'all' && row.statut !== statut) {
      return false;
    }
    return true;
  });

  const chantiers = [...new Set(rows.map((row) => row.chantier))];

  return (
    <DashboardShell title="Liste des NCR">
      <section className="panel">
        <div className="toolbar">
          <form className="filters">
            <input
              type="search"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Rechercher une NCR..."
              className="filter-input"
            />
            <select name="chantier" defaultValue={chantier} className="filter-select">
              <option value="all">Tous les chantiers</option>
              {chantiers.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select name="statut" defaultValue={statut} className="filter-select">
              <option value="all">Tous les statuts</option>
              <option value="OUVERT">Ouvert</option>
              <option value="EN_ANALYSE">En analyse</option>
              <option value="RESOLU">Résolu</option>
            </select>
            <button type="submit" className="filter-button">
              Filtrer
            </button>
          </form>
          <p className="toolbar-meta">Résultats: {filteredRows.length}</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Chantier</th>
              <th>Description</th>
              <th>Statut</th>
              <th>Priorité</th>
              <th>WORM</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td className="id-cell">{row.id}</td>
                <td>{row.chantier}</td>
                <td>{row.description}</td>
                <td>
                  <StatusBadge value={row.statut} />
                </td>
                <td>
                  <PriorityBadge value={row.priorite} />
                </td>
                <td>
                  <WormBadge locked={row.worm} />
                </td>
                <td>
                  <Link href={`/ncr/${row.id}`} className="action-link">
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardShell>
  );
}
