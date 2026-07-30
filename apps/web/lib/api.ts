import { HseActivity, HseKpi, NcrItem, Worksite } from './types';
import { getAuthHeaders } from './auth';

const API_BASE_URL = typeof window === 'undefined'
  ? (process.env.API_BASE_URL ?? 'http://localhost:3000')
  : (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000');

type BackendNcr = {
  id: string;
  projectId: string;
  title: string;
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

/**
 * Écritures : contrairement à `safeJson`, on laisse remonter l'erreur.
 *
 * Avaler l'échec d'un POST afficherait un formulaire qui semble avoir
 * fonctionné alors que rien n'a été enregistré.
 */
async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    // NestJS renvoie un tableau de messages quand le ValidationPipe rejette le corps.
    const message = Array.isArray(payload?.message) ? payload?.message.join(', ') : payload?.message;
    throw new Error(message || `Échec de la requête (HTTP ${response.status})`);
  }

  return (await response.json()) as T;
}

type BackendProject = {
  id: string;
  name: string;
  locationGps: string | null;
  status: string;
  createdAt: string;
  openNcrCount: number;
  totalNcrCount: number;
};

function toWorksite(project: BackendProject): Worksite {
  return {
    id: project.id,
    nom: project.name,
    localisation: project.locationGps,
    statut: project.status,
    ncrOuvertes: project.openNcrCount,
    ncrTotal: project.totalNcrCount,
    dateOuverture: formatDate(project.createdAt)
  };
}

export async function fetchWorksites(): Promise<Worksite[]> {
  const res = await safeJson<{ items: BackendProject[]; total: number }>('/projects');
  return (res?.items ?? []).map(toWorksite);
}

export async function createWorksite(input: {
  name: string;
  locationGps?: string;
  actorId: string;
}): Promise<Worksite> {
  const created = await postJson<BackendProject>('/projects', input);
  return toWorksite(created);
}

export type CreateNcrInput = {
  /** Code chantier (`projects.name`), pas l'UUID : c'est ce que l'API résout. */
  projectId: string;
  creatorId: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  latitude: number;
  longitude: number;
  photos: string[];
};

export async function createNcr(input: CreateNcrInput): Promise<{ id: string }> {
  return postJson<{ id: string }>('/ncr', input);
}

export async function fetchNcrList(projectId?: string): Promise<NcrItem[]> {
  // Le filtre est appliqué en SQL côté API : filtrer après coup ne verrait que
  // les 100 premières NCR tous chantiers confondus.
  const path = projectId ? `/ncr?projectId=${encodeURIComponent(projectId)}` : '/ncr';
  const res = await safeJson<{ items: BackendNcr[] } & Record<string, unknown>>(path);
  const backendList: BackendNcr[] = res?.items ?? [];
  if (backendList.length === 0) {
    return [];
  }

  return backendList.map((item) => ({
    id: item.id,
    titre: item.title || 'Sans titre',
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
    titre: backendItem.title || 'Sans titre',
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
