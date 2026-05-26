export type NcrItem = {
  id: string;
  chantier: string;
  description: string;
  statut: 'RESOLU' | 'EN_ANALYSE' | 'OUVERT';
  priorite: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE';
  worm: boolean;
  latitude: number;
  longitude: number;
  dateSignalement: string;
};

export type HseKpi = {
  crashFreeMobile: number;
  uptime: number;
  delaiClotureNcrJours: number;
  ncrOuvertes: number;
};

export type HseActivity = {
  id: string;
  chantier: string;
  statut: 'RESOLU' | 'EN_ANALYSE' | 'OUVERT';
  ilYA: string;
};
