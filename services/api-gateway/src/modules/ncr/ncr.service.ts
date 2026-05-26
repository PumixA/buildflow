import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NcrStatus } from '../../../../../libs/domain/src/models';
import {
  CreateNcrInput,
  ManagedNcr,
  NcrService as DomainNcrService
} from '../../../../../src/ncr/ncr.service';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { MessagingService } from '../messaging/messaging.service';
import { WormStorageAdapter } from '../storage/worm-storage.adapter';

@Injectable()
export class NcrService {
  private readonly domainService = new DomainNcrService();
  private readonly domainToDbId = new Map<string, string>();
  private readonly projectToDbId = new Map<string, string>();
  private readonly userToDbId = new Map<string, string>();

  constructor(
    private readonly wormStorage: WormStorageAdapter,
    private readonly auditService: AuditService,
    private readonly databaseService: DatabaseService,
    private readonly messagingService: MessagingService
  ) {}

  list(projectId?: string, status?: NcrStatus): ManagedNcr[] {
    return this.domainService.list(projectId, status);
  }

  detail(ncrId: string): ManagedNcr {
    return this.domainService.getById(ncrId);
  }

  create(input: CreateNcrInput): ManagedNcr {
    const created = this.domainService.createNCR(input);
    void this.persistToDatabase(created);
    void this.messagingService.publish({
      topic: 'ncr.created',
      timestamp: new Date().toISOString(),
      payload: {
        id: created.id,
        projectId: created.projectId,
        priority: created.priority
      }
    });
    this.auditService.append('ncr.created', input.creatorId, {
      ncrId: created.id,
      projectId: created.projectId
    });
    return created;
  }

  setStatus(ncrId: string, status: NcrStatus, actorId: string, comment?: string): ManagedNcr {
    const updated = this.domainService.setStatus(ncrId, status, actorId, comment);
    void this.persistToDatabase(updated);
    void this.messagingService.publish({
      topic: 'ncr.status.updated',
      timestamp: new Date().toISOString(),
      payload: {
        id: ncrId,
        status
      }
    });
    this.auditService.append('ncr.status.updated', actorId, {
      ncrId,
      status,
      comment
    });
    return updated;
  }

  assignTask(ncrId: string, description: string, assigneeId: string): ManagedNcr {
    const updated = this.domainService.assignCorrectiveTask(ncrId, description, assigneeId);
    void this.persistToDatabase(updated);
    this.auditService.append('ncr.task.assigned', assigneeId, {
      ncrId,
      description
    });
    return updated;
  }

  async addClosureProof(
    ncrId: string,
    actorId: string,
    fileName: string,
    contentType: string,
    payloadBase64: string
  ): Promise<ManagedNcr> {
    const evidence = await this.wormStorage.storeEvidence({
      fileName,
      contentType,
      payloadBase64
    });
    const updated = this.domainService.addClosureProof(ncrId, evidence.url, actorId);
    void this.persistToDatabase(updated);
    this.auditService.append('ncr.closure.proof', actorId, {
      ncrId,
      evidenceId: evidence.id,
      hash: evidence.hashSha256
    });
    return updated;
  }

  close(ncrId: string, validatorId: string): ManagedNcr {
    const closed = this.domainService.closeNCR(ncrId, validatorId);
    void this.persistToDatabase(closed);
    void this.messagingService.publish({
      topic: 'ncr.closed',
      timestamp: new Date().toISOString(),
      payload: {
        id: ncrId,
        validatorId
      }
    });
    this.auditService.append('ncr.closed', validatorId, {
      ncrId
    });
    return closed;
  }

  private async persistToDatabase(ncr: ManagedNcr): Promise<void> {
    if (!this.databaseService.enabled) {
      return;
    }

    const projectDbId = await this.ensureProject(ncr.projectId);
    const creatorDbId = await this.ensureUser(ncr.creatorId);
    const dbId = this.domainToDbId.get(ncr.id) ?? randomUUID();
    this.domainToDbId.set(ncr.id, dbId);

    await this.databaseService.query(
      `
      INSERT INTO ncr (id, project_id, creator_id, title, description, status, latitude, longitude, sync_status, local_id, version, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::uuid,$11,$12::timestamp,$13::timestamp)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        sync_status = EXCLUDED.sync_status,
        version = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at
      `,
      [
        dbId,
        projectDbId,
        creatorDbId,
        ncr.title,
        ncr.description,
        ncr.status,
        ncr.latitude,
        ncr.longitude,
        ncr.sync_status,
        randomUUID(),
        ncr.version,
        ncr.createdAt,
        ncr.updatedAt
      ]
    );
  }

  private async ensureProject(projectCode: string): Promise<string> {
    const fromMemory = this.projectToDbId.get(projectCode);
    if (fromMemory) {
      return fromMemory;
    }

    const found = await this.databaseService.query(
      'SELECT id FROM projects WHERE name = $1 LIMIT 1',
      [projectCode]
    );
    if (found.rowCount && found.rows[0]) {
      const row = found.rows[0] as { id: string };
      this.projectToDbId.set(projectCode, row.id);
      return row.id;
    }

    const projectId = randomUUID();
    await this.databaseService.query(
      'INSERT INTO projects (id, name, location_gps, status, created_at) VALUES ($1,$2,$3,$4,NOW())',
      [projectId, projectCode, 'unknown', 'ACTIVE']
    );
    this.projectToDbId.set(projectCode, projectId);
    return projectId;
  }

  private async ensureUser(userCode: string): Promise<string> {
    const fromMemory = this.userToDbId.get(userCode);
    if (fromMemory) {
      return fromMemory;
    }

    const pseudoEmail = `${userCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'user'}@buildflow.local`;
    const found = await this.databaseService.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [pseudoEmail]
    );
    if (found.rowCount && found.rows[0]) {
      const row = found.rows[0] as { id: string };
      this.userToDbId.set(userCode, row.id);
      return row.id;
    }

    const userId = randomUUID();
    await this.databaseService.query(
      `
      INSERT INTO users (id, name, email, role, hashed_password, mfa_enabled, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      `,
      [userId, userCode, pseudoEmail, 'CHEF_CHANTIER', 'hash-placeholder', true]
    );
    this.userToDbId.set(userCode, userId);
    return userId;
  }
}
