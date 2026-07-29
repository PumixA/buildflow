import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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

/**
 * Projection commune aux lectures NCR.
 *
 * `project_name` est résolu par jointure : la colonne `project_id` contient un
 * UUID technique, que l'interface affichait tel quel à la place du code chantier.
 * Le COALESCE couvre les NCR dont le projet aurait été supprimé.
 */
const NCR_SELECT = `
  SELECT n.id, n.creator_id, n.title, n.description, n.status, n.priority,
         n.latitude, n.longitude, n.sync_status, n.local_id, n.version,
         n.created_at, n.updated_at,
         COALESCE(p.name, n.project_id::text) AS project_name
  FROM ncr n
  LEFT JOIN projects p ON p.id = n.project_id
`;

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

  /**
   * La base fait autorité dès qu'elle est disponible.
   *
   * La mémoire était consultée en premier et la base seulement si elle était
   * vide : après un redémarrage la liste affichait bien les NCR persistées,
   * mais dès la première création elle ne montrait plus que celle-ci, masquant
   * toutes les autres.
   */
  async list(projectId?: string, status?: NcrStatus): Promise<ManagedNcr[]> {
    if (!this.databaseService.enabled) {
      return this.domainService.list(projectId, status);
    }

    try {
      const values: unknown[] = [];
      const filters: string[] = [];
      if (projectId) {
        values.push(projectId);
        filters.push(`p.name = $${values.length}`);
      }
      if (status) {
        values.push(status);
        filters.push(`n.status = $${values.length}`);
      }
      const where = filters.length > 0 ? ` WHERE ${filters.join(' AND ')}` : '';

      const result = await this.databaseService.query(
        `${NCR_SELECT}${where} ORDER BY n.created_at DESC LIMIT 100`,
        values
      );
      return (result.rows as Array<Record<string, unknown>>).map((row) => this.toManagedNcr(row));
    } catch (err) {
      this.logger.error(`Lecture des NCR en base échouée : ${(err as Error).message}`);
      // Mieux vaut servir la mémoire du process qu'une liste vide.
      return this.domainService.list(projectId, status);
    }
  }

  async detail(ncrId: string): Promise<ManagedNcr> {
    try {
      return this.domainService.getById(ncrId);
    } catch {
      // Absente de la mémoire : on tente la base avant de conclure.
    }

    if (this.databaseService.enabled) {
      // `id` est un UUID en base, `local_id` l'identifiant applicatif ("ncr-1") :
      // la liste peut renvoyer l'un ou l'autre selon qu'elle vienne de la mémoire
      // ou de la base, donc on accepte les deux.
      const result = await this.databaseService.query(
        `${NCR_SELECT} WHERE n.id::text = $1 OR n.local_id = $1 LIMIT 1`,
        [ncrId]
      );
      const row = result.rows[0];
      if (row) {
        return this.toManagedNcr(row as Record<string, unknown>);
      }
    }

    throw new NotFoundException(`NCR introuvable : ${ncrId}`);
  }

  private toManagedNcr(row: Record<string, unknown>): ManagedNcr {
    return {
      id: String(row['id']),
      projectId: String(row['project_name'] ?? ''),
      creatorId: String(row['creator_id'] ?? ''),
      title: String(row['title'] ?? ''),
      description: String(row['description'] ?? ''),
      status: String(row['status'] ?? 'OPEN') as NcrStatus,
      priority: String(row['priority'] ?? 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
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
    } as ManagedNcr;
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

    // `projects.name` n'a pas de contrainte d'unicité : impossible d'écrire un upsert
    // atomique comme pour `users`. Deux créations simultanées d'un même chantier
    // produisent donc deux lignes. À traiter avec l'index unique sur projects(name),
    // dans le lot d'alignement du schéma.
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

    // Enregistrement technique dérivé d'un code auteur, pas un compte : `hashed_password`
    // est NOT NULL en base et ne doit correspondre à aucun hash vérifiable.
    //
    // Upsert atomique plutôt que SELECT-puis-INSERT : deux créations simultanées
    // passeraient toutes deux le SELECT et la seconde violerait `users_email_key`.
    // `DO UPDATE` (et non `DO NOTHING`) garantit que RETURNING renvoie toujours la ligne.
    const email = `${userCode.toLowerCase()}@buildflow.io`;
    const result = await this.databaseService.query(
      `INSERT INTO users (id, name, email, role, hashed_password, mfa_enabled, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [randomUUID(), userCode, email, 'CHEF_CHANTIER', 'hash-placeholder', true]
    );
    const userId = (result.rows[0] as { id: string }).id;
    this.userToDbId.set(userCode, userId);
    return userId;
  }
}
