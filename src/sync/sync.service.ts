import { createHash } from 'crypto';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'CONFLICT';

export type SyncItem = {
  localId: string;
  version: number;
  payload: Record<string, unknown>;
  status: SyncStatus;
  updatedAt: string;
  message: string;
  contentHash: string;
};

export type PushInput = {
  localId: string;
  version: number;
  payload: Record<string, unknown>;
};

export type ResolveInput = {
  localId: string;
  version: number;
  payload: Record<string, unknown>;
  strategy: 'LWW' | 'MANUAL';
};

export function computeContentHash(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash('sha256').update(canonical).digest('hex');
}

export class SyncService {
  private readonly cloud = new Map<string, { version: number; payload: Record<string, unknown>; contentHash: string }>();
  private readonly local = new Map<string, SyncItem>();
  private readonly syncedHashes = new Set<string>();

  queueLocal(input: PushInput): SyncItem {
    const hash = computeContentHash(input.payload);
    const item: SyncItem = {
      localId: input.localId,
      version: input.version,
      payload: input.payload,
      status: 'PENDING',
      updatedAt: new Date().toISOString(),
      message: 'En attente de synchronisation',
      contentHash: hash
    };
    this.local.set(input.localId, item);
    return item;
  }

  isDuplicate(localId: string, contentHash: string): boolean {
    const existing = this.cloud.get(localId);
    if (existing && existing.contentHash === contentHash) return true;
    return this.syncedHashes.has(`${localId}:${contentHash}`);
  }

  push(input: PushInput): {
    sync_status: boolean;
    httpCode: 200 | 201 | 409;
    item: SyncItem;
    notification: string;
    contentHash: string;
  } {
    const hash = computeContentHash(input.payload);
    const queued = this.queueLocal(input);
    const current = this.cloud.get(input.localId);

    // Idempotence: already synced with exact same content
    if (this.isDuplicate(input.localId, hash)) {
      const alreadySynced = this.markSynced(queued.localId, 'Déjà synchronisé (idempotent)');
      return {
        sync_status: true,
        httpCode: 200,
        item: alreadySynced,
        notification: 'Déjà synchronisé',
        contentHash: hash
      };
    }

    if (!current) {
      this.cloud.set(input.localId, { version: input.version, payload: input.payload, contentHash: hash });
      this.syncedHashes.add(`${input.localId}:${hash}`);
      const synced = this.markSynced(queued.localId, 'Synchronisation terminée');
      return {
        sync_status: true,
        httpCode: 201,
        item: synced,
        notification: 'Synchronisation terminée',
        contentHash: hash
      };
    }

    if (input.version < current.version) {
      const conflict = this.markConflict(queued.localId, 'Conflit de version (409)');
      return {
        sync_status: false,
        httpCode: 409,
        item: conflict,
        notification: 'Conflit détecté',
        contentHash: hash
      };
    }

    this.cloud.set(input.localId, { version: input.version, payload: input.payload, contentHash: hash });
    this.syncedHashes.add(`${input.localId}:${hash}`);
    const synced = this.markSynced(queued.localId, 'Synchronisation terminée');
    return {
      sync_status: true,
      httpCode: 200,
      item: synced,
      notification: 'Synchronisation terminée',
      contentHash: hash
    };
  }

  resolveConflict(input: ResolveInput): {
    sync_status: boolean;
    httpCode: 200;
    item: SyncItem;
    strategy: 'LWW' | 'MANUAL';
    contentHash: string;
  } {
    const hash = computeContentHash(input.payload);
    this.cloud.set(input.localId, { version: input.version, payload: input.payload, contentHash: hash });
    this.syncedHashes.add(`${input.localId}:${hash}`);
    const synced = this.markSynced(
      input.localId,
      input.strategy === 'LWW' ? 'Conflit résolu automatiquement (LWW)' : 'Conflit résolu manuellement'
    );
    return {
      sync_status: true,
      httpCode: 200,
      item: synced,
      strategy: input.strategy,
      contentHash: hash
    };
  }

  listQueue(): SyncItem[] {
    return [...this.local.values()].sort((a, b) => a.localId.localeCompare(b.localId));
  }

  status(): { mode: string; pending: number; synced: number; conflicts: number } {
    const queue = this.listQueue();
    return {
      mode: 'offline-first',
      pending: queue.filter((entry) => entry.status === 'PENDING').length,
      synced: queue.filter((entry) => entry.status === 'SYNCED').length,
      conflicts: queue.filter((entry) => entry.status === 'CONFLICT').length
    };
  }

  private markSynced(localId: string, message: string): SyncItem {
    const current = this.local.get(localId);
    if (!current) {
      throw new Error('Enregistrement local introuvable');
    }
    const updated: SyncItem = {
      ...current,
      status: 'SYNCED',
      updatedAt: new Date().toISOString(),
      message
    };
    this.local.set(localId, updated);
    return updated;
  }

  private markConflict(localId: string, message: string): SyncItem {
    const current = this.local.get(localId);
    if (!current) {
      throw new Error('Enregistrement local introuvable');
    }
    const updated: SyncItem = {
      ...current,
      status: 'CONFLICT',
      updatedAt: new Date().toISOString(),
      message
    };
    this.local.set(localId, updated);
    return updated;
  }
}
