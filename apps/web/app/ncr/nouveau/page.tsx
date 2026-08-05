'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { DashboardShell } from '../../../components/dashboard-shell';
import { createNcr, fetchWorksites } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { Worksite } from '../../../lib/types';
import { useWorksite } from '../../../lib/worksite';

const PRIORITES = [
  { valeur: 'LOW', libelle: 'Basse' },
  { valeur: 'MEDIUM', libelle: 'Moyenne' },
  { valeur: 'HIGH', libelle: 'Haute' },
  { valeur: 'CRITICAL', libelle: 'Critique' }
] as const;

/**
 * `projects.location_gps` est une chaîne libre ; on n'en tire des coordonnées
 * que si elle a bien la forme « latitude, longitude ».
 */
function parseGps(localisation: string | null): { lat: string; lng: string } | null {
  if (!localisation) return null;
  const parts = localisation.split(',').map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((value) => Number.isNaN(value))) return null;
  const [lat, lng] = parts;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat: String(lat), lng: String(lng) };
}

export default function NouvelleNcrPage() {
  const router = useRouter();
  const { email, role } = useAuth();
  const { worksite, ready, openWorksite } = useWorksite();

  const [chantiers, setChantiers] = useState<Worksite[]>([]);
  const [chantierNom, setChantierNom] = useState('');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [priorite, setPriorite] = useState<(typeof PRIORITES)[number]['valeur']>('MEDIUM');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [photo, setPhoto] = useState('');

  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    void fetchWorksites().then(setChantiers);
  }, []);

  // Le chantier ouvert pré-remplit la saisie, ses coordonnées comprises.
  useEffect(() => {
    if (!ready || !worksite) return;
    setChantierNom((actuel) => actuel || worksite.name);
  }, [ready, worksite]);

  useEffect(() => {
    const chantier = chantiers.find((item) => item.nom === chantierNom);
    const gps = parseGps(chantier?.localisation ?? null);
    if (!gps) return;
    setLatitude((actuel) => actuel || gps.lat);
    setLongitude((actuel) => actuel || gps.lng);
  }, [chantiers, chantierNom]);

  const localiser = () => {
    if (!navigator.geolocation) {
      setErreur("La géolocalisation n'est pas disponible dans ce navigateur");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
      },
      () => setErreur('Position refusée — saisissez les coordonnées manuellement')
    );
  };

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

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setErreur('Coordonnées GPS invalides');
      return;
    }

    setEnvoi(true);
    try {
      const cree = await createNcr({
        projectId: chantierNom,
        creatorId: email ?? 'INCONNU',
        title: titre.trim(),
        description: description.trim(),
        priority: priorite,
        latitude: lat,
        longitude: lng,
        photos: [photo]
      });

      // Saisir une NCR sur un chantier vaut ouverture de ce chantier.
      const chantier = chantiers.find((item) => item.nom === chantierNom);
      if (chantier && worksite?.id !== chantier.id) {
        openWorksite({ id: chantier.id, name: chantier.nom });
      }

      // Le chef de chantier n'a pas accès à la liste : le renvoyer vers l'accueil
      if (role === 'CHEF_CHANTIER') {
        router.push('/');
      } else {
        router.push(`/ncr/${cree.id}`);
      }
    } catch (err) {
      setErreur((err as Error).message);
      setEnvoi(false);
    }
  };

  const complet = chantierNom && titre.trim() && description.trim() && latitude && longitude && photo;

  return (
    <DashboardShell title="Déclarer une non-conformité">
      <section className="panel">
        <div className="toolbar">
          <div>
            <h2 style={{ margin: 0 }}>Nouvelle NCR</h2>
            <p className="toolbar-meta">
              La NCR est rattachée au chantier sélectionné et tracée au journal d&apos;audit.
            </p>
          </div>
          <Link href="/ncr" className="action-link">← Retour à la liste</Link>
        </div>

        <form onSubmit={soumettre} className="ncr-form">
          {erreur && <p className="form-error">{erreur}</p>}

          <label>
            Chantier
            <select value={chantierNom} onChange={(e) => setChantierNom(e.target.value)} required>
              <option value="">Sélectionner un chantier...</option>
              {chantiers.map((chantier) => (
                <option key={chantier.id} value={chantier.nom}>{chantier.nom}</option>
              ))}
            </select>
            {chantiers.length === 0 && (
              <span className="field-hint">
                Aucun chantier disponible — <Link href="/chantiers" className="action-link">en ouvrir un</Link>
              </span>
            )}
          </label>

          <label>
            Priorité
            <select
              value={priorite}
              onChange={(e) => setPriorite(e.target.value as typeof priorite)}
              required
            >
              {PRIORITES.map((item) => (
                <option key={item.valeur} value={item.valeur}>{item.libelle}</option>
              ))}
            </select>
          </label>

          <label className="field-wide">
            Titre
            <input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ferraillage non conforme au plan"
              maxLength={200}
              required
            />
          </label>

          <label className="field-wide">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Constat, localisation dans l'ouvrage, mesure conservatoire prise..."
              required
            />
          </label>

          <label>
            Latitude
            <input
              type="number"
              step="any"
              min={-90}
              max={90}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="48.8566"
              required
            />
          </label>

          <label>
            Longitude
            <input
              type="number"
              step="any"
              min={-180}
              max={180}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="2.3522"
              required
            />
            <span className="field-hint">
              <button type="button" onClick={localiser} className="link-button">
                Utiliser ma position
              </button>
            </span>
          </label>

          <label className="field-wide">
            Photo du constat
            <input type="file" accept="image/*" onChange={choisirPhoto} required />
            <span className="field-hint">
              {photo ? '✅ Photo chargée (encodage base64). ' : ''}
              La photo est transmise avec la NCR et sera visible dans la fiche détail.
            </span>
          </label>

          <div className="form-actions">
            <button type="submit" className="filter-button" disabled={envoi || !complet}>
              {envoi ? 'Enregistrement...' : 'Déclarer la NCR'}
            </button>
            <span className="field-hint" suppressHydrationWarning>Auteur: {email ?? 'non identifié'}</span>
          </div>
        </form>
      </section>
    </DashboardShell>
  );
}
