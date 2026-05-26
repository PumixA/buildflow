import { StatusBadge } from '../../components/badges';
import { DashboardShell } from '../../components/dashboard-shell';
import { SyncChart } from '../../components/sync-chart';
import { fetchHseDashboard } from '../../lib/api';

export default async function HseDashboardPage() {
  const { kpi, activity } = await fetchHseDashboard();

  return (
    <DashboardShell title="Tableau de Bord HSE">
      <div className="kpi-grid">
        <article className="kpi-card">
          <h3>Taux de Crash Mobile</h3>
          <p className="kpi-value">{kpi.crashFreeMobile}%</p>
          <small>Cible: 99.5%</small>
        </article>
        <article className="kpi-card">
          <h3>Uptime Système</h3>
          <p className="kpi-value">{kpi.uptime}%</p>
          <small>Cible: 99.9%</small>
        </article>
        <article className="kpi-card">
          <h3>Délai Clôture NCR</h3>
          <p className="kpi-value">{kpi.delaiClotureNcrJours} jours</p>
          <small>Objectif: -20%</small>
        </article>
        <article className="kpi-card">
          <h3>NCR Ouvertes</h3>
          <p className="kpi-value">{kpi.ncrOuvertes}</p>
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
                  <p className="activity-id">{item.id}</p>
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
    </DashboardShell>
  );
}
