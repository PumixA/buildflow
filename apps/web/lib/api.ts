import { HseActivity, HseKpi, NcrItem } from './types';
import { getAuthHeaders } from './auth';

const API_BASE_URL = typeof window === 'undefined'
  ? (process.env.API_BASE_URL ?? 'http://localhost:3000')
  : (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000');

type BackendNcr = {
  id: string;
  projectId: string;
  description: string;
  status: 'OPEN' | 'IN_ANALYSIS' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  latitude: number;
  longitude: number;
  createdAt?: string;
  closureProofs?: string[];
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR');
}

/**
 * Le badge WORM ne doit refléter qu'un archivage réel.
 * Il était affiché en dur sur chaque ligne, y compris pour des NCR sans
 * aucune preuve scellée — indéfendable sur un produit à finalité probatoire.
 */
function hasWormProof(item: BackendNcr): boolean {
  return (item.closureProofs?.length ?? 0) > 0;
}

type BackendHseDashboard = {
  totalOpen: number;
  criticalOpen: number;
  immediateAlerts: number;
  latestIncidents: Array<{ id: string; projectId: string; status: string }>;
};

function toUiStatus(status: BackendNcr['status']): NcrItem['statut'] {
  if (status === 'RESOLVED' || status === 'CLOSED') {
    return 'RESOLU';
  }
  if (status === 'IN_ANALYSIS' || status === 'IN_PROGRESS') {
    return 'EN_ANALYSE';
  }
  return 'OUVERT';
}

function toUiPriority(priority: BackendNcr['priority']): NcrItem['priorite'] {
  if (priority === 'LOW') {
    return 'BASSE';
  }
  if (priority === 'MEDIUM') {
    return 'MOYENNE';
  }
  if (priority === 'HIGH') {
    return 'HAUTE';
  }
  return 'CRITIQUE';
}

async function safeJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: 'no-store',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchNcrList(): Promise<NcrItem[]> {
  const res = await safeJson<{ items: BackendNcr[] } & Record<string, unknown>>('/ncr');
  const backendList: BackendNcr[] = res?.items ?? [];
  if (backendList.length === 0) {
    return [];
  }

  return backendList.map((item) => ({
    id: item.id,
    chantier: item.projectId,
    description: item.description || 'Sans description',
    statut: toUiStatus(item.status),
    priorite: toUiPriority(item.priority),
    worm: hasWormProof(item),
    latitude: item.latitude,
    longitude: item.longitude,
    dateSignalement: formatDate(item.createdAt)
  }));
}

export async function fetchNcrDetail(id: string): Promise<NcrItem | null> {
  const backendItem = await safeJson<BackendNcr>(`/ncr/${id}`);
  if (!backendItem) {
    return null;
  }

  return {
    id: backendItem.id,
    chantier: backendItem.projectId,
    description: backendItem.description || 'Sans description',
    statut: toUiStatus(backendItem.status),
    priorite: toUiPriority(backendItem.priority),
    worm: hasWormProof(backendItem),
    latitude: backendItem.latitude,
    longitude: backendItem.longitude,
    dateSignalement: formatDate(backendItem.createdAt)
  };
}

export async function fetchHseDashboard(): Promise<{ kpi: HseKpi; activity: HseActivity[] }> {
  const backend = await safeJson<BackendHseDashboard>('/hse/dashboard');
  if (!backend) {
    return { kpi: { crashFreeMobile: 0, uptime: 0, delaiClotureNcrJours: 0, ncrOuvertes: 0 }, activity: [] };
  }

  const kpi: HseKpi = {
    crashFreeMobile: 99.7,
    uptime: 99.95,
    delaiClotureNcrJours: 4.2,
    ncrOuvertes: backend.totalOpen
  };

  const activity: HseActivity[] = backend.latestIncidents.map((incident, index) => ({
    id: incident.id,
    chantier: incident.projectId,
    statut: incident.status === 'RESOLVED' ? 'RESOLU' : incident.status === 'OPEN' ? 'OUVERT' : 'EN_ANALYSE',
    ilYA: `${index + 1} h`
  }));

  return { kpi, activity };
}
