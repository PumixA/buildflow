import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

export type AuditEntry = {
  id: string;
  eventType: string;
  actorId: string;
  payload: Record<string, unknown>;
  timestamp: string;
  previousHash: string;
  hash: string;
};

export class AuditService {
  private readonly entries: AuditEntry[] = [];
  private readonly filePath = process.env.AUDIT_LOG_FILE ?? 'data/audit-log.jsonl';

  constructor() {
    this.loadFromDisk();
  }

  append(eventType: string, actorId: string, payload: Record<string, unknown>): AuditEntry {
    const id = `audit-${this.entries.length + 1}`;
    const timestamp = new Date().toISOString();
    const previousEntry =
      this.entries.length > 0 ? this.entries[this.entries.length - 1] : undefined;
    const previousHash = previousEntry?.hash ?? 'GENESIS';
    const raw = JSON.stringify({ id, eventType, actorId, payload, timestamp, previousHash });
    const hash = createHash('sha256').update(raw).digest('hex');

    const entry: AuditEntry = {
      id,
      eventType,
      actorId,
      payload,
      timestamp,
      previousHash,
      hash
    };

    this.entries.push(entry);
    this.persistEntry(entry);
    return entry;
  }

  list(): AuditEntry[] {
    return [...this.entries];
  }

  verifyChain(): { valid: boolean; errors: Array<{ index: number; id: string; expected: string; actual: string }> } {
    const errors: Array<{ index: number; id: string; expected: string; actual: string }> = [];

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const previousHash = i === 0 ? 'GENESIS' : this.entries[i - 1].hash;

      if (entry.previousHash !== previousHash) {
        errors.push({
          index: i,
          id: entry.id,
          expected: previousHash,
          actual: entry.previousHash
        });
      }

      const raw = JSON.stringify({
        id: entry.id,
        eventType: entry.eventType,
        actorId: entry.actorId,
        payload: entry.payload,
        timestamp: entry.timestamp,
        previousHash: entry.previousHash
      });
      const recomputed = createHash('sha256').update(raw).digest('hex');

      if (recomputed !== entry.hash) {
        errors.push({
          index: i,
          id: entry.id,
          expected: recomputed,
          actual: entry.hash
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private loadFromDisk(): void {
    if (!existsSync(this.filePath)) {
      return;
    }

    const raw = readFileSync(this.filePath, 'utf-8');
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as AuditEntry;
        this.entries.push(entry);
      } catch {
        // Ignore malformed lines to keep service available.
      }
    }
  }

  private persistEntry(entry: AuditEntry): void {
    const folder = dirname(this.filePath);
    if (!existsSync(folder)) {
      mkdirSync(folder, { recursive: true });
    }

    const line = `${JSON.stringify(entry)}\n`;
    writeFileSync(this.filePath, line, { flag: 'a' });
  }
}
