'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useState } from 'react';
import { DashboardShell } from '../../components/dashboard-shell';
import { createWorksite, fetchWorksites } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { usePoll } from '../../lib/use-poll';
import { useWorksite } from '../../lib/worksite';

/** Seuls ces rôles peuvent ouvrir un chantier — l'API applique la même règle. */
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

  const peutCreer = !!role && ROLES_OUVERTURE.includes(role);

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
      // On enchaîne sur le chantier qui vient d'être ouvert : c'est ce que
      // l'utilisateur veut faire ensuite dans tous les cas.
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
              Le chantier ouvert filtre les NCR et pré-remplit les saisies.
            </p>
          </div>
          <div className="filters">
            {peutCreer && (
              <button
                type="button"
                className="filter-button"
                onClick={() => setFormulaireOuvert((ouvert) => !ouvert)}
              >
                {formulaireOuvert ? 'Annuler' : '+ Nouveau chantier'}
              </button>
            )}
            <p className="toolbar-meta">
              {loading
                ? 'Chargement...'
                : `${chantiers.length} chantier${chantiers.length > 1 ? 's' : ''}${
                    lastUpdate ? ` — maj ${lastUpdate.toLocaleTimeString('fr-FR')}` : ''
                  }`}
            </p>
          </div>
        </div>

        {formulaireOuvert && peutCreer && (
          <form onSubmit={soumettre} className="worksite-form">
            {erreur && <p className="form-error">{erreur}</p>}
            <label>
              Nom du chantier
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Paris - La Défense T4"
                maxLength={160}
                required
              />
            </label>
            <label>
              Localisation (optionnel)
              <input
                value={localisation}
                onChange={(e) => setLocalisation(e.target.value)}
                placeholder="48.8566, 2.3522"
                maxLength={120}
              />
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
                <header>
                  <h3>{chantier.nom}</h3>
                  <span className={`badge status-${chantier.statut === 'ACTIVE' ? 'resolu' : 'ouvert'}`}>
                    {chantier.statut}
                  </span>
                </header>
                <p className="worksite-meta">{chantier.localisation || 'Localisation non renseignée'}</p>
                <p className="worksite-meta">
                  <strong>{chantier.ncrOuvertes}</strong> NCR ouverte
                  {chantier.ncrOuvertes > 1 ? 's' : ''} sur {chantier.ncrTotal} — ouvert le{' '}
                  {chantier.dateOuverture}
                </p>
                <button
                  type="button"
                  className="filter-button"
                  onClick={() => ouvrir(chantier.id, chantier.nom)}
                >
                  {actif ? 'Rouvrir' : 'Ouvrir'}
                </button>
              </article>
            );
          })}
          {!loading && chantiers.length === 0 && (
            <p className="toolbar-meta">
              Aucun chantier enregistré.
              {peutCreer
                ? ' Utilisez « Nouveau chantier » pour en ouvrir un.'
                : " Demandez à la direction des travaux d'en ouvrir un."}
            </p>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
