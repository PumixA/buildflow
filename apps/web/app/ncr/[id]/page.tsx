'use client';

import { use } from 'react';
import { PriorityBadge, StatusBadge, WormBadge } from '../../../components/badges';
import { DashboardShell } from '../../../components/dashboard-shell';
import { PhotoPreuve } from '../../../components/photo-preuve';
import { fetchNcrDetail } from '../../../lib/api';
import { usePoll } from '../../../lib/use-poll';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Composant client, et non serveur.
 *
 * Le rendu serveur n'a pas accès au token (il vit dans le navigateur) : la page
 * appelait l'API sans authentification valide, recevait un 401 et l'affichait
 * comme « NCR introuvable » — quelle que soit l'existence réelle de la NCR.
 */
export default function NcrDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: detail, loading } = usePoll(() => fetchNcrDetail(id));

  if (loading) {
    return (
      <DashboardShell title="Fiche Détail NCR">
        <section className="panel">
          <p>Chargement…</p>
        </section>
      </DashboardShell>
    );
  }

  if (!detail) {
    return (
      <DashboardShell title="Fiche Détail NCR">
        <section className="panel">
          <p>NCR introuvable.</p>
        </section>
      </DashboardShell>
    );
  }

  const photos = detail.photos ?? [];

  return (
    <DashboardShell title="Fiche Détail NCR">
      <section className="detail-grid">
        <div className="panel">
          {/* Le titre était absent de l'écran : l'en-tête affichait l'UUID brut,
              et la seule trace du libellé saisi restait en base. */}
          <h2>{detail.titre}</h2>
          <p className="subtitle">{detail.description}</p>
          <p className="field-hint">Référence: {detail.id}</p>
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
            {photos.length > 0 ? (
              <>
                <div className="proof-grid">
                  {photos.map((photo, idx) => (
                    typeof photo === 'string' ? (
                      <figure key={idx} className="proof-card proof-photo">
                        <img src={photo} alt={`Photo ${idx + 1}`} style={{maxWidth:'100%',maxHeight:200,objectFit:'contain',borderRadius:8}} />
                        <figcaption>Photo {idx + 1}</figcaption>
                      </figure>
                    ) : (
                      <PhotoPreuve key={photo.id} ncrId={detail.id} photo={photo} />
                    )
                  ))}
                </div>
                <p className="worm-note">
                  {photos.every((photo) => photo.scellee)
                    ? `${photos.length} preuve${photos.length > 1 ? 's' : ''} scellée${
                        photos.length > 1 ? 's' : ''
                      } en WORM, hash SHA-256 enregistré.`
                    : 'Certaines preuves ne sont pas scellées : le stockage WORM n’était pas configuré à leur dépôt.'}
                </p>
              </>
            ) : (
              <p className="worm-note">Aucune preuve archivée pour cette NCR.</p>
            )}
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
