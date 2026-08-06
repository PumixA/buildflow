'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useState } from 'react';
import { DashboardShell } from '../../components/dashboard-shell';
import { createWorksite, fetchWorksites } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { usePoll } from '../../lib/use-poll';
import { useWorksite } from '../../lib/worksite';

const ROLES_OUVERTURE = ['DIRECTION_TRAVAUX', 'ADMIN'];

export default function ChantiersPage() {
  const router = useRouter();
  const { email, role } = useAuth();
  const { worksite, openWorksite } = useWorksite();

  const { data, loading, lastUpdate } = usePoll(fetchWorksites);
  const chantiers = data ?? [];

  const [nom, setNom] = useState('');
  const [localisation, setLocalisation] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);

  const peutCreer = !role || ROLES_OUVERTURE.includes(role);

  const ouvrir = useCallback(
    (id: string, nomChantier: string) => {
      openWorksite({ id, name: nomChantier });
      router.push('/ncr');
    },
    [openWorksite, router]
  );

  const soumettre = async (event: FormEvent) => {
    event.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const cree = await createWorksite({
        name: nom.trim(),
        locationGps: localisation.trim() || undefined,
        actorId: email ?? 'INCONNU'
      });
      setNom('');
      setLocalisation('');
      setFormulaireOuvert(false);
      ouvrir(cree.id, cree.nom);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <DashboardShell title="Chantiers">
      <section className="panel">
        <div className="toolbar">
          <div>
            <h2 style={{ margin: 0 }}>Sélectionner un chantier</h2>
            <p className="toolbar-meta">
              {loading
                ? 'Chargement...'
                : `${chantiers.length} chantier${chantiers.length > 1 ? 's' : ''}${
                    lastUpdate ? ` — maj ${lastUpdate.toLocaleTimeString('fr-FR')}` : ''
                  }`}
            </p>
          </div>
          {peutCreer && (
            <button type="button" className="filter-button"
              onClick={() => setFormulaireOuvert((ouvert) => !ouvert)}>
              {formulaireOuvert ? 'Annuler' : '+ Nouveau chantier'}
            </button>
          )}
        </div>

        {formulaireOuvert && peutCreer && (
          <form onSubmit={soumettre} className="worksite-form">
            {erreur && <p className="form-error">{erreur}</p>}
            <label>
              Nom du chantier
              <input value={nom} onChange={(e) => setNom(e.target.value)}
                placeholder="Paris - La Défense T4" maxLength={160} required />
            </label>
            <label>
              Localisation (optionnel)
              <input value={localisation} onChange={(e) => setLocalisation(e.target.value)}
                placeholder="48.8566, 2.3522" maxLength={120} />
            </label>
            <button type="submit" className="filter-button" disabled={envoi || !nom.trim()}>
              {envoi ? 'Ouverture...' : 'Ouvrir le chantier'}
            </button>
          </form>
        )}

        <div className="worksite-grid">
          {chantiers.map((chantier) => {
            const actif = worksite?.id === chantier.id;
            return (
              <article key={chantier.id} className={`worksite-card${actif ? ' active' : ''}`}>
                <div className="ws-card-body">
                  <div className="ws-card-top">
                    <h3>{chantier.nom}</h3>
                    {actif && <span className="ws-active-badge">Actif</span>}
                  </div>
                  <p className="worksite-meta">{chantier.localisation || 'Sans localisation'}</p>
                  <div className="ws-card-stats">
                    <span><strong>{chantier.ncrOuvertes}</strong> NCR ouvertes</span>
                    <span>sur <strong>{chantier.ncrTotal}</strong></span>
                    <span>depuis {chantier.dateOuverture}</span>
                  </div>
                </div>
                <button type="button" className="ws-open-btn"
                  onClick={() => ouvrir(chantier.id, chantier.nom)}>
                  {actif ? 'Rouvrir' : 'Ouvrir'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </article>
            );
          })}
          {!loading && chantiers.length === 0 && (
            <p className="toolbar-meta" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
              Aucun chantier enregistré.{peutCreer ? ' Utilisez « + Nouveau chantier ».' : ''}
            </p>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
