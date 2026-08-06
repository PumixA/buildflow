'use client';

import Link from 'next/link';
import { StatusBadge } from '../components/badges';
import { DashboardShell } from '../components/dashboard-shell';
import { fetchHseDashboard, fetchNcrList, fetchWorksites } from '../lib/api';
<<<<<<< HEAD
import { useAuth } from '../lib/auth';
import { peutCreerChantier, peutCreerNcr, peutListerNcr } from '../lib/roles';
=======
>>>>>>> origin/main
import { usePoll } from '../lib/use-poll';
import { useWorksite } from '../lib/worksite';

export default function HomePage() {
<<<<<<< HEAD
  const { role } = useAuth();
  const { worksite } = useWorksite();

  const isChef = role === 'CHEF_CHANTIER';
  const canListNcr = peutListerNcr(role);
  const canCreateNcr = peutCreerNcr(role);

  // Ne charger que ce que le rôle peut voir (évite les 403 inutiles)
  const { data: chantiers, loading: loadingChantiers } = usePoll(fetchWorksites, 30000);
  const { data: hse } = usePoll(
    canListNcr ? fetchHseDashboard : (() => Promise.resolve(null)),
    canListNcr ? 10000 : 60000
  );
  const { data: ncrData } = usePoll(
    canListNcr ? () => fetchNcrList(worksite?.name) : (() => Promise.resolve(null)),
    canListNcr ? 10000 : 60000,
    canListNcr ? (worksite?.name ?? 'all') : 'skip'
  );
=======
  const { worksite } = useWorksite();

  const { data: hse } = usePoll(fetchHseDashboard);
  const { data: ncrData } = usePoll(() => fetchNcrList(worksite?.name), 10000, worksite?.name ?? 'all');
  const { data: chantiers } = usePoll(fetchWorksites, 30000);
>>>>>>> origin/main

  const ncrOuvertes = hse?.kpi?.ncrOuvertes ?? null;
  const actionsRetard = hse?.actionsEnRetard ?? [];
  const activity = hse?.activity ?? [];
  const ncrTotal = ncrData?.total ?? null;
  const ncrActives = ncrData?.items?.filter((n) => n.statut !== 'RESOLU' && n.statut !== 'CLOTURE').length ?? null;
  const chantiersCount = chantiers?.length ?? null;
<<<<<<< HEAD
  const chantierActif = chantiers?.find((c) => c.nom === worksite?.name || c.id === worksite?.id) ?? null;

  const valeur = (n: number | null, suffixe = '') => (n === null ? '—' : `${n}${suffixe}`);

  /* ------------------------------------------------------------------ */
  /*  Dashboard CHEF_CHANTIER — terrain                                  */
  /* ------------------------------------------------------------------ */
  if (isChef) {
    return (
      <DashboardShell title="Tableau de Bord">
        {/* Chantier actif */}
        {chantierActif && (
          <section className="panel" style={{ marginBottom: 14 }}>
            <div className="toolbar" style={{ marginBottom: 6 }}>
              <div>
                <h3 style={{ margin: 0 }}>Chantier actif</h3>
                <p className="toolbar-meta">Vous travaillez actuellement sur ce chantier</p>
              </div>
              <Link href="/chantiers" className="action-link">Changer →</Link>
            </div>
            <div className="worksite-card" style={{ cursor: 'default', opacity: 1, borderColor: 'var(--primary)' }}>
              <div className="ws-card-body">
                <div className="ws-card-top">
                  <h3>
                    <span className="ws-dot" style={{ display: 'inline-block', marginRight: 8 }} />
                    {chantierActif.nom}
                  </h3>
                </div>
                <p className="worksite-meta">{chantierActif.localisation || 'Sans localisation'}</p>
                <div className="ws-card-stats">
                  <span><strong>{chantierActif.ncrOuvertes}</strong> NCR ouvertes</span>
                  <span>sur <strong>{chantierActif.ncrTotal}</strong></span>
                  <span>depuis {chantierActif.dateOuverture}</span>
                </div>
              </div>
            </div>
            <p className="field-hint" style={{ marginTop: 10, textAlign: 'center' }}>
              {chantierActif.ncrOuvertes > 0
                ? `${chantierActif.ncrOuvertes} NCR à traiter sur ce chantier`
                : 'Aucune NCR ouverte sur ce chantier'}
            </p>
          </section>
        )}

        {!chantierActif && !loadingChantiers && (
          <section className="panel" style={{ marginBottom: 14, textAlign: 'center', padding: 32 }}>
            <p className="toolbar-meta" style={{ marginBottom: 12 }}>Aucun chantier sélectionné</p>
            <Link href="/chantiers" className="filter-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Ouvrir un chantier
            </Link>
          </section>
        )}

        {/* KPIs */}
        <div className="kpi-grid">
          <article className="kpi-card">
            <div className="kpi-icon ncr">NCR</div>
            <div className="kpi-body">
              <p className="kpi-value">{chantierActif ? valeur(chantierActif.ncrOuvertes) : '—'}</p>
              <h3>NCR ouvertes</h3>
              <small>Sur le chantier actif</small>
            </div>
          </article>

          <article className="kpi-card">
            <div className="kpi-icon chantiers">CH</div>
            <div className="kpi-body">
              <p className="kpi-value">{loadingChantiers ? '...' : valeur(chantiersCount)}</p>
              <h3>Chantiers</h3>
              <small>
                <Link href="/chantiers" className="action-link">Voir la liste</Link>
              </small>
            </div>
          </article>
        </div>

        {/* Quick actions */}
        <div className="dashboard-grid" style={{ marginTop: 12 }}>
          <div className="panel" style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 16px' }}>Action rapide</h3>
            {canCreateNcr && (
              <Link href="/ncr/nouveau" className="cta-link" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '18px 20px', fontSize: 16, fontWeight: 700
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Déclarer une NCR
              </Link>
            )}
            <p className="field-hint" style={{ marginTop: 12 }}>
              {!worksite ? 'Ouvrez un chantier pour déclarer une NCR' : 'La NCR sera rattachée au chantier actif'}
            </p>
          </div>

          <div className="panel">
            <h3 style={{ margin: '0 0 4px' }}>Rôle</h3>
            <p className="toolbar-meta" style={{ marginBottom: 8 }}>Chef de chantier — accès terrain</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                ✅ Déclarer des NCR avec photo et GPS
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                ✅ Utiliser l&apos;app mobile hors-ligne
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                ✅ Synchroniser au retour du réseau
              </span>
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Dashboard QSE / DT / ADMIN — pilotage                             */
  /* ------------------------------------------------------------------ */
=======

  const valeur = (n: number | null, suffixe = '') => (n === null ? '—' : `${n}${suffixe}`);

>>>>>>> origin/main
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
<<<<<<< HEAD
=======
        {/* Activité récente */}
>>>>>>> origin/main
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

<<<<<<< HEAD
        <div className="panel">
          <h3 style={{ margin: '0 0 12px' }}>Accès rapides</h3>
          <div className="quick-links">
            {canCreateNcr && (
              <Link href="/ncr/nouveau" className="cta-link">Déclarer une NCR</Link>
            )}
            {peutCreerChantier(role) && (
              <Link href="/chantiers/nouveau" className="cta-link">Nouveau chantier</Link>
            )}
            <Link href="/chantiers" className="cta-link">Gérer les chantiers</Link>
            {canListNcr && <Link href="/ncr" className="cta-link">Liste des NCR</Link>}
=======
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
>>>>>>> origin/main
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
