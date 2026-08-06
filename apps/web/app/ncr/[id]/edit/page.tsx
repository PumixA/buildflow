'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { DashboardShell } from '../../../../components/dashboard-shell';
import { fetchNcrDetail, updateNcr, setNcrStatus, addNcrPhoto } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';
import { peutEditerNcr } from '../../../../lib/roles';
import { usePoll } from '../../../../lib/use-poll';

const LocationPicker = dynamic(() => import('../../../../components/location-picker'), {
  ssr: false,
  loading: () => (
    <div className="lp-map" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="field-hint">Chargement de la carte...</span>
    </div>
  )
});

const PRIORITES = [
  { valeur: 'LOW', libelle: 'Basse' },
  { valeur: 'MEDIUM', libelle: 'Moyenne' },
  { valeur: 'HIGH', libelle: 'Haute' },
  { valeur: 'CRITICAL', libelle: 'Critique' }
] as const;

const STATUTS = [
  { valeur: 'OPEN', libelle: 'Ouvert' },
  { valeur: 'IN_PROGRESS', libelle: 'En cours' },
  { valeur: 'IN_ANALYSIS', libelle: 'En analyse' },
  { valeur: 'RESOLVED', libelle: 'Résolu' },
  { valeur: 'CLOSED', libelle: 'Clôturé' }
] as const;

type Props = { params: Promise<{ id: string }> };

export default function EditNcrPage({ params }: Props) {
  const { id } = React.use(params);
  const router = useRouter();
  const { email, role } = useAuth();
  const { data: detail, loading } = usePoll(() => fetchNcrDetail(id));

  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [priorite, setPriorite] = useState<(typeof PRIORITES)[number]['valeur']>('MEDIUM');
  const [statut, setStatut] = useState<(typeof STATUTS)[number]['valeur']>('OPEN');
  const [latitude, setLatitude] = useState<number>(46.603354);
  const [longitude, setLongitude] = useState<number>(1.888334);
  const [photo, setPhoto] = useState('');

  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!detail) return;
    setTitre(detail.titre);
    setDescription(detail.description);
    setPriorite(detail.priorite === 'BASSE' ? 'LOW' : detail.priorite === 'MOYENNE' ? 'MEDIUM' : detail.priorite === 'HAUTE' ? 'HIGH' : detail.priorite === 'CRITIQUE' ? 'CRITICAL' : 'MEDIUM');
    setStatut(detail.statut === 'OUVERT' ? 'OPEN' : detail.statut === 'EN_COURS' ? 'IN_PROGRESS' : detail.statut === 'EN_ANALYSE' ? 'IN_ANALYSIS' : detail.statut === 'RESOLU' ? 'RESOLVED' : detail.statut === 'CLOTURE' ? 'CLOSED' : 'OPEN');
    setLatitude(detail.latitude);
    setLongitude(detail.longitude);
  }, [detail]);

  const choisirPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const soumettre = async (event: FormEvent) => {
    event.preventDefault();
    setErreur(null);
    setEnvoi(true);

    try {
      // Mettre à jour les infos de base
      await updateNcr(id, {
        title: titre.trim(),
        description: description.trim(),
        priority: priorite
      });

      // Mettre à jour le statut s'il a changé
      if (statut !== (detail?.statut === 'OUVERT' ? 'OPEN' : detail?.statut === 'EN_COURS' ? 'IN_PROGRESS' : detail?.statut === 'EN_ANALYSE' ? 'IN_ANALYSIS' : detail?.statut === 'RESOLU' ? 'RESOLVED' : detail?.statut === 'CLOTURE' ? 'CLOSED' : 'OPEN')) {
        await setNcrStatus(id, statut, email ?? 'INCONNU');
      }

      // Ajouter une photo si sélectionnée
      if (photo) {
        await addNcrPhoto(id, photo);
      }

      router.push(`/ncr/${id}`);
    } catch (err) {
      setErreur((err as Error).message);
      setEnvoi(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell title="Modifier NCR">
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
          <p className="toolbar-meta" style={{ textAlign: 'center', padding: 40 }}>NCR introuvable.</p>
        </section>
      </DashboardShell>
    );
  }

  const complet = titre.trim() && description.trim();

  if (!peutEditerNcr(role)) {
    return (
      <DashboardShell title="Accès refusé">
        <section className="panel" style={{ textAlign: 'center', padding: 40 }}>
          <h2 style={{ margin: '0 0 12px' }}>Accès refusé</h2>
          <p className="toolbar-meta">Votre rôle ({role ?? 'inconnu'}) ne permet pas de modifier une NCR.</p>
          <Link href={`/ncr/${id}`} className="action-link" style={{ marginTop: 16, display: 'inline-block' }}>← Retour à la fiche</Link>
        </section>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Modifier NCR">
      <section className="panel">
        <div className="toolbar">
          <div>
            <h2 style={{ margin: 0 }}>Modifier la NCR</h2>
            <p className="toolbar-meta">
              {detail.chantier} · {detail.dateSignalement} · Réf: {id.slice(0, 8)}
            </p>
          </div>
          <Link href={`/ncr/${id}`} className="action-link">← Retour à la fiche</Link>
        </div>

        <form onSubmit={soumettre} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {erreur && <p className="form-error">{erreur}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: 'var(--text-soft)' }}>
              Priorité
              <select className="field-select" value={priorite} onChange={(e) => setPriorite(e.target.value as typeof priorite)}>
                {PRIORITES.map((p) => <option key={p.valeur} value={p.valeur}>{p.libelle}</option>)}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: 'var(--text-soft)' }}>
              Statut
              <select className="field-select" value={statut} onChange={(e) => setStatut(e.target.value as typeof statut)}>
                {STATUTS.map((s) => <option key={s.valeur} value={s.valeur}>{s.libelle}</option>)}
              </select>
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: 'var(--text-soft)' }}>
            Titre
            <input className="field-input" value={titre} onChange={(e) => setTitre(e.target.value)}
              maxLength={200} required autoFocus />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: 'var(--text-soft)' }}>
            Description
            <textarea className="field-textarea" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </label>

          <LocationPicker
            onChange={({ lat, lng }) => { setLatitude(lat); setLongitude(lng); }}
            initialLat={latitude}
            initialLng={longitude}
          />

          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: 'var(--text-soft)' }}>
            Ajouter une photo
            <input type="file" accept="image/*" onChange={choisirPhoto}
              style={{ background: '#0d1b30', border: '1px solid #2a446c', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14 }} />
            <span className="field-hint">
              {photo ? '✅ Nouvelle photo prête. ' : ''}
              Les photos existantes sont conservées.
            </span>
          </label>

          {!complet && (
            <div style={{
              background: 'rgba(245,159,36,0.1)', border: '1px solid rgba(245,159,36,0.35)',
              borderRadius: 8, padding: '10px 14px', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59f24" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ color: '#fbbf24' }}>
                Champs obligatoires manquants : <strong>{[!titre.trim() && 'Titre', !description.trim() && 'Description'].filter(Boolean).join(', ')}</strong>
              </span>
            </div>
          )}

          <button type="submit" className="filter-button" disabled={envoi || !complet}
            style={{ width: '100%', minHeight: 42, fontSize: 15, fontWeight: 600 }}>
            {envoi ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </form>
      </section>
    </DashboardShell>
  );
}

