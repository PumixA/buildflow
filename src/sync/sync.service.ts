export type SyncStatus = 'PENDING' | 'SYNCED' | 'CONFLICT';

export type SyncItem = {
  localId: string;
  version: number;
  payload: Record<string, unknown>;
  status: SyncStatus;
  updatedAt: string;
  message: string;
};

type PushInput = {
  localId: string;
  version: number;
  payload: Record<string, unknown>;
};

type ResolveInput = {
  localId: string;
  version: number;
  payload: Record<string, unknown>;
  strategy: 'LWW' | 'MANUAL';
};

export class SyncService {
  private readonly cloud = new Map<string, { version: number; payload: Record<string, unknown> }>();
  private readonly local = new Map<string, SyncItem>();

  queueLocal(input: PushInput): SyncItem {
    const item: SyncItem = {
      localId: input.localId,
      version: input.version,
      payload: input.payload,
      status: 'PENDING',
      updatedAt: new Date().toISOString(),
      message: 'En attente de synchronisation'
    };
    this.local.set(input.localId, item);
    return item;
  }

  push(input: PushInput): {
    sync_status: boolean;
    httpCode: 200 | 201 | 409;
    item: SyncItem;
    notification: string;
  } {
    const queued = this.queueLocal(input);
    const current = this.cloud.get(input.localId);

    if (!current) {
      this.cloud.set(input.localId, { version: input.version, payload: input.payload });
      const synced = this.markSynced(queued.localId, 'Synchronisation terminée');
      return {
        sync_status: true,
        httpCode: 201,
        item: synced,
        notification: 'Synchronisation terminée'
      };
    }

    if (input.version < current.version) {
      const conflict = this.markConflict(queued.localId, 'Conflit de version (409)');
      return {
        sync_status: false,
        httpCode: 409,
        item: conflict,
        notification: 'Conflit détecté'
      };
    }

    this.cloud.set(input.localId, { version: input.version, payload: input.payload });
    const synced = this.markSynced(queued.localId, 'Synchronisation terminée');
    return {
      sync_status: true,
      httpCode: 200,
      item: synced,
      notification: 'Synchronisation terminée'
    };
  }

  resolveConflict(input: ResolveInput): {
    sync_status: boolean;
    httpCode: 200;
    item: SyncItem;
    strategy: 'LWW' | 'MANUAL';
  } {
    this.cloud.set(input.localId, { version: input.version, payload: input.payload });
    const synced = this.markSynced(
      input.localId,
      input.strategy === 'LWW' ? 'Conflit résolu automatiquement (LWW)' : 'Conflit résolu manuellement'
    );
    return {
      sync_status: true,
      httpCode: 200,
      item: synced,
      strategy: input.strategy
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
