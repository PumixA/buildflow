import { Ncr, NcrStatus } from '../../libs/domain/src/models';

export type NcrPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CreateNcrInput = {
  title: string;
  description: string;
  projectId: string;
  creatorId: string;
  photos: string[];
  latitude?: number;
  longitude?: number;
  priority: NcrPriority;
};

export type NcrHistoryEntry = {
  status: NcrStatus;
  actorId: string;
  timestamp: string;
  comment?: string;
};

export type NcrCorrectiveTask = {
  id: string;
  description: string;
  assigneeId: string;
  status: 'OPEN' | 'DONE';
};

export type ManagedNcr = Ncr & {
  priority: NcrPriority;
  closureProofs: string[];
  history: NcrHistoryEntry[];
  correctiveTasks: NcrCorrectiveTask[];
};

export class NcrService {
  private readonly entries = new Map<string, ManagedNcr>();

  createNCR(input: CreateNcrInput): ManagedNcr {
    this.assertCreatePayload(input);
    const id = `ncr-${this.entries.size + 1}`;
    const now = new Date().toISOString();

    const created: ManagedNcr = {
      id,
      projectId: input.projectId,
      creatorId: input.creatorId,
      title: input.title,
      description: input.description,
      status: 'OPEN',
      latitude: input.latitude as number,
      longitude: input.longitude as number,
      photos: [...input.photos],
      sync_status: false,
      localId: id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      priority: input.priority,
      closureProofs: [],
      correctiveTasks: [],
      history: [
        {
          status: 'OPEN',
          actorId: input.creatorId,
          timestamp: now,
          comment: 'Création NCR'
        }
      ]
    };

    this.entries.set(created.id, created);
    return created;
  }

  list(projectId?: string, status?: NcrStatus): ManagedNcr[] {
    return [...this.entries.values()].filter((entry) => {
      if (projectId && entry.projectId !== projectId) {
        return false;
      }
      if (status && entry.status !== status) {
        return false;
      }
      return true;
    });
  }

  getById(ncrId: string): ManagedNcr {
    const found = this.entries.get(ncrId);
    if (!found) {
      throw new Error('NCR introuvable');
    }
    return found;
  }

  updateNcr(ncrId: string, partial: { title?: string; description?: string; priority?: string }): ManagedNcr {
    const ncr = this.getById(ncrId);
    if (partial.title !== undefined) ncr.title = partial.title;
    if (partial.description !== undefined) ncr.description = partial.description;
    if (partial.priority !== undefined) ncr.priority = partial.priority as ManagedNcr['priority'];
    ncr.version += 1;
    ncr.history.push({
      timestamp: new Date().toISOString(),
      actorId: 'SYSTEM',
      status: ncr.status,
      comment: `Mise à jour: ${JSON.stringify(partial)}`
    });
    return ncr;
  }

  setStatus(ncrId: string, status: NcrStatus, actorId: string, comment?: string): ManagedNcr {
    const ncr = this.getById(ncrId);
    ncr.status = status;
    ncr.version += 1;
    ncr.updatedAt = new Date().toISOString();
    ncr.history.push({
      status,
      actorId,
      timestamp: ncr.updatedAt,
      comment
    });
    return ncr;
  }

  assignCorrectiveTask(ncrId: string, description: string, assigneeId: string): ManagedNcr {
    const ncr = this.getById(ncrId);
    ncr.correctiveTasks.push({
      id: `task-${ncr.correctiveTasks.length + 1}`,
      description,
      assigneeId,
      status: 'OPEN'
    });
    return this.setStatus(ncrId, 'IN_PROGRESS', assigneeId, 'Tâche corrective assignée');
  }

  addClosureProof(ncrId: string, photoUrl: string, actorId: string): ManagedNcr {
    const ncr = this.getById(ncrId);
    if (!photoUrl.trim()) {
      throw new Error('Preuve photo de clôture obligatoire');
    }
    ncr.closureProofs.push(photoUrl);
    ncr.version += 1;
    ncr.updatedAt = new Date().toISOString();
    ncr.history.push({
      status: ncr.status,
      actorId,
      timestamp: ncr.updatedAt,
      comment: 'Ajout preuve de levée de réserve'
    });
    return ncr;
  }

  closeNCR(ncrId: string, validatorId: string): ManagedNcr {
    const ncr = this.getById(ncrId);
    if (ncr.closureProofs.length === 0) {
      throw new Error('Impossible de clôturer sans preuve photo');
    }
    return this.setStatus(ncrId, 'CLOSED', validatorId, 'Validation finale et clôture');
  }

  private assertCreatePayload(input: CreateNcrInput): void {
    if (!input.title?.trim()) {
      throw new Error('Titre obligatoire');
    }
    if (!input.projectId?.trim()) {
      throw new Error('Projet obligatoire');
    }
    if (!input.creatorId?.trim()) {
      throw new Error('Créateur obligatoire');
    }
    if (!input.photos || input.photos.length === 0) {
      throw new Error('Photo obligatoire');
    }
    if (input.photos.some((photo) => !photo.trim())) {
      throw new Error('Photo invalide');
    }
    if (input.latitude === undefined || input.longitude === undefined) {
      throw new Error('Coordonnées GPS obligatoires');
    }
    if (input.latitude < -90 || input.latitude > 90) {
      throw new Error('Latitude invalide');
    }
    if (input.longitude < -180 || input.longitude > 180) {
      throw new Error('Longitude invalide');
    }
  }
}
