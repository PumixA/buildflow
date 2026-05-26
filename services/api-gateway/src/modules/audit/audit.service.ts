import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditService as DomainAuditService } from '../../../../../src/audit/audit.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuditService {
  private readonly domain = new DomainAuditService();
  constructor(private readonly databaseService: DatabaseService) {}

  append(eventType: string, actorId: string, payload: Record<string, unknown>) {
    const entry = this.domain.append(eventType, actorId, payload);
    void this.persistToDb(entry);
    return entry;
  }

  list() {
    return this.domain.list();
  }

  private async persistToDb(entry: ReturnType<DomainAuditService['append']>): Promise<void> {
    if (!this.databaseService.enabled) {
      return;
    }
    await this.databaseService.query(
      `
      INSERT INTO audit_logs (id, event_type, actor_id, payload, timestamp, previous_hash, hash)
      VALUES ($1,$2,$3,$4::jsonb,$5::timestamp,$6,$7)
      `,
      [
        randomUUID(),
        entry.eventType,
        entry.actorId,
        JSON.stringify(entry.payload),
        entry.timestamp,
        entry.previousHash,
        entry.hash
      ]
    );
  }
}
