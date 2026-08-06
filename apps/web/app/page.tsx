'use client';

import { StatusBadge } from '../components/badges';
import { DashboardShell } from '../components/dashboard-shell';
import { SyncChart } from '../components/sync-chart';
import { fetchHseDashboard } from '../lib/api';
import { usePoll } from '../lib/use-poll';

export default function HomePage() {
  const { data } = usePoll(fetchHseDashboard);
  const kpi = data?.kpi ?? {
    crashFreeMobile: null,
    uptime: null,
    delaiClotureNcrJours: null,
    tauxSynchronisation: null,
    ncrOuvertes: null
  };
  const activity = data?.activity ?? [];
  const actionsEnRetard = data?.actionsEnRetard ?? [];

  const valeur = (n: number | null, suffixe = '') => (n === null ? '—' : `${n}${suffixe}`);

  return (
    <DashboardShell title="Tableau de Bord">
      <div className="kpi-grid">
        <article className="kpi-card">
          <h3>Taux de Synchronisation</h3>
          <p className="kpi-value">{valeur(kpi.tauxSynchronisation, '%')}</p>
          <small>Cible: 99.3%</small>
        </article>
        <article className="kpi-card">
          <h3>Uptime Système</h3>
          <p className="kpi-value">{valeur(kpi.uptime, '%')}</p>
          <small>{kpi.uptime === null ? 'Non mesuré — cible 99.9%' : 'Cible: 99.9%'}</small>
        </article>
        <article className="kpi-card">
          <h3>Délai Clôture NCR</h3>
          <p className="kpi-value">{valeur(kpi.delaiClotureNcrJours, ' j')}</p>
          <small>
            {kpi.delaiClotureNcrJours === null ? 'Aucune NCR clôturée' : 'Objectif: -20%'}
          </small>
        </article>
        <article className="kpi-card">
          <h3>NCR Ouvertes</h3>
          <p className="kpi-value">{valeur(kpi.ncrOuvertes)}</p>
          <small>Cette semaine</small>
        </article>
      </div>
      <section className="dashboard-grid">
        <SyncChart />
        <div className="panel">
          <h3>Activité Récente</h3>
          <ul className="activity-list">
            {activity.map((item) => (
              <li key={item.id}>
                <div>
                  <p className="activity-id">{item.libelle}</p>
                  <p className="activity-site">{item.chantier}</p>
                </div>
                <div className="activity-meta">
                  <StatusBadge value={item.statut} />
                  <small>Il y a {item.ilYA}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="panel">
        <div className="toolbar">
          <div>
            <h3>Actions en retard</h3>
            <p className="toolbar-meta">
              {actionsEnRetard.length === 0
                ? 'Aucune action corrective dont l’échéance est dépassée.'
                : `${actionsEnRetard.length} action${actionsEnRetard.length > 1 ? 's' : ''} corrective${
                    actionsEnRetard.length > 1 ? 's' : ''
                  } au-delà de l’échéance`}
            </p>
          </div>
        </div>
        {actionsEnRetard.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Action</th><th>Responsable</th><th>Échéance</th><th>Retard</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {actionsEnRetard.map((action) => (
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
