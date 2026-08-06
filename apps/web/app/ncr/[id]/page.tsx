'use client';

import Link from 'next/link';
import { use, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NcrStatusDot, PriorityBadge, WormBadge } from '../../../components/badges';
import { DashboardShell } from '../../../components/dashboard-shell';
import { PhotoPreuve } from '../../../components/photo-preuve';
import { fetchNcrDetail } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { peutEditerNcr } from '../../../lib/roles';
import { usePoll } from '../../../lib/use-poll';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<string, string> = {
  OUVERT: 'Ouvert — signalé, en attente de traitement',
  EN_COURS: 'En cours — une action corrective est engagée',
  EN_ANALYSE: 'En analyse — en cours d\'évaluation technique',
  RESOLU: 'Résolu — l\'action corrective est terminée',
  CLOTURE: 'Clôturé — vérifié et archivé'
};

function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInst = useRef<L.Map | null>(null);
  const markerInst = useRef<L.Marker | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInst.current) {
      const map = L.map(mapRef.current, { zoomControl: false, dragging: false, scrollWheelZoom: false })
        .setView([lat, lng], 15);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: 'OSM', subdomains: 'abcd', maxZoom: 19
      }).addTo(map);
      mapInst.current = map;
      setReady(true);
    }

    if (markerInst.current) {
      mapInst.current.removeLayer(markerInst.current);
    }
    const marker = L.marker([lat, lng]).addTo(mapInst.current!);
    markerInst.current = marker;
    mapInst.current.setView([lat, lng], mapInst.current.getZoom());
  }, [lat, lng]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 160, borderRadius: 10 }}>
    {!ready && <span className="field-hint" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>...</span>}
  </div>;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type Props = { params: Promise<{ id: string }> };

export default function NcrDetailPage({ params }: Props) {
  const { id } = use(params);
  const { role } = useAuth();
  const { data: detail, loading } = usePoll(() => fetchNcrDetail(id));
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (loading) {
    return (
      <DashboardShell title="Détail NCR">
        <section className="panel">
          <p className="toolbar-meta" style={{ textAlign: 'center', padding: 40 }}>Chargement…</p>
        </section>
      </DashboardShell>
    );
  }

  if (!detail) {
    return (
      <DashboardShell title="NCR introuvable">
        <section className="panel">
          <p className="toolbar-meta" style={{ textAlign: 'center', padding: 40 }}>
            NCR introuvable.
          </p>
        </section>
      </DashboardShell>
    );
  }

  const photos = detail.photos ?? [];

  return (
    <DashboardShell title="Détail NCR">
      <section className="panel">
        {/* Toolbar */}
        <div className="toolbar">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.titre}</span>
              <NcrStatusDot value={detail.statut} />
            </h2>
            <p className="toolbar-meta">
              {detail.chantier} · {detail.dateSignalement} · Réf: {detail.id.slice(0, 8)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {peutEditerNcr(role) && (
              <Link href={`/ncr/${id}/edit`} className="filter-button" style={{ textDecoration: 'none' }}>
                Modifier
              </Link>
            )}
            <Link href="/ncr" className="action-link" style={{ alignSelf: 'center' }}>← Retour</Link>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Description */}
          <div className="ncr-detail-desc">
            <p>{detail.description}</p>
          </div>

          {/* Badges + légendes */}
          <div className="ncr-detail-badges-row">
            <div className="ncr-card-badges" style={{ alignItems: 'center' }}>
              <PriorityBadge value={detail.priorite} />
              <WormBadge locked={detail.worm} />
            </div>
            <span className="field-hint" title={STATUS_LABELS[detail.statut] ?? ''} style={{ cursor: 'help' }}>
              {STATUS_LABELS[detail.statut] ?? detail.statut}
            </span>
          </div>

          {/* Infos + Carte */}
          <div className="ncr-detail-grid">
            <div className="ncr-detail-info">
              <div className="ncr-detail-row">
                <span className="ncr-detail-label">Coordonnées</span>
                <span>{detail.latitude.toFixed(5)}° N, {detail.longitude.toFixed(5)}° E</span>
              </div>
              <div className="ncr-detail-row">
                <span className="ncr-detail-label">Date</span>
                <span>{detail.dateSignalement}</span>
              </div>
              <div className="ncr-detail-row">
                <span className="ncr-detail-label">Chantier</span>
                <span>{detail.chantier}</span>
              </div>
            </div>

            <div className="ncr-detail-map">
              <MiniMap lat={detail.latitude} lng={detail.longitude} />
            </div>
          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Preuves photographiques</h3>
              <div className="proof-grid">
                {photos.map((photo, idx) =>
                  typeof photo === 'string' ? (
                    <figure key={idx} className="proof-card proof-photo"
                      onClick={() => setLightbox(photo)}
                      style={{ cursor: 'pointer' }}>
                      <img src={photo} alt={`Photo ${idx + 1}`}
                        style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8 }} />
                      <figcaption>Photo {idx + 1} — cliquer pour agrandir</figcaption>
                    </figure>
                  ) : (
                    <PhotoPreuve key={photo.id} ncrId={detail.id} photo={photo} onPhotoUrl={(url) => setLightbox(url)} />
                  )
                )}
              </div>
            </div>
          )}

          {/* Lightbox */}
          {lightbox && (
            <div className="lightbox" onClick={() => setLightbox(null)}>
              <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
              <img src={lightbox} alt="Preuve agrandie" onClick={(e) => e.stopPropagation()} />
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
