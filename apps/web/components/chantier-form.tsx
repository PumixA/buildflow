'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { createWorksite, updateWorksite } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useWorksite } from '../lib/worksite';

const LocationPicker = dynamic(() => import('./location-picker'), {
  ssr: false,
  loading: () => (
    <div className="lp-map" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="field-hint">Chargement de la carte...</span>
    </div>
  )
});

interface ChantierFormProps {
  mode: 'create' | 'edit';
  initialId?: string;
  initialNom?: string;
  initialLat?: number;
  initialLng?: number;
}

function parseGps(localisation: string | null): { lat: number; lng: number } | null {
  if (!localisation) return null;
  const parts = localisation.split(',').map((p) => Number(p.trim()));
  if (parts.length !== 2 || parts.some((v) => Number.isNaN(v))) return null;
  const [lat, lng] = parts;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

const DEFAULT_LAT = 46.603354;
const DEFAULT_LNG = 1.888334;

export default function ChantierForm({ mode, initialId, initialNom, initialLat, initialLng }: ChantierFormProps) {
  const router = useRouter();
  const { email } = useAuth();
  const { openWorksite } = useWorksite();

  const [nom, setNom] = useState(initialNom ?? '');
  const [latitude, setLatitude] = useState<number>(initialLat ?? DEFAULT_LAT);
  const [longitude, setLongitude] = useState<number>(initialLng ?? DEFAULT_LNG);

  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const isCreate = mode === 'create';

  const soumettre = async (event: FormEvent) => {
    event.preventDefault();
    setErreur(null);
    setEnvoi(true);

    try {
      if (isCreate) {
        const cree = await createWorksite({
          name: nom.trim(),
          locationGps: `${latitude}, ${longitude}`,
          actorId: email ?? 'INCONNU'
        });
        openWorksite({ id: cree.id, name: cree.nom });
        router.push('/ncr');
      } else {
        if (!initialId) throw new Error('Identifiant du chantier manquant');
        await updateWorksite(initialId, {
          name: nom.trim(),
          locationGps: `${latitude}, ${longitude}`,
          actorId: email ?? 'INCONNU'
        });
        router.push('/chantiers');
      }
    } catch (err) {
      setErreur((err as Error).message);
      setEnvoi(false);
    }
  };

  const complet = nom.trim().length > 0;

  return (
    <form
      onSubmit={soumettre}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      {erreur && <p className="form-error">{erreur}</p>}

      {!complet && (
        <div style={{
          background: 'rgba(245,159,36,0.1)', border: '1px solid rgba(245,159,36,0.35)',
          borderRadius: 8, padding: '10px 14px', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59f24" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{ color: '#fbbf24' }}>
            Champ obligatoire manquant : <strong>Nom du chantier</strong>
          </span>
        </div>
      )}

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: 'var(--text-soft)' }}>
        Nom du chantier
        <input
          className="field-input"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex: Résidence Les Oliviers — Bâtiment B"
          maxLength={200}
          required
          autoFocus
        />
      </label>

      <LocationPicker
        onChange={({ lat, lng }) => { setLatitude(lat); setLongitude(lng); }}
        initialLat={initialLat}
        initialLng={initialLng}
      />

      <button
        type="submit"
        className="filter-button"
        disabled={envoi || !complet}
        style={{ width: '100%', minHeight: 42, fontSize: 15, fontWeight: 600 }}
      >
        {envoi ? (isCreate ? 'Création...' : 'Enregistrement...') : (isCreate ? 'Créer le chantier' : 'Enregistrer les modifications')}
      </button>
    </form>
  );
}

export { parseGps };
