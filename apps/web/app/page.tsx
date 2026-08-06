'use client';

import Link from 'next/link';
import { StatusBadge } from '../components/badges';
import { DashboardShell } from '../components/dashboard-shell';
import { fetchHseDashboard, fetchNcrList, fetchWorksites } from '../lib/api';
import { usePoll } from '../lib/use-poll';
import { useWorksite } from '../lib/worksite';

export default function HomePage() {
  const { worksite } = useWorksite();

  const { data: hse } = usePoll(fetchHseDashboard);
  const { data: ncrData } = usePoll(() => fetchNcrList(worksite?.name), 10000, worksite?.name ?? 'all');
  const { data: chantiers } = usePoll(fetchWorksites, 30000);

  const ncrOuvertes = hse?.kpi?.ncrOuvertes ?? null;
  const actionsRetard = hse?.actionsEnRetard ?? [];
  const activity = hse?.activity ?? [];
  const ncrTotal = ncrData?.total ?? null;
  const ncrActives = ncrData?.items?.filter((n) => n.statut !== 'RESOLU' && n.statut !== 'CLOTURE').length ?? null;
  const chantiersCount = chantiers?.length ?? null;

  const valeur = (n: number | null, suffixe = '') => (n === null ? '—' : `${n}${suffixe}`);

  return (
    <DashboardShell title="Tableau de Bord">
      {/* KPI */}
      <div className="kpi-grid">
        <article className="kpi-card">
          <div className="kpi-icon ncr">NCR</div>
          <div className="kpi-body">
            <p className="kpi-value">{valeur(ncrOuvertes)}</p>
            <h3>NCR ouvertes</h3>
            <small>{ncrTotal !== null ? `sur ${ncrTotal} au total` : 'Chargement...'}</small>
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-icon active">ACT</div>
          <div className="kpi-body">
            <p className="kpi-value">{valeur(ncrActives)}</p>
            <h3>NCR actives</h3>
            <small>{worksite ? `Chantier: ${worksite.name}` : 'Tous chantiers'}</small>
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-icon chantiers">CH</div>
          <div className="kpi-body">
            <p className="kpi-value">{valeur(chantiersCount)}</p>
            <h3>Chantiers</h3>
            <small>
              <Link href="/chantiers" className="action-link">Voir la liste</Link>
            </small>
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-icon retard">!</div>
          <div className="kpi-body">
            <p className="kpi-value" style={actionsRetard.length > 0 ? { color: '#f59f24' } : undefined}>
              {valeur(actionsRetard.length)}
            </p>
            <h3>Actions en retard</h3>
            <small>
              {actionsRetard.length === 0 ? 'Tout est à jour' : `${actionsRetard.length} action${actionsRetard.length > 1 ? 's' : ''} dépassée${actionsRetard.length > 1 ? 's' : ''}`}
            </small>
          </div>
        </article>
      </div>

      {/* Contenu principal */}
      <div className="dashboard-grid">
        {/* Activité récente */}
        <div className="panel">
          <div className="toolbar" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Activité récente</h3>
            <Link href="/ncr" className="action-link">Tout voir →</Link>
          </div>
          {activity.length > 0 ? (
            <ul className="activity-list">
              {activity.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <div>
                    <p className="activity-id">{item.libelle}</p>
                    <p className="activity-site">{item.chantier}</p>
                  </div>
                  <div className="activity-meta">
                    <StatusBadge value={item.statut} />
                    <small>{item.ilYA}</small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="toolbar-meta" style={{ textAlign: 'center', padding: 24 }}>
              Aucune activité récente.
            </p>
          )}
        </div>

        {/* Raccourcis */}
        <div className="panel">
          <h3 style={{ margin: '0 0 12px' }}>Accès rapides</h3>
          <div className="quick-links">
            <Link href="/ncr/nouveau" className="cta-link">
              Déclarer une NCR
            </Link>
            <Link href="/chantiers/nouveau" className="cta-link">
              Nouveau chantier
            </Link>
            <Link href="/chantiers" className="cta-link">
              Gérer les chantiers
            </Link>
            <Link href="/ncr" className="cta-link">
              Liste des NCR
            </Link>
          </div>
        </div>
      </div>

      {/* Actions en retard */}
      <section className="panel" style={{ marginTop: 12 }}>
        <div className="toolbar">
          <div>
            <h3 style={{ margin: 0 }}>Actions correctives en retard</h3>
            <p className="toolbar-meta">
              {actionsRetard.length === 0
                ? 'Aucune action dont l\'échéance est dépassée.'
                : `${actionsRetard.length} action${actionsRetard.length > 1 ? 's' : ''} au-delà de l'échéance`}
            </p>
          </div>
        </div>
        {actionsRetard.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Action</th><th>Responsable</th><th>Échéance</th><th>Retard</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {actionsRetard.map((action) => (
                <tr key={action.id}>
                  <td>{action.description}</td>
                  <td>{action.responsable}</td>
                  <td>{action.echeance}</td>
                  <td>
                    <span className="badge retard">
                      {action.joursDeRetard} jour{action.joursDeRetard > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td>
                    <StatusBadge value={action.statut === 'OPEN' ? 'OUVERT' : 'EN_ANALYSE'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </DashboardShell>
  );
}
