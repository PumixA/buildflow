export type NcrItem = {
  id: string;
  titre: string;
  chantier: string;
  description: string;
  statut: 'RESOLU' | 'EN_ANALYSE' | 'OUVERT';
  priorite: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE';
  worm: boolean;
  latitude: number;
  longitude: number;
  dateSignalement: string;
};

export type Worksite = {
  id: string;
  nom: string;
  localisation: string | null;
  statut: string;
  ncrOuvertes: number;
  ncrTotal: number;
  dateOuverture: string;
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

export type ActionEnRetard = {
  id: string;
  description: string;
  responsable: string;
  echeance: string;
  joursDeRetard: number;
  statut: string;
};
