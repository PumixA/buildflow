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
  photos?: PhotoPreuve[];
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

// `null` = non mesuré, distinct de 0. L'interface affiche un tiret plutôt
// qu'un chiffre inventé.
export type HseKpi = {
  crashFreeMobile: number | null;
  uptime: number | null;
  delaiClotureNcrJours: number | null;
  ncrOuvertes: number | null;
  tauxSynchronisation: number | null;
};

export type HseActivity = {
  id: string;
  libelle: string;
  chantier: string;
  statut: 'RESOLU' | 'EN_ANALYSE' | 'OUVERT';
  ilYA: string;
};

export type PhotoPreuve = {
  id: string;
  scellee: boolean;
  latitude: number | null;
  longitude: number | null;
  date: string;
};

export type ActionEnRetard = {
  id: string;
  description: string;
  responsable: string;
  echeance: string;
  joursDeRetard: number;
  statut: string;
};
