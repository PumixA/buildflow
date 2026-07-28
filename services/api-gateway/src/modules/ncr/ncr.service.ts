import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(NcrService.name);
  private readonly domainService = new DomainNcrService();
  private readonly domainToDbId = new Map<string, string>();
  private readonly projectToDbId = new Map<string, string>();
  private readonly userToDbId = new Map<string, string>();

  /**
   * Lance une opération asynchrone secondaire (persistance, publication d'événement)
   * sans bloquer la réponse HTTP, mais en capturant les erreurs.
   *
   * Sans ce `.catch()`, un rejet non géré termine le process Node (>= 15).
   */
  private fireAndForget(operation: Promise<unknown>, context: string): void {
    void operation.catch((err) => {
      this.logger.error(`${context}: ${(err as Error).message}`, (err as Error).stack);
    });
  }

  constructor(
    private readonly wormStorage: WormStorageAdapter,
    private readonly auditService: AuditService,
    private readonly databaseService: DatabaseService,
    private readonly messagingService: MessagingService
  ) {}

  async list(projectId?: string, status?: NcrStatus): Promise<ManagedNcr[]> {
    const fromMemory = this.domainService.list(projectId, status);
    if (fromMemory.length > 0) return fromMemory;

    // Fallback: load from DB into memory
    if (!this.databaseService.enabled) { console.warn('[NcrService] DB not enabled, returning empty'); return []; }
    try {
      console.log('[NcrService] Loading NCRs from DB...');
      const result = await this.databaseService.query(
        `SELECT id, project_id, creator_id, title, description, status, priority,
                latitude, longitude, sync_status, local_id, version, created_at, updated_at
         FROM ncr ORDER BY created_at DESC LIMIT 100`
      );
      console.log('[NcrService] DB returned', result.rows.length, 'rows');
      return (result.rows as Array<Record<string, unknown>>).map((row) => ({
        id: String(row['id']).substring(0, 8),
        projectId: String(row['project_id'] ?? ''),
        creatorId: String(row['creator_id'] ?? ''),
        title: String(row['title'] ?? ''),
        description: String(row['description'] ?? ''),
        status: String(row['status'] ?? 'OPEN') as NcrStatus,
        priority: (String(row['priority'] ?? 'MEDIUM')) as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        latitude: Number(row['latitude'] ?? 0),
        longitude: Number(row['longitude'] ?? 0),
        photos: [],
        sync_status: Boolean(row['sync_status']),
        localId: String(row['local_id'] ?? ''),
        version: Number(row['version'] ?? 1),
        createdAt: String(row['created_at'] ?? new Date().toISOString()),
        updatedAt: String(row['updated_at'] ?? new Date().toISOString()),
        closureProofs: [],
        correctiveTasks: [],
        history: []
      })) as ManagedNcr[];
    } catch (err) {
      console.error('[NcrService] DB query failed:', (err as Error).message);
      return [];
    }
  }

  detail(ncrId: string): ManagedNcr {
    return this.domainService.getById(ncrId);
  }

  update(ncrId: string, partial: { title?: string; description?: string; priority?: string }): ManagedNcr {
    const updated = this.domainService.updateNcr(ncrId, partial);
    this.fireAndForget(
      this.messagingService.publish({
        topic: 'ncr.updated',
        timestamp: new Date().toISOString(),
        payload: { id: ncrId, ...partial }
      }),
      `Publication ncr.updated échouée pour ${ncrId}`
    );
    this.auditService.append('ncr.updated', 'SYSTEM', { ncrId, ...partial });
    return updated;
  }

  create(input: CreateNcrInput): ManagedNcr {
    const created = this.domainService.createNCR(input);
    this.fireAndForget(
      this.persistToDatabase(created),
      `Persistance de la NCR ${created.id} échouée`
    );
    this.fireAndForget(
      this.messagingService.publish({
        topic: 'ncr.created',
        timestamp: new Date().toISOString(),
        payload: {
          id: created.id,
          projectId: created.projectId,
          status: created.status
        }
      }),
      `Publication ncr.created échouée pour ${created.id}`
    );
    this.auditService.append('ncr.created', input.creatorId, {
      ncrId: created.id,
      projectId: created.projectId
    });
    return created;
  }

  setStatus(ncrId: string, status: NcrStatus, actorId: string, comment?: string): ManagedNcr {
    const updated = this.domainService.setStatus(ncrId, status, actorId, comment);
    this.fireAndForget(
      this.persistStatusToDatabase(ncrId, status),
      `Mise à jour du statut de ${ncrId} en base échouée`
    );
    this.fireAndForget(
      this.messagingService.publish({
        topic: 'ncr.status.updated',
        timestamp: new Date().toISOString(),
        payload: { id: ncrId, status }
      }),
      `Publication ncr.status.updated échouée pour ${ncrId}`
    );
    this.auditService.append('ncr.status.updated', actorId, { ncrId, status, comment });
    return updated;
  }

  assignTask(ncrId: string, description: string, assigneeId: string): ManagedNcr {
    const updated = this.domainService.assignCorrectiveTask(ncrId, description, assigneeId);
    this.auditService.append('ncr.task.assigned', assigneeId, { ncrId, description });
    return updated;
  }

  async addClosureProof(ncrId: string, actorId: string, fileName: string, contentType: string, payloadBase64: string): Promise<ManagedNcr> {
    const upload = await this.wormStorage.storeEvidence({ fileName, contentType, payloadBase64 });
    const updated = this.domainService.addClosureProof(ncrId, upload.url, actorId);
    this.auditService.append('ncr.closure.proof.added', actorId, { ncrId, fileName });
    return updated;
  }

  close(ncrId: string, validatorId: string): ManagedNcr {
    const updated = this.domainService.closeNCR(ncrId, validatorId);
    this.fireAndForget(
      this.messagingService.publish({
        topic: 'ncr.closed',
        timestamp: new Date().toISOString(),
        payload: { id: ncrId, validatorId }
      }),
      `Publication ncr.closed échouée pour ${ncrId}`
    );
    this.auditService.append('ncr.closed', validatorId, { ncrId });
    return updated;
  }

  private async persistToDatabase(ncr: ManagedNcr): Promise<void> {
    if (!this.databaseService.enabled) return;
    const dbId = this.domainToDbId.get(ncr.id) ?? randomUUID();
    this.domainToDbId.set(ncr.id, dbId);
    const projectDbId = await this.ensureProject(ncr.projectId);
    const creatorDbId = await this.ensureUser(ncr.creatorId);
    await this.databaseService.query(
      `INSERT INTO ncr (id, project_id, creator_id, title, description, status, priority,
        latitude, longitude, sync_status, local_id, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
       ON CONFLICT (id) DO UPDATE SET status=$6, priority=$7, updated_at=NOW()`,
      [dbId, projectDbId, creatorDbId, ncr.title, ncr.description, ncr.status, ncr.priority,
       ncr.latitude, ncr.longitude, ncr.sync_status, ncr.localId, ncr.version]
    );
  }

  private async persistStatusToDatabase(ncrId: string, status: string): Promise<void> {
    if (!this.databaseService.enabled) return;
    const dbId = this.domainToDbId.get(ncrId);
    if (!dbId) return;
    await this.databaseService.query(
      `UPDATE ncr SET status=$1, updated_at=NOW() WHERE id=$2`, [status, dbId]
    );
  }

  private async ensureProject(projectCode: string): Promise<string> {
    const fromMemory = this.projectToDbId.get(projectCode);
    if (fromMemory) return fromMemory;

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
    if (fromMemory) return fromMemory;

    const email = `${userCode.toLowerCase()}@buildflow.io`;
    const found = await this.databaseService.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    if (found.rowCount && found.rows[0]) {
      const row = found.rows[0] as { id: string };
      this.userToDbId.set(userCode, row.id);
      return row.id;
    }

    // Enregistrement technique dérivé d'un code auteur, pas un compte : `hashed_password`
    // est NOT NULL en base et ne doit correspondre à aucun hash vérifiable.
    const userId = randomUUID();
    await this.databaseService.query(
      `INSERT INTO users (id, name, email, role, hashed_password, mfa_enabled, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [userId, userCode, email, 'CHEF_CHANTIER', 'hash-placeholder', true]
    );
    this.userToDbId.set(userCode, userId);
    return userId;
  }
}
