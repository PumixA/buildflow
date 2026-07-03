import { Injectable, Logger } from '@nestjs/common';
import { SyncService as DomainSyncService } from '../../../../../src/sync/sync.service';
import { DatabaseService } from '../database/database.service';
import { MessagingService } from '../messaging/messaging.service';

type SyncRecord = {
  localId: string;
  version: number;
  payload: Record<string, unknown>;
};

type ResolveRecord = {
  localId: string;
  version: number;
  payload: Record<string, unknown>;
  strategy: 'LWW' | 'MANUAL';
};

@Injectable()
export class SyncService {
  private readonly domain = new DomainSyncService();
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly messagingService: MessagingService,
    private readonly db: DatabaseService
  ) {}

  async status() {
    if (!this.db.enabled) return this.domain.status();

    const result = await this.db.query(
      `SELECT status, COUNT(*)::int AS count FROM sync_queue GROUP BY status`
    );
    const rows = result.rows as Array<{ status: string; count: number }>;
    return {
      mode: 'offline-first',
      pending: rows.find((r) => r.status === 'PENDING')?.count ?? 0,
      synced: rows.find((r) => r.status === 'SYNCED')?.count ?? 0,
      conflicts: rows.find((r) => r.status === 'CONFLICT')?.count ?? 0
    };
  }

  async queue() {
    if (!this.db.enabled) return this.domain.listQueue();

    const result = await this.db.query(
      `SELECT local_id, version, payload, status, content_hash, updated_at, error_message
       FROM sync_queue ORDER BY created_at DESC LIMIT 100`
    );
    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      localId: row['local_id'],
      version: row['version'],
      payload: row['payload'],
      status: row['status'],
      contentHash: row['content_hash'],
      updatedAt: row['updated_at'],
      message: (row['error_message'] as string) || ''
    }));
  }

  async push(input: SyncRecord) {
    const result = this.domain.push(input);

    if (this.db.enabled) {
      try {
        await this.db.query(
          `INSERT INTO sync_queue (local_id, version, payload, content_hash, status, updated_at)
           VALUES ($1, $2, $3::jsonb, $4, $5, NOW())
           ON CONFLICT (local_id) DO UPDATE SET
             version = EXCLUDED.version,
             payload = EXCLUDED.payload,
             content_hash = EXCLUDED.content_hash,
             status = EXCLUDED.status,
             updated_at = NOW()`,
          [input.localId, input.version, JSON.stringify(input.payload), result.contentHash, result.item.status]
        );
      } catch (err) {
        this.logger.error(`Failed to persist sync push for ${input.localId}:`, err);
      }
    }

    void this.messagingService.publish({
      topic: result.httpCode === 409 ? 'sync.conflict' : 'sync.completed',
      timestamp: new Date().toISOString(),
      payload: { localId: input.localId, httpCode: result.httpCode, contentHash: result.contentHash }
    });

    return result;
  }

  async resolve(input: ResolveRecord) {
    const result = this.domain.resolveConflict(input);

    if (this.db.enabled) {
      try {
        await this.db.query(
          `UPDATE sync_queue SET status = 'SYNCED', version = $2, updated_at = NOW()
           WHERE local_id = $1`,
          [input.localId, input.version]
        );
      } catch (err) {
        this.logger.error(`Failed to persist sync resolve for ${input.localId}:`, err);
      }
    }

    void this.messagingService.publish({
      topic: 'sync.completed',
      timestamp: new Date().toISOString(),
      payload: { localId: input.localId, strategy: input.strategy }
    });

    return result;
  }

  async retryFailed(limit = 10): Promise<number> {
    if (!this.db.enabled) return 0;

    const result = await this.db.query(
      `SELECT local_id, version, payload FROM sync_queue
       WHERE status = 'PENDING' AND error_message IS NOT NULL
       LIMIT $1`,
      [limit]
    );

    let retried = 0;
    for (const row of result.rows as Array<{ local_id: string; version: number; payload: Record<string, unknown> }>) {
      try {
        await this.push({ localId: row.local_id, version: row.version, payload: row.payload });
        retried++;
      } catch (err) {
        this.logger.warn(`Retry failed for ${row.local_id}:`, err);
      }
    }

    if (retried > 0) {
      this.logger.log(`Retried ${retried} failed sync items`);
    }
    return retried;
  }
}
