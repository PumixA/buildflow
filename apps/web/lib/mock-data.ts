import { HseActivity, HseKpi, NcrItem } from './types';

export const mockNcrList: NcrItem[] = [
  {
    id: 'NCR-2024-0156',
    titre: 'Défaut de coffrage niveau 3',
    chantier: 'Lyon Part-Dieu',
    description: 'Défaut de coffrage béton niveau 3',
    statut: 'RESOLU',
    priorite: 'HAUTE',
    worm: true,
    latitude: 45.764,
    longitude: 4.836,
    dateSignalement: '14/01/2024'
  },
  {
    id: 'NCR-2024-0155',
    titre: 'Échafaudage non conforme',
    chantier: 'Paris La Défense T4',
    description: 'Non-conformité sécurité échafaudage',
    statut: 'EN_ANALYSE',
    priorite: 'CRITIQUE',
    worm: true,
    latitude: 48.8924,
    longitude: 2.236,
    dateSignalement: '14/01/2024'
  },
  {
    id: 'NCR-2024-0154',
    titre: "Défaut d'étanchéité toiture",
    chantier: 'Marseille Port',
    description: 'Problème étanchéité toiture terrasse',
    statut: 'OUVERT',
    priorite: 'MOYENNE',
    worm: false,
    latitude: 43.2965,
    longitude: 5.3698,
    dateSignalement: '13/01/2024'
  },
  {
    id: 'NCR-2024-0153',
    titre: 'Écart dimensionnel cloisons',
    chantier: 'Bordeaux Euratlantique',
    description: 'Écart dimensionnel cloisons',
    statut: 'RESOLU',
    priorite: 'BASSE',
    worm: true,
    latitude: 44.8378,
    longitude: -0.5792,
    dateSignalement: '12/01/2024'
  }
];

export const mockHseKpi: HseKpi = {
  crashFreeMobile: null,
  uptime: null,
  delaiClotureNcrJours: 4.2,
  tauxSynchronisation: 99.4,
  ncrOuvertes: 23
};

export const mockHseActivity: HseActivity[] = [
  { id: 'NCR-2024-0156', libelle: 'CHUTE_HAUTEUR', chantier: 'Lyon Part-Dieu', statut: 'RESOLU', ilYA: '15 min' },
  { id: 'NCR-2024-0155', libelle: 'FERRAILLAGE', chantier: 'Paris La Défense T4', statut: 'EN_ANALYSE', ilYA: '32 min' },
  { id: 'NCR-2024-0154', libelle: 'EPI_MANQUANT', chantier: 'Marseille Port', statut: 'OUVERT', ilYA: '1 h' },
  { id: 'NCR-2024-0153', libelle: 'ETANCHEITE', chantier: 'Bordeaux Euratlantique', statut: 'RESOLU', ilYA: '2 h' }
];
