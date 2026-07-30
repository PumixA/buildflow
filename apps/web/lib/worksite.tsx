'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'buildflow_worksite';

export type ActiveWorksite = {
  id: string;
  name: string;
};

type WorksiteState = {
  worksite: ActiveWorksite | null;
  /**
   * `false` tant que le localStorage n'a pas été lu. Les écrans doivent
   * l'attendre avant de conclure qu'aucun chantier n'est ouvert, sinon ils
   * affichent brièvement « aucun chantier » à chaque navigation.
   */
  ready: boolean;
  openWorksite: (worksite: ActiveWorksite) => void;
  closeWorksite: () => void;
};

const WorksiteContext = createContext<WorksiteState>({
  worksite: null,
  ready: false,
  openWorksite: () => {},
  closeWorksite: () => {}
});

/**
 * Chantier sur lequel l'utilisateur travaille.
 *
 * Lu dans un effet et non au niveau module : initialiser un `useState` depuis
 * `localStorage` fait diverger le HTML rendu côté serveur de l'état client
 * (hydration mismatch). C'est le défaut déjà présent dans `auth.tsx`, inutile
 * de le reproduire.
 */
export function WorksiteProvider({ children }: { children: ReactNode }) {
  const [worksite, setWorksite] = useState<ActiveWorksite | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ActiveWorksite;
        if (parsed?.id && parsed?.name) {
          setWorksite(parsed);
        }
      }
    } catch {
      // Entrée corrompue (ancien format, écriture partielle) : on repart sans
      // chantier actif plutôt que de bloquer l'application au démarrage.
      localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  const openWorksite = useCallback((next: ActiveWorksite) => {
    setWorksite(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const closeWorksite = useCallback(() => {
    setWorksite(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <WorksiteContext.Provider value={{ worksite, ready, openWorksite, closeWorksite }}>
      {children}
    </WorksiteContext.Provider>
  );
}

export function useWorksite(): WorksiteState {
  return useContext(WorksiteContext);
}
