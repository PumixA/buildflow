'use client';

import { useEffect, useRef, useState } from 'react';

const DEFAULT_INTERVAL_MS = 5000;

type PollState<T> = {
  data: T | null;
  loading: boolean;
  lastUpdate: Date | null;
};

/**
 * Charge une donnée puis la rafraîchit à intervalle régulier.
 *
 * Le polling est suspendu quand l'onglet est masqué et relancé au retour :
 * inutile d'interroger l'API pour un écran que personne ne regarde, et ça
 * évite d'accumuler des requêtes en retard sur un onglet laissé ouvert.
 */
export function usePoll<T>(fetcher: () => Promise<T>, intervalMs = DEFAULT_INTERVAL_MS): PollState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Gardé dans une ref pour qu'un fetcher redéfini à chaque rendu ne relance
  // pas l'intervalle en boucle.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        const result = await fetcherRef.current();
        if (cancelled) return;
        setData(result);
        setLastUpdate(new Date());
      } catch {
        // Une passe ratée ne doit pas vider l'écran : on garde la dernière
        // donnée connue et on retentera au tick suivant.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(load, intervalMs);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        void load();
        start();
      }
    };

    void load();
    start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs]);

  return { data, loading, lastUpdate };
}
