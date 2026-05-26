import { PriorityBadge, StatusBadge, WormBadge } from '../../../components/badges';
import { DashboardShell } from '../../../components/dashboard-shell';
import { fetchNcrDetail } from '../../../lib/api';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function NcrDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const detail = await fetchNcrDetail(resolvedParams.id);

  if (!detail) {
    return (
      <DashboardShell title="Fiche Détail NCR">
        <section className="panel">
          <p>NCR introuvable.</p>
        </section>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Fiche Détail NCR">
      <section className="detail-grid">
        <div className="panel">
          <h2>{detail.id}</h2>
          <p className="subtitle">{detail.description}</p>
          <div className="info-grid">
            <div className="info-box">
              <h3>Coordonnées GPS</h3>
              <p>
                {detail.latitude.toFixed(4)}° N, {detail.longitude.toFixed(4)}° E
              </p>
            </div>
            <div className="info-box">
              <h3>Date de signalement</h3>
              <p>{detail.dateSignalement}</p>
            </div>
            <div className="info-box">
              <h3>Chantier</h3>
              <p>{detail.chantier}</p>
            </div>
            <div className="info-box">
              <h3>Priorité</h3>
              <PriorityBadge value={detail.priorite} />
            </div>
            <div className="info-box">
              <h3>Statut</h3>
              <StatusBadge value={detail.statut} />
            </div>
            <div className="info-box">
              <h3>WORM</h3>
              <WormBadge locked={detail.worm} />
            </div>
          </div>
        </div>
        <div className="side-column">
          <div className="panel">
            <h3>Preuves Photographiques</h3>
            <div className="proof-grid">
              <div className="proof-card">
                <span>IMG_001.jpg</span>
              </div>
              <div className="proof-card">
                <span>IMG_002.jpg</span>
              </div>
            </div>
            <p className="worm-note">Archivage WORM certifié, hash SHA-256 validé.</p>
          </div>
          <div className="panel">
            <h3>Historique des Actions</h3>
            <ul className="timeline">
              <li>Signalement initial</li>
              <li>Analyse technique assignée</li>
              <li>Rapport d&apos;inspection ajouté</li>
              <li>Action corrective en cours</li>
            </ul>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
