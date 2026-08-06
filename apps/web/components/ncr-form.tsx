'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { createNcr, fetchWorksites } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Worksite } from '../lib/types';
import { useWorksite } from '../lib/worksite';

const LocationPicker = dynamic(() => import('./location-picker'), {
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

export default function NcrForm() {
  const router = useRouter();
  const { email } = useAuth();
  const { worksite } = useWorksite();

  const [chantiers, setChantiers] = useState<Worksite[]>([]);
  const [chantierNom, setChantierNom] = useState(worksite?.name ?? '');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [priorite, setPriorite] = useState<(typeof PRIORITES)[number]['valeur']>('MEDIUM');
  const [latitude, setLatitude] = useState<number>(46.603354);
  const [longitude, setLongitude] = useState<number>(1.888334);
  const [photo, setPhoto] = useState('');

  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    void fetchWorksites().then(setChantiers);
  }, []);

  useEffect(() => {
    if (!worksite) return;
    setChantierNom(worksite.name);
  }, [worksite]);

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
      const cree = await createNcr({
        projectId: chantierNom,
        creatorId: email ?? 'INCONNU',
        title: titre.trim(),
        description: description.trim(),
        priority: priorite,
        latitude,
        longitude,
        photos: photo ? [photo] : []
      });

      router.push(`/ncr/${cree.id}`);
    } catch (err) {
      setErreur((err as Error).message);
      setEnvoi(false);
    }
  };

  const complet = chantierNom && titre.trim() && description.trim() && photo;

  const manquants: string[] = [];
  if (!chantierNom) manquants.push('Chantier');
  if (!titre.trim()) manquants.push('Titre');
  if (!description.trim()) manquants.push('Description');
  if (!photo) manquants.push('Photo du constat');

  return (
    <form
      onSubmit={soumettre}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      {erreur && <p className="form-error">{erreur}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: 'var(--text-soft)' }}>
          Chantier
          <select
            className="field-select"
            value={chantierNom}
            onChange={(e) => setChantierNom(e.target.value)}
            required
          >
            <option value="">Sélectionner un chantier...</option>
            {chantiers.map((c) => (
              <option key={c.id} value={c.nom}>{c.nom}</option>
            ))}
          </select>
          {chantiers.length === 0 && (
            <span className="field-hint">Aucun chantier disponible.</span>
          )}
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: 'var(--text-soft)' }}>
          Priorité
          <select
            className="field-select"
            value={priorite}
            onChange={(e) => setPriorite(e.target.value as typeof priorite)}
            required
          >
            {PRIORITES.map((p) => (
              <option key={p.valeur} value={p.valeur}>{p.libelle}</option>
            ))}
          </select>
        </label>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: 'var(--text-soft)' }}>
        Titre
        <input
          className="field-input"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Ex: Ferraillage non conforme au plan"
          maxLength={200}
          required
          autoFocus
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: 'var(--text-soft)' }}>
        Description
        <textarea
          className="field-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Constat, localisation dans l'ouvrage, mesure conservatoire prise..."
          required
        />
      </label>

      <LocationPicker
        onChange={({ lat, lng }) => { setLatitude(lat); setLongitude(lng); }}
      />

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: 'var(--text-soft)' }}>
        Photo du constat
        <input type="file" accept="image/*" onChange={choisirPhoto} required
          style={{
            background: '#0d1b30',
            border: '1px solid #2a446c',
            borderRadius: 8,
            padding: '8px 10px',
            color: 'var(--text)',
            fontFamily: 'inherit',
            fontSize: 14
          }}
        />
        <span className="field-hint">
          {photo ? '✅ Photo chargée. ' : ''}
          La photo est transmise avec la NCR et sera visible dans la fiche détail.
        </span>
      </label>

      {manquants.length > 0 && (
        <div style={{
          background: 'rgba(245,159,36,0.1)', border: '1px solid rgba(245,159,36,0.35)',
          borderRadius: 8, padding: '10px 14px', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59f24" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{ color: '#fbbf24' }}>
            Champs obligatoires manquants : <strong>{manquants.join(', ')}</strong>
          </span>
        </div>
      )}

      <button
        type="submit"
        className="filter-button"
        disabled={envoi || !complet}
        style={{ width: '100%', minHeight: 42, fontSize: 15, fontWeight: 600 }}
      >
        {envoi ? 'Enregistrement...' : 'Déclarer la NCR'}
      </button>
    </form>
  );
}
